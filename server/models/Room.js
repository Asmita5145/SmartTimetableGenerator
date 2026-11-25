const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["CLASSROOM", "LAB"],
      required: true
    },

    capacity: {
      type: Number,
      required: true,
      min: 1
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    facilities: [
      {
        type: String,
        trim: true
      }
    ],

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

module.exports = mongoose.model("Room", roomSchema);