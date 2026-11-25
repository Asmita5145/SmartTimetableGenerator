const mongoose = require("mongoose");

const masterEntrySchema = new mongoose.Schema(
  {
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },

    durationSlots: {
      type: Number,
      default: 1,
      enum: [1, 2],
    },

    entryType: {
      type: String,
      enum: [
        "LECTURE",
        "PRACTICAL",
        "TUTORIAL",
        "LIBRARY",
        "MENTOR",
        "PROJECT",
        "ACTIVITY",
      ],
      default: "LECTURE",
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    childBatches: [
      {
        batch: { type: String, required: true },
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
        faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
        durationHours: { type: Number, default: 2 }
      }
    ],
  },
  {
    _id: true,
  }
);

const masterTimetableSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    academicYear: {
      type: String,
      default: "2025-26",
    },

    semesters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
      },
    ],

    entries: [masterEntrySchema],

    status: {
      type: String,
      enum: ["DRAFT", "GENERATED", "PUBLISHED"],
      default: "GENERATED",
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "MasterTimetable",
  masterTimetableSchema
);