import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { Request, Response } from "express";
import httpStatus from "http-status";

const updateProfilePicture = catchAsync(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new Error("File not found");
	}
	const uploadFile = req.file?.buffer;
	// biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: <explanation>
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const result = await UserService.updateProfilePicture(uploadFile,req.user?.userId!);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Profile Updated Successfully",
		data: result
	});
});

export const userController = {
	updateProfilePicture,
};
