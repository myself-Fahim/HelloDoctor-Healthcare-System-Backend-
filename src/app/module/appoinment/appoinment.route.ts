import { Router } from "express";
import { appoinmentController } from "./appoinment.controller";


const router = Router();

router.post('/booking',appoinmentController.bookAppoinment);
router.get('/book-appoinment/payment/callback',appoinmentController.bookAppoinmentCallback);


export const appoinmentRoutes = router;
