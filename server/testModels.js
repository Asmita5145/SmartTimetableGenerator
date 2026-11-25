require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/User");
const Department = require("./models/Department");
const Semester = require("./models/Semester");
const Division = require("./models/Division");
const Faculty = require("./models/Faculty");
const Subject = require("./models/Subject");
const Room = require("./models/Room");
const TimeSlot = require("./models/TimeSlot");
const Timetable = require("./models/Timetable");
const Availability = require("./models/Availability");

const testModels = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    console.log("User model loaded:", User.modelName);
    console.log("Department model loaded:", Department.modelName);
    console.log("Semester model loaded:", Semester.modelName);
    console.log("Division model loaded:", Division.modelName);
    console.log("Faculty model loaded:", Faculty.modelName);
    console.log("Subject model loaded:", Subject.modelName);
    console.log("Room model loaded:", Room.modelName);
    console.log("TimeSlot model loaded:", TimeSlot.modelName);
    console.log("Timetable model loaded:", Timetable.modelName);
    console.log("Availability model loaded:", Availability.modelName);

    console.log("All models loaded successfully!");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Model test failed:", error.message);
  }
};

testModels();