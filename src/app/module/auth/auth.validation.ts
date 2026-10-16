import z from "zod";

export const PatientRegistrationSchema = z.object({
    name: z.string(), 
    email : z.email(),
    password : z.string().min(6),

   
})
export const ResetPasswordSchema = z.object({
   
    email:z.email(),
    otp:z.string().length(6),
    newPassword : z.string().min(6),
   
})
export const ForgotPasswordSchema = z.object({
 
    email : z.email(),
  
   
})
export const UserLoginSchema = z.object({
    email : z.email(),
    password : z.string().min(6)
    
})