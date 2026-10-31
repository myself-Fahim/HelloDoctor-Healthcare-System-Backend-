import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import app from "../../app";
import config from "../config";

export const seedSuperAdmin = async () => {
	try {
		const isAlreadyExist = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isAlreadyExist) {
			console.log("Super admin already exist");
			return;
		}

		const name = "Super Admin 1";
		const email = "superadmin@gmail.com";
		const password = "password123";
        const role = Role.SUPER_ADMIN
		const hashPassword = await bcrypt.hash(password, 8);

		const result = await prisma.user.create({
			data: {
				name,
				email,
                role,
				password:hashPassword,
				emailVerified: true,
				needPasswordChange: false,
			},
		});
        console.log(result);
	} catch (error) {
        console.log(error);
        throw error
    }
};

export const seedAdmin = async () => {
	try {
		const isAlreadyExist = await prisma.user.findFirst({
			where: {
				role: Role.ADMIN,
			},
		});

		if (isAlreadyExist) {
			console.log("Admin already exist");
			return;
		}

		const name = " Admin 1";
		const email = "admin@gmail.com";
		const password = "password123";
        const role = Role.ADMIN
		const hashPassword = await bcrypt.hash(password, 8);

		const result = await prisma.user.create({
			data: {
				name,
				email,
                role,
				password:hashPassword,
				emailVerified: true,
				needPasswordChange: false,
			},
		});
        console.log(result);
	} catch (error) {
        console.log(error);
        throw error
    }
};

export const seedDoctor = async () => {
	try {
		const isAlreadyExist = await prisma.user.findFirst({
			where: {
				role: Role.DOCTOR,
			},
		});

		if (isAlreadyExist) {
			console.log("Doctor already exist");
			return;
		}

		const name = "Doctor 1";
		const email = "doctor@gmail.com";
		const password = "password123";
        const role = Role.DOCTOR
		const hashPassword = await bcrypt.hash(password, 8);

		const result = await prisma.user.create({
			data: {
				name,
				email,
                role,
				password:hashPassword,
				emailVerified: true,
				needPasswordChange: false,
				doctor:{
					create:{
						name:"Md Tarek",
						specialization:"Neurology",
						qualification:"MBBS and FCPS-Part1",
						licenseNumber:"BMDC-2101000310"
					}
				}
			},
		});
        console.log(result);
	} catch (error) {
        console.log(error);
        throw error
    }
};


const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");
        await seedSuperAdmin()
        await seedAdmin()
        await seedDoctor()
		app.listen(config.port, () => {
			console.log(`Server is running on port ${config.port}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();

