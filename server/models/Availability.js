const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["FACULTY", "ROOM"],
      required: true
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    day: {
      type: String,
      enum: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY"
      ],
      required: true
    },

    availableSlots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot"
      }
    ],

    unavailableSlots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot"
      }
    ],

    preferredSlots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot"
      }
    ],

    maxDailyHours: {
      type: Number,
      default: 4
    },

    maxWeeklyHours: {
      type: Number,
      default: 18
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

module.exports = mongoose.model("Availability", availabilitySchema);