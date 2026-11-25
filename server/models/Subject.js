const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true
    },

    type: {
      type: String,
      enum: ["LECTURE", "PRACTICAL", "TUTORIAL", "PROJECT"],
      required: true
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true
    },

    weeklyHours: {
      type: Number,
      required: true,
      min: 1
    },

    practicalHours: {
      type: Number,
      default: 0,
      min: 0
    },

    tutorialHours: {
      type: Number,
      default: 0,
      min: 0
    },

    projectHours: {
      type: Number,
      default: 0,
      min: 0
    },

    faculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty"
      }
    ],

    // NEP 2020 Course Classification
    courseCategory: {
      type: String,
      enum: ["CORE", "ELECTIVE", "MDM", "SKILL", "ABILITY", "VALUE_ADDED", "PROJECT"],
      default: "CORE"
    },

    credits: {
      type: Number,
      default: 3,
      min: 1
    },

    electiveGroup: {
      type: String,
      default: null,
      trim: true
    },

    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Subject", subjectSchema);
