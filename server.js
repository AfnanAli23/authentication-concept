import app from "./src/app.js";

import connectToDB from "./src/config/database.js";
connectToDB();

app.listen(process.env.PORT, () => {
	console.log(`Server is running at port: ${process.env.PORT}`);
});
