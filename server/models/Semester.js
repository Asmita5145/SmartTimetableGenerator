const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    number: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    // Configurable designated classroom for this semester/year
    designatedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null
    },

    // Preferred practical time block (soft preference for AI/GA scheduler)
    // e.g. "15:00-17:00" (Sem 3), "12:45-14:45" (Sem 5), "10:00-12:00" (Sem 7)
    preferredPracticalSlot: {
      type: String,
      default: null
    },

    // Configurable practical batches (e.g. ['S1', 'S2', 'S3', 'S4'])
    practicalBatches: {
      type: [String],
      default: []
    },

    studentCount: {
      type: Number,
      default: 65
    },

    programme: {
      type: String,
      default: "B.Tech"
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

module.exports = mongoose.model("Semester", semesterSchema);
