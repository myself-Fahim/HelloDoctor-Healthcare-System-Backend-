import bcrypt from "bcryptjs";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import {
	IForgotPassword,
	IGooglePayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPassword,
} from "./auth.interface";
import { OAuth2Client } from "google-auth-library";
import { googleClient } from "../../lib/googleClient";

import crypto from "crypto";
import { redisCLient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs"
import path from "path";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.PATIENT,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			patient: {
				create: { name, email },
			},
		},
		omit: { password: true },
		include: { patient: true },
	});

	const { patient, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.authProvider === AuthProvider.GOOGLE) {
		throw new Error("Try again with google signing");
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: IGooglePayload) => {
	let googleTokenPayload = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});
		googleTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google Login Error", error);
		throw new Error("Google login failed");
	}

	if (!googleTokenPayload) {
		throw new Error("Inavalid or expired google token");
	}
	if (!googleTokenPayload.name) {
		throw new Error("No user name found");
	}
	if (!googleTokenPayload.email) {
		throw new Error("No email found");
	}

	const isPatientExistWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleTokenPayload.email,
			role: Role.PATIENT,
			googleId: googleTokenPayload.sub,
		},
	});

	let user = isPatientExistWithGoogleAuth;

	if (!isPatientExistWithGoogleAuth) {
		const isPatientExistWithCredentials = await prisma.user.findUnique({
			where: {
				email: googleTokenPayload.email,
				authProvider: AuthProvider.CREDENTIAL,
				role: Role.PATIENT,
			},
		});

		if (isPatientExistWithCredentials) {
			if (
				isPatientExistWithCredentials.isDeleted ||
				isPatientExistWithCredentials.status === UserStatus.DELETED
			) {
				throw new Error("User is deleted");
			}

			if (isPatientExistWithCredentials.status === UserStatus.BLOCKED) {
				throw new Error("User is blocked");
			}

			user = await prisma.user.update({
				where: {
					id: isPatientExistWithCredentials.id,
				},
				data: {
					googleId: googleTokenPayload.sub,
					emailVerified: true,
				},
			});
		} else {
			user = await prisma.user.create({
				data: {
					name: googleTokenPayload.name,
					email: googleTokenPayload.email,
					role: Role.PATIENT,
					authProvider: AuthProvider.GOOGLE,
					googleId: googleTokenPayload.sub,
					emailVerified: true,
					patient: {
						create: {
							name: googleTokenPayload.name,
							email: googleTokenPayload.email,
						},
					},
				},
			});
		}
	}

	if (!user) {
		throw new Error("User not found");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	const jwtPayload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPassword) => {
	const { email } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
			isDeleted: false,
		},
	});

	if (!isUserExists) {
		throw new Error("User not exist");
	}

	if (isUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (!isUserExists.emailVerified) {
		throw new Error("User email is not verified");
	}

	if (isUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error("User have to login with google");
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-otp:${isUserExists.email}`;
	await redisCLient.set(key, otp, {
		expiration: {
			type: "EX",
			value: 5 * 60,
		},
	});

	const templatePath = path.join(process.cwd(),"/src/app/templates/forgot-passsword.ejs")
	const html = await ejs.renderFile(templatePath,{
		otp,
		userName:isUserExists.name,
		expirationTime:5
	})


	await transporter.sendMail({
		from: config.smtp_user,
		to: isUserExists.email,
		subject: "Forgot Password",
		html,
	});
};

const resetPassword = async (payload: IResetPassword) => {
	const { email, newPassword, otp } = payload;

	const isUserExists = await prisma.user.findUnique({
		where: {
			email,
			isDeleted: false,
		},
	});

	if (!isUserExists) {
		throw new Error("User does not exist");
	}

	if (isUserExists.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (!isUserExists.emailVerified) {
		throw new Error("User email is not verified");
	}

	if (isUserExists.authProvider !== AuthProvider.CREDENTIAL) {
		throw new Error("User have to login with google");
	}

	const key = `forgot-password-otp:${email}`;
	const getUserOtp = await redisCLient.get(key);

	if (!getUserOtp) {
		throw new Error("Invalid OTP");
	}

	if (getUserOtp !== otp) {
		throw new Error("OTP doesn't matched");
	}
	const hashPassword = await bcrypt.hash(newPassword, 8);

	await prisma.user.update({
		where: {
			email,
		},
		data: {
			password: hashPassword,
		},
	});

	await redisCLient.del([key]);

	const templatePath = path.join(process.cwd(),"src/app/templates/reset-password.ejs")
	const html = await ejs.renderFile(templatePath,{
		userName : isUserExists.name
	})

	await transporter.sendMail({
		from:config.smtp_user,
		to:isUserExists.email,
		subject:"Change Password",
        html
	})
};

export const AuthService = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
