import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { doctorService } from "./doctor.service";



const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    if (!files) {
        throw new Error("No file found")
    }

    const resume = files['resume'][0] ?? null
    const additionalFiles = files.additionalFiles ?? []
    const payload = req.body

    const result = await doctorService.applyAsDoctor(payload, resume, additionalFiles)

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Applied Doctor Created Successfully",
        data: result,
    });
});

export const doctorController = {
    applyAsDoctor
};
