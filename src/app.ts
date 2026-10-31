import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { redisCLient } from "./app/lib/redis";
import { UserRoutes } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";
import { appoinmentRoutes } from "./app/module/appoinment/appoinment.route";
import { doctorRoutes } from "./app/module/doctor/doctor.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use('/api/v1/appoinment',appoinmentRoutes)
app.use('/api/v1/doctor',doctorRoutes)



// Basic route
app.get("/", async (req: Request, res: Response) => {


	const getBkashToken = await getBkashIdToken()
	console.log(getBkashToken);

	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
		data:null
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
