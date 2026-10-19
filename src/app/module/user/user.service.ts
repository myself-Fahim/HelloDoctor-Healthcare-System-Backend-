import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";


const updateProfilePicture = async (payload: Buffer, userId: string) => {

    const cloudinaryResult = await new Promise<UploadApiResponse>((resolve,reject)=>{
        cloudinary.uploader
		.upload_stream(
			{ resource_type: "auto" },

			 (error, result) => {
				if (error) {
					console.log(error);
					return reject(error)
				}

                if(!result){
                    return reject(new Error("Failed to upload in cloudinary"))
                }

                resolve(result)
			}).end(payload);
    })
    

    const result = await prisma.user.update({
        where:{
            id:userId
        },
        data:{
            image:cloudinaryResult.secure_url,
            imageID:cloudinaryResult.public_id
        },
        omit:{
            password:true
        }
    })

    return result
	
};

export const UserService = {
	updateProfilePicture,
};
