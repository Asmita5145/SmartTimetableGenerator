const mongoose = require("mongoose");

const timetableEntrySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ],
      required: true,
    },

    slotIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot",
        required: true,
      },
    ],

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
    },

    subjectCode: {
      type: String,
      required: true,
    },

    subjectName: {
      type: String,
      required: true,
    },

    entryType: {
      type: String,
      enum: [
        "LECTURE",
        "TUTORIAL",
        "PRACTICAL",
        "MDM",
        "LIBRARY",
        "APTITUDE",
        "MENTOR",
        "PROJECT",
        "ACTIVITY",
      ],
      required: true,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: false,
    },

    facultyName: {
      type: String,
      default: null,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
    },

    roomName: {
      type: String,
      default: null,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: false,
    },

    batchName: {
      type: String,
      default: null,
    },

    durationHours: {
      type: Number,
      required: true,
    },

    isFixed: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

const semesterTimetableSchema =
  new mongoose.Schema(
    {
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
      },

      semester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester",
        required: true,
      },

      academicYear: {
        type: String,
        default: "2026-27",
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "PUBLISHED",
        ],
        default: "DRAFT",
      },

      entries: {
        type: [
          timetableEntrySchema,
        ],
        default: [],
      },

      validation: {
        isValid: {
          type: Boolean,
          default: false,
        },

        errors: {
          type: [String],
          default: [],
        },

        warnings: {
          type: [String],
          default: [],
        },

        workload: {
          requiredTheoryHours: {
            type: Number,
            default: 0,
          },

          requiredPracticalHoursPerBatch: {
            type: Number,
            default: 0,
          },

          fixedActivityHours: {
            type: Number,
            default: 0,
          },

          availableAcademicSlots: {
            type: Number,
            default: 0,
          },

          usedTheorySlots: {
            type: Number,
            default: 0,
          },

          usedPracticalSlots: {
            type: Number,
            default: 0,
          },

          usedFixedActivitySlots: {
            type: Number,
            default: 0,
          },
        },
      },

      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "SemesterTimetable",
  semesterTimetableSchema
);