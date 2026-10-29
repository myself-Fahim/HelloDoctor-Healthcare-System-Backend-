import { Router } from "express";
import { appoinmentController } from "./appoinment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";


const router = Router();

router.post('/booking',auth(Role.PATIENT),appoinmentController.bookAppoinment);
router.post('/pay-pending-booking',auth(Role.PATIENT),appoinmentController.payPendingPayment);
router.post('/cancel-booking',auth(Role.PATIENT,Role.ADMIN,Role.SUPER_ADMIN),appoinmentController.cancelAppoinment);
router.get('/book-appoinment/payment/callback',appoinmentController.bookAppoinmentCallback);


export const appoinmentRoutes = router;
