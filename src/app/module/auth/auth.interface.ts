import { Role } from "../../../generated/prisma/browser";

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
}

export interface IRequestUser {
	userId: string;
	email: string;
	name: string;
	role: Role;
}

export interface IGooglePayload  {
	idToken : string
}

export interface IForgotPassword {
	email : string
}

export interface IResetPassword {
	email :string,
	newPassword:string,
	otp:string
}