import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { ForgotPasswordSchema, PatientRegistrationSchema, ResetPasswordSchema, UserLoginSchema } from "./auth.validation";
import { catchAsync } from "../../utils/catchAsync";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
	"/register",validateRequest(PatientRegistrationSchema),AuthController.registerPatient,
);
router.post("/login",validateRequest(UserLoginSchema),AuthController.loginUser);

router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post("/forgot-password", validateRequest(ForgotPasswordSchema),AuthController.forgotPassword);
router.post("/reset-password", validateRequest(ResetPasswordSchema),AuthController.resetPassword);
export const AuthRoutes = router;
