import { Router } from "express";
import {
	getMe,
	login,
	logout,
	logoutAll,
	refreshToken,
	register,
	verifyEmail,
} from "../controllers/auth.controller.js";

const authRouter = Router();

/** @route POST /api/auth/register */
authRouter.post("/register", register);

/** @route POST /api/auth/login */
authRouter.post("/login", login);

/** @route GET /api/auth/get-me */
authRouter.get("/get-me", getMe);

/** @route GET /api/auth/refresh-token */
authRouter.get("/refresh-token", refreshToken);

/** @route GET /api/auth/logout */
authRouter.get("/logout", logout);

/** @route GET /api/auth/logout-all */
authRouter.get("/logout-all", logoutAll);

/** @route GET /api/auth/verify-email */
authRouter.get("/verify-email", verifyEmail);

export default authRouter;
