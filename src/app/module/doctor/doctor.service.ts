import bcrypt from "bcryptjs";
import { Role } from "../../../generated/prisma/enums";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";
import { UploadApiResponse } from "cloudinary";

const applyAsDoctor = async (payloadBody: any, resume: Express.Multer.File, additionalFiles: Express.Multer.File[]) => {

    const payload = JSON.parse(payloadBody.payload)

    const isUserExist = await prisma.user.findUnique({
        where: {
            email: payload.user.email
        }
    })

    if (isUserExist) {
        throw new Error("User already exist")
    }

    if (!resume) {
        throw new Error("No resume file found")
    }
    if (!additionalFiles || additionalFiles.length === 0) {
        throw new Error("No additional file found")
    }


    const resumeResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { resource_type: 'auto' },

            (error, result) => {
                if (error) {
                    console.log(error);
                    return reject(error)
                }

                if (!result) {
                    return reject(new Error('Failed to upload in cloudinary'))
                }

                resolve(result)
            }).end(resume?.buffer)
    })


    const additionalFilesResult = await Promise.all(additionalFiles.map(async (file) => {
        return await new Promise<UploadApiResponse>((resolve, reject) => {

            cloudinary.uploader.upload_stream(
                { resource_type: 'auto' },
                (error, result) => {
                    if (error) {
                        console.log(error);
                        return reject(error)
                    }

                    if (!result) {
                        return reject(new Error("Failed to upload in cloudinary"))
                    }

                    resolve(result)
                }
            ).end(file?.buffer)


        })
    }))


    const passsword = crypto.randomBytes(12).toString("base64url");
    const hashedPassword = await bcrypt.hash(passsword, 8)

    const createDoctorResult = await prisma.user.create({
        data: {
            name: payload.user.name,
            email: payload.user.email,
            role: Role.DOCTOR,
            needPasswordChange: true,
            password: hashedPassword,
            doctor: {
                create: {
                    name: payload.user.name,
                    licenseNumber: payload.doctor.licenseNumber,
                    specialization: payload.doctor.specialization,
                    qualification: payload.doctor.qualification,
                    resume: resumeResult.secure_url,
                    resumePublicId: resumeResult.public_id,
                    additionalFiles: additionalFilesResult.map((file) => {
                        return {
                            secure_url: file.secure_url,
                            public_id: file.public_id
                        }
                    })
                }
            }
        },

        omit: {
            password: true
        },
        
        include: {
            doctor: true
        }
    })

    return createDoctorResult
}


export const doctorService = {
    applyAsDoctor
}