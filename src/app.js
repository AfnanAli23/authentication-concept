// Requiring Packages
import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";

// Setting up server
const app = express();

// Basic Setup
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Requiring Routes API
import authRouter from "./routes/auth.route.js";

// Setting up Routes API
app.use("/api/auth", authRouter);

export default app;
