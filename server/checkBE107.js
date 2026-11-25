require("dotenv").config();

const mongoose = require("mongoose");

const Subject = require("./models/Subject");
const Faculty = require("./models/Faculty");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.\n");

    const subject = await Subject.findOne({
      code: "BE107",
    }).populate("faculty");

    console.log("===== BE107 =====");
    console.log(JSON.stringify(subject, null, 2));

    const faculty = await Faculty.find({
      name: /M\. L\. Kamble/i,
    });

    console.log("\n===== M. L. Kamble =====");
    console.log(JSON.stringify(faculty, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("ERROR:", error.message);

    try {
      await mongoose.disconnect();
    } catch {}

    process.exit(1);
  }
}

check();