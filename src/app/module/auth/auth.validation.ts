import z from "zod";

export const PatientRegistrationSchema = z.object({
    name: z.string(), 
    email : z.email(),
    password : z.string().min(6),
   
})
export const UserLoginSchema = z.object({
    email : z.email(),
    password : z.string().min(6)
    
})