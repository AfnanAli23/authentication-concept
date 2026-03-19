import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";
import { sendEmail } from "../services/email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import otpModel from "../models/otp.model.js";

export async function register(req, res) {
	const { username, email, password } = req.body;

	const isAlreadyRegistered = await userModel.findOne({
		$or: [{ username }, { email }],
	});
	if (isAlreadyRegistered) {
		return res.status(409).json({
			message: "Email or Username already exists",
		});
	}

	const hashedPassword = crypto
		.createHash("sha256")
		.update(password)
		.digest("hex");

	const user = await userModel.create({
		username,
		email,
		password: hashedPassword,
	});

	// const refreshToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
	// 	expiresIn: "7d",
	// });
	// const refreshTokenHash = crypto
	// 	.createHash("sha256")
	// 	.update(refreshToken)
	// 	.digest("hex");

	// const session = await sessionModel.create({
	// 	user: user._id,
	// 	refreshTokenHash,
	// 	ip: req.ip,
	// 	userAgent: req.headers["user-agent"],
	// });

	// const accessToken = jwt.sign(
	// 	{ userId: user._id, sessionId: session._id },
	// 	config.JWT_SECRET,
	// 	{
	// 		expiresIn: "15m",
	// 	},
	// );

	// res.cookie("refreshToken", refreshToken, {
	// 	httpOnly: true,
	// 	secure: true,
	// 	sameSite: "strict",
	// 	maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	// });

	const otp = generateOtp();
	const html = getOtpHtml(otp);

	const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
	await otpModel.create({
		email,
		user: user._id,
		otpHash,
	});

	await sendEmail(
		email,
		// "Welcome to our app",
		// "Thank you for registration",
		// "<h1>Welcome to our app!</h1><p>Thank you for registration</p>",
		"OTP Verification",
		`Your OTP code is ${otp}`,
		html,
	);

	return res.status(201).json({
		message: "Registration Successfull",
		user: {
			email: user.email,
			verified: user.verified,
		},
	});
}

export async function login(req, res) {
	const { email, password } = req.body;

	const user = await userModel.findOne({ email });

	if (!user) {
		return res.status(401).json({
			message: "Invalid email or password",
		});
	}

	if (!user.verified) {
		return res.status(401).json({
			message: "Email not verified",
		});
	}

	const hashedPassword = crypto
		.createHash("sha256")
		.update(password)
		.digest("hex");

	const isPasswordValid = hashedPassword === user.password;

	if (!isPasswordValid) {
		return res.status(401).json({
			message: "Invalid email or password",
		});
	}

	const refreshToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
		expiresIn: "7d",
	});
	const refreshTokenHash = crypto
		.createHash("sha256")
		.update(refreshToken)
		.digest("hex");

	const session = await sessionModel.create({
		user: user._id,
		refreshTokenHash,
		ip: req.ip,
		userAgent: req.headers["user-agent"],
	});

	const accessToken = jwt.sign(
		{ userId: user._id, sessionId: session._id },
		config.JWT_SECRET,
		{
			expiresIn: "15m",
		},
	);

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	return res.status(201).json({
		message: "Loggedin Successfully",
		userEmail: {
			email: user.email,
		},
		accessToken,
	});
}

export async function getMe(req, res) {
	const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res.status(401).json({
			message: "Token not found",
		});
	}

	const decoded = jwt.verify(token, config.JWT_SECRET);

	const user = await userModel.findById(decoded.userId);

	return res.status(200).json({
		message: "User fetched successfully",
		user: {
			email: user.email,
		},
	});
}

export async function refreshToken(req, res) {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return res.status(401).json({
			message: "Refresh token not found",
		});
	}

	const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

	const refreshTokenHash = crypto
		.createHash("sha256")
		.update(refreshToken)
		.digest("hex");
	const session = await sessionModel.findOne({
		refreshTokenHash,
		revoked: false,
	});
	if (!session) {
		return res.status(401).json({
			message: "Invalid refresh token",
		});
	}

	const accessToken = jwt.sign({ id: decoded.userId }, config.JWT_SECRET, {
		expiresIn: "15m",
	});

	const newRefreshToken = jwt.sign({ id: decoded.userId }, config.JWT_SECRET, {
		expiresIn: "7d",
	});
	const newRefreshTokenHash = crypto
		.createHash("sha256")
		.update(newRefreshToken)
		.digest("hex");
	session.refreshTokenHash = newRefreshTokenHash;
	await session.save();

	res.cookie("newRefreshToken", newRefreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	return res.status(200).json({
		message: "accessToken refreshed successfully",
		accessToken,
	});
}

export async function logout(req, res) {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return res.status(401).json({
			message: "Refresh token not found",
		});
	}

	const refreshTokenHash = crypto
		.createHash("sha256")
		.update(refreshToken)
		.digest("hex");

	const session = await sessionModel.findOne({
		refreshTokenHash,
		revoked: false,
	});

	if (!session) {
		return res.status(401).json({
			message: "Invalid refresh token",
		});
	}

	session.revoked = true;
	await session.save();

	res.clearCookie("refreshToken");

	return res.status(200).json({
		message: "Logged out successfully",
	});
}

export async function logoutAll(req, res) {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return res.status(401).json({
			message: "Refresh token not found",
		});
	}

	const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

	await sessionModel.updateMany(
		{
			user: decoded.userId,
			revoked: false,
		},
		{ revoked: true },
	);

	res.clearCookie("refreshToken");

	return res.status(200).json({
		message: "Logged out from all devices successfully",
	});
}

export async function verifyEmail(req, res) {
	const { otp, email } = req.body;

	const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

	const otpDoc = await otpModel.findOne({
		email,
		otpHash,
	});

	if (!otpDoc) {
		return res.status(400).json({
			message: "Invalid OTP",
		});
	}

	const user = await userModel.findByIdAndUpdate(otpDoc.user, {
		verified: true,
	});

	await otpModel.deleteMany({
		user: otpDoc.user,
	});

	return res.status(200).json({
		message: "Email verified successfully",
		user: {
			email: user.email,
			verified: user.verified,
		},
	});
}
