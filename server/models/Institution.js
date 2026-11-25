const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    tagline: {
      type: String,
      default: "AI-Powered Academic Timetable Management System"
    },

    address: {
      type: String,
      default: "Vidyanagar Ext. Banawadi, Karad 415124, Dist. Satara, Maharashtra"
    },

    // Configurable programmes (replaces hardcoded BE with B.Tech, M.Tech, etc.)
    programmes: {
      type: [String],
      default: ["B.Tech", "M.Tech", "Diploma"]
    },

    defaultProgramme: {
      type: String,
      default: "B.Tech"
    },

    academicYear: {
      type: String,
      default: "2026-27"
    },

    logoUrl: {
      type: String,
      default: ""
    },

    contactEmail: {
      type: String,
      default: "principal@dacoe.ac.in"
    },

    contactPhone: {
      type: String,
      default: ""
    },

    settings: {
      workingDays: {
        type: [String],
        default: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
      },
      startTime: {
        type: String,
        default: "10:00"
      },
      endTime: {
        type: String,
        default: "17:00"
      },
      breaks: [
        {
          name: { type: String, default: "Lunch Break" },
          startTime: { type: String, default: "12:00" },
          endTime: { type: String, default: "12:45" },
          slotNumber: { type: Number, default: 3 }
        },
        {
          name: { type: String, default: "Recess" },
          startTime: { type: String, default: "14:45" },
          endTime: { type: String, default: "15:00" },
          slotNumber: { type: Number, default: 6 }
        }
      ]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Institution", institutionSchema);
