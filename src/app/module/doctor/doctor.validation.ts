import { z } from "zod";

export const createDoctorValidationSchema = z.object({
  user: z.object({
    name: z.string().min(2, "Name is required"),

    email: z.email("Invalid email address"),

  }),

  doctor: z.object({
    licenseNumber: z.string().min(1, "License number is required"),

    specialization: z.string().min(1, "Specialization is required"),

    qualification: z.string().min(1, "Qualification is required"),
  }),
});