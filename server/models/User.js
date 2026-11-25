const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "HOD", "COORDINATOR", "FACULTY", "STUDENT"],
      default: "STUDENT"
    },

    // Multi-tenant institution association
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null
    },

    // Configurable programme label (default B.Tech)
    programme: {
      type: String,
      default: "B.Tech"
    },

    // Academic assignment for students & faculty
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null
    },

    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      default: null
    },

    // Optional division
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      default: null
    },

    // Practical batch for students (e.g. "S1", "T2", "B1")
    batch: {
      type: String,
      default: null
    },

    rollNumber: {
      type: String,
      default: null
    },

    // Link to Faculty profile when role is FACULTY
    facultyProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
