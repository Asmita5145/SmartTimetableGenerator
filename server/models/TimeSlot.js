const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
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

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    slotNumber: {
      type: Number,
      required: true,
      min: 1
    },

    isBreak: {
      type: Boolean,
      default: false
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

module.exports = mongoose.model("TimeSlot", timeSlotSchema);