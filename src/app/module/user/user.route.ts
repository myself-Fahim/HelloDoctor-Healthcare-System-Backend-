import { Router } from "express";
import { userController } from "./user.controller";
import { upload } from "../../lib/multer";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";


const router = Router();

router.patch(
    "/update-profile-picture",
    auth(Role.ADMIN,Role.DOCTOR,Role.PATIENT,Role.SUPER_ADMIN),
    upload.single('image')
    ,userController.updateProfilePicture
);
;
export const UserRoutes = router;
