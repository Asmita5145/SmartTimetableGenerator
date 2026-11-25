const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },

    studentCount: {
      type: Number,
      required: true,
      min: 1,
    },

    startRoll: {
      type: Number,
      required: true,
    },

    endRoll: {
      type: Number,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null
    },

    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index(
  { semester: 1, code: 1 },
  { unique: true }
);

module.exports = mongoose.model("Batch", batchSchema);