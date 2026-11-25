const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
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

    // Optional: only populated if a college uses divisions
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Division",
      default: null
    },

    academicYear: {
      type: String,
      default: "2026-27"
    },

    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null
    },

    entries: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          default: null
        },

        faculty: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Faculty",
          default: null
        },

        room: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
          default: null
        },

        timeSlot: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TimeSlot",
          required: true
        },

        durationSlots: {
          type: Number,
          enum: [1, 2],
          default: 1
        },

        entryType: {
          type: String,
          enum: ["LECTURE", "PRACTICAL", "TUTORIAL", "PROJECT", "LIBRARY", "ACTIVITY", "OTHER"],
          default: "LECTURE"
        },

        // For practical rotation batches: e.g. "T1", "T2", "T3", "T4", "B1"
        batch: {
          type: String,
          default: null
        },

        // Parent practical session child batch assignments (Phase 6 requirement)
        // One parent 2-hour practical holds 4 child batch cards (T1-T4 in parallel labs)
        childBatches: [
          {
            batch: { type: String, required: true },
            subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
            faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
            room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
            durationHours: { type: Number, default: 2 }
          }
        ],

        day: {
          type: String,
          default: null
        },

        startTime: {
          type: String,
          default: null
        },

        endTime: {
          type: String,
          default: null
        }
      }
    ],

    status: {
      type: String,
      enum: ["DRAFT", "GENERATED", "VALID", "INVALID", "PARTIAL", "PUBLISHED"],
      default: "DRAFT"
    },

    conflicts: [
      {
        type: { type: String },
        message: { type: String },
        subject: { type: String },
        division: { type: String },
        faculty: { type: String },
        room: { type: String }
      }
    ],

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Timetable", timetableSchema);
