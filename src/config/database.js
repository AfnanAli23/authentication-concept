import mongoose from "mongoose";
import config from "./config.js";

async function connectToDB() {
	try {
		await mongoose.connect(`${config.MONGO_URI}/authentication`);
		console.log("Connected to Database");
	} catch (err) {
		console.log("Error connecting to Database", err);
	}
}

export default connectToDB;
