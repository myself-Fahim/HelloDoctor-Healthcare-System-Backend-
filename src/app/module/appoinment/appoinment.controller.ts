import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { appoinmentService } from "./appoinment.service";

const bookAppoinment = catchAsync(async (req: Request, res: Response) => {
	
	const result = await appoinmentService.bookAppoinment(req.body,req.user!);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Appoinment Booking Created Successfully",
		data: result,
	});

});
const bookAppoinmentCallback = catchAsync(async (req: Request, res: Response) => {
	const query = req.query
	const {  redirectUrl } = await appoinmentService.bookAppoinmentCallback(query);

	res.redirect(redirectUrl)

	// sendResponse(res, {
	// 	statusCode: httpStatus.OK,
	// 	success: true,
	// 	message: "Booking callback get successfully",
	// 	data: result,
	// });

});


export const appoinmentController = {
	bookAppoinment,
	bookAppoinmentCallback
};
