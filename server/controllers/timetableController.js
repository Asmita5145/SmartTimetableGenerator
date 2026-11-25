const {
  Timetable,
  Division,
  Department,
  Semester,
  Subject,
  Faculty,
  Room,
  TimeSlot,
  Institution,
  Availability
} = require("../models");

const {
  validateTimetable
} = require("../services/timetableValidator");

const {
  generateTimetable
} = require("../services/timetableGenerator");
const { generateDepartmentTimetable } = require("../services/departmentTimetableGenerator");
const { validateDepartmentBatches } = require("../services/batchValidationService");


// =====================================================
// CREATE TIMETABLE
// =====================================================

const createTimetable = async (req, res) => {
  try {
    const {
      department,
      semester,
      division,
      entries,
      status
    } = req.body;

    if (!department || !semester) {
      return res.status(400).json({
        message:
          "Department and semester are required"
      });
    }

    const timetable = await Timetable.create({
      department,
      semester,
      division: division || null,
      entries: entries || [],
      status: status || "DRAFT",
      generatedBy: req.user._id
    });

    res.status(201).json({
      message: "Timetable created successfully",
      timetable
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create timetable",
      error: error.message
    });
  }
};


// =====================================================
// GET ALL TIMETABLES
// =====================================================

const getTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find()
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("generatedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Timetables fetched successfully",
      timetables
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch timetables",
      error: error.message
    });
  }
};


// =====================================================
// GET TIMETABLE BY ID
// =====================================================

const getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate("department", "name code")
      .populate("institution", "name code tagline programmes defaultProgramme")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.faculty", "name employeeId designation")
      .populate("entries.room", "name roomNumber type capacity")
      .populate(
        "entries.timeSlot",
        "day startTime endTime slotNumber isBreak"
      )
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .populate("entries.childBatches.room", "name roomNumber type capacity")
      .populate("generatedBy", "name email");

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    res.status(200).json({
      message: "Timetable fetched successfully",
      timetable
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch timetable",
      error: error.message
    });
  }
};


// =====================================================
// UPDATE TIMETABLE
// =====================================================

const updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(
      req.params.id
    );

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    const {
      department,
      semester,
      division,
      entries,
      status
    } = req.body;

    timetable.department =
      department || timetable.department;

    timetable.semester =
      semester || timetable.semester;

    if (division !== undefined) {
      timetable.division = division || null;
    }

    timetable.entries =
      entries || timetable.entries;

    timetable.status =
      status || timetable.status;

    await timetable.save();

    res.status(200).json({
      message: "Timetable updated successfully",
      timetable
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update timetable",
      error: error.message
    });
  }
};

// =====================================================
// EDIT SINGLE TIMETABLE ENTRY
// =====================================================

const updateTimetableEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;

    const {
      timeSlot,
      faculty,
      room
    } = req.body;

    // ---------------------------------------------
    // Find timetable
    // ---------------------------------------------

    const timetable = await Timetable.findById(id);

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    // ---------------------------------------------
    // Find timetable entry
    // ---------------------------------------------

    const entry = timetable.entries.id(entryId);

    if (!entry) {
      return res.status(404).json({
        message: "Timetable entry not found"
      });
    }

    // ---------------------------------------------
    // Validate provided TimeSlot
    // ---------------------------------------------

    if (timeSlot) {
      const selectedTimeSlot =
        await TimeSlot.findById(timeSlot);

      if (!selectedTimeSlot) {
        return res.status(404).json({
          message: "Selected time slot not found"
        });
      }

      if (selectedTimeSlot.isBreak) {
        return res.status(400).json({
          message:
            "A timetable entry cannot be assigned to a break slot"
        });
      }

      entry.timeSlot = timeSlot;
    }

    // ---------------------------------------------
    // Validate provided Faculty
    // ---------------------------------------------

    if (faculty) {
      const selectedFaculty =
        await Faculty.findById(faculty);

      if (!selectedFaculty) {
        return res.status(404).json({
          message: "Selected faculty not found"
        });
      }

      entry.faculty = faculty;
    }

    // ---------------------------------------------
    // Validate provided Room
    // ---------------------------------------------

    if (room) {
      const selectedRoom =
        await Room.findById(room);

      if (!selectedRoom) {
        return res.status(404).json({
          message: "Selected room not found"
        });
      }

      entry.room = room;
    }

    // ---------------------------------------------
    // Validate the modified timetable
    // ---------------------------------------------

    const validationResult =
      await validateTimetable(timetable);

    if (!validationResult.isValid) {
      return res.status(400).json({
        message:
          "Timetable entry cannot be updated because it creates conflicts",
        result: validationResult
      });
    }

    // ---------------------------------------------
    // Any manual edit creates a DRAFT
    // ---------------------------------------------

    timetable.status = "DRAFT";

    await timetable.save();

    // ---------------------------------------------
    // Fetch updated timetable with populated data
    // ---------------------------------------------

    const updatedTimetable =
      await Timetable.findById(timetable._id)
        .populate("department", "name code")
        .populate("semester", "name number")
        .populate("division", "name studentCount")
        .populate("entries.subject", "name code type")
        .populate("entries.faculty", "name employeeId")
        .populate(
          "entries.room",
          "name roomNumber type capacity"
        )
        .populate(
          "entries.timeSlot",
          "day startTime endTime slotNumber isBreak"
        )
        .populate("generatedBy", "name email");

    res.status(200).json({
      message:
        "Timetable entry updated successfully. Timetable moved to DRAFT.",
      timetable: updatedTimetable,
      result: validationResult
    });

  } catch (error) {
    console.error(
      "Update timetable entry error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update timetable entry",
      error: error.message
    });
  }
};

// =====================================================
// DELETE TIMETABLE
// =====================================================

const deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(
      req.params.id
    );

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    await timetable.deleteOne();

    res.status(200).json({
      message: "Timetable deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete timetable",
      error: error.message
    });
  }
};


// =====================================================
// VALIDATE TIMETABLE
// =====================================================

const validateTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(
      req.params.id
    )
      .populate("division")
      .populate("entries.subject")
      .populate("entries.faculty")
      .populate("entries.room")
      .populate("entries.timeSlot");

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    const result = await validateTimetable(
      timetable
    );

    res.status(200).json({
      message: "Timetable validation completed",
      result
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to validate timetable",
      error: error.message
    });
  }
};


// =====================================================
// PUBLISH TIMETABLE
// =====================================================

const publishTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(
      req.params.id
    )
      .populate("division")
      .populate("entries.subject")
      .populate("entries.faculty")
      .populate("entries.room")
      .populate("entries.timeSlot");

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found"
      });
    }

    // Validate before publishing
    const validationResult =
      await validateTimetable(timetable);

    if (!validationResult.isValid) {
      return res.status(400).json({
        message:
          "Timetable cannot be published because validation failed",
        result: validationResult
      });
    }

    // Unpublish any previously published timetable
    // for the same department + semester + division.
    //
    // If division is null, this correctly targets
    // semester-level timetables.

    await Timetable.updateMany(
      {
        department: timetable.department._id,
        semester: timetable.semester._id,
        division: timetable.division
          ? timetable.division._id
          : null,
        status: "PUBLISHED",
        _id: {
          $ne: timetable._id
        }
      },
      {
        $set: {
          status: "DRAFT"
        }
      }
    );

    // Publish the selected timetable
    timetable.status = "PUBLISHED";

    await timetable.save();

    res.status(200).json({
      message:
        "Timetable validated and published successfully",
      timetable
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to publish timetable",
      error: error.message
    });
  }
};

// =====================================================
// GET MY TIMETABLE - STUDENT
// =====================================================

const getMyTimetable = async (req, res) => {
  try {
    // ---------------------------------------------
    // Check student role
    // ---------------------------------------------

    if (req.user.role !== "STUDENT") {
      return res.status(403).json({
        message: "Student access required"
      });
    }

    // ---------------------------------------------
    // Check division assignment
    // ---------------------------------------------


    if (!req.user.semester) {
      return res.status(400).json({
        message:
          "Your academic assignment is pending.",
        code:
          "ACADEMIC_ASSIGNMENT_PENDING"
      });
    }

    // ---------------------------------------------
    // Find published timetable
    // ---------------------------------------------

    let timetable;

    // -------------------------------------------------
    // FIRST: Try division timetable
    // -------------------------------------------------

    if (req.user.division) {
      timetable =
        await Timetable.findOne({
          division: req.user.division,
          status: { $in: ["PUBLISHED", "VALID", "GENERATED"] }
        })
          .populate(
            "department",
            "name code"
          )
          .populate(
            "institution",
            "name code tagline programmes defaultProgramme"
          )
          .populate(
            "semester",
            "name number"
          )
          .populate(
            "division",
            "name studentCount"
          )
          .populate(
            "entries.subject",
            "name code type courseCategory credits"
          )
          .populate(
            "entries.faculty",
            "name employeeId designation"
          )
          .populate(
            "entries.room",
            "name roomNumber type capacity"
          )
          .populate(
            "entries.timeSlot",
            "day startTime endTime slotNumber isBreak"
          )
          .populate(
            "entries.childBatches.subject",
            "name code type courseCategory credits"
          )
          .populate(
            "entries.childBatches.faculty",
            "name employeeId designation"
          )
          .populate(
            "entries.childBatches.room",
            "name roomNumber type capacity"
          );
    }

    // -------------------------------------------------
    // SECOND: Try semester-level timetable
    // -------------------------------------------------

    if (
      !timetable &&
      req.user.semester
    ) {
      timetable =
        await Timetable.findOne({
          semester: req.user.semester,
          division: null,
          status: { $in: ["PUBLISHED", "VALID", "GENERATED"] }
        })
          .populate(
            "department",
            "name code"
          )
          .populate(
            "institution",
            "name code tagline programmes defaultProgramme"
          )
          .populate(
            "semester",
            "name number"
          )
          .populate(
            "division",
            "name studentCount"
          )
          .populate(
            "entries.subject",
            "name code type courseCategory credits"
          )
          .populate(
            "entries.faculty",
            "name employeeId designation"
          )
          .populate(
            "entries.room",
            "name roomNumber type capacity"
          )
          .populate(
            "entries.timeSlot",
            "day startTime endTime slotNumber isBreak"
          )
          .populate(
            "entries.childBatches.subject",
            "name code type courseCategory credits"
          )
          .populate(
            "entries.childBatches.faculty",
            "name employeeId designation"
          )
          .populate(
            "entries.childBatches.room",
            "name roomNumber type capacity"
          );
    }

    // ---------------------------------------------
    // No timetable found
    // ---------------------------------------------

    if (!timetable) {
      return res.status(404).json({
        message:
          "No published timetable found for your academic assignment"
      });
    }

    // Filter by student's practical batch if applicable
    const timetableObj = timetable.toObject ? timetable.toObject() : { ...timetable };
    if (req.user.batch && Array.isArray(timetableObj.entries)) {
      timetableObj.entries = timetableObj.entries
        .map((e) => {
          if (e.childBatches && e.childBatches.length > 0) {
            const myBatch = e.childBatches.find((cb) => cb.batch === req.user.batch);
            if (myBatch) {
              return {
                ...e,
                batch: myBatch.batch,
                subject: myBatch.subject,
                faculty: myBatch.faculty,
                room: myBatch.room,
                durationSlots: 2,
                entryType: "PRACTICAL"
              };
            }
            return null;
          }
          if (e.batch && e.batch !== req.user.batch) {
            return null;
          }
          return e;
        })
        .filter(Boolean);
    }

    // ---------------------------------------------
    // Fetch COMPLETE time-slot configuration
    // ---------------------------------------------

    const timeSlots = await TimeSlot.find({
      day: {
        $in: [
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY"
        ]
      }
    }).sort({
      slotNumber: 1
    });

    // ---------------------------------------------
    // Return timetable + all time slots
    // ---------------------------------------------

    res.status(200).json({
      message:
        "Student timetable fetched successfully",

      timetable: timetableObj,

      timeSlots
    });

  } catch (error) {
    console.error(
      "Student timetable error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch student timetable",

      error: error.message
    });
  }
};

// =====================================================
// GENERATE TIMETABLE
// =====================================================

const generateTimetableByConfig = async (req, res) => {
  try {
    const {
      department,
      semester,
      division,
      academicYear = "2026-27"
    } = req.body;

    if (!department || !semester) {
      return res.status(400).json({
        message: "Department and semester are required."
      });
    }

    const departmentData = await Department.findById(department);
    if (!departmentData) {
      return res.status(404).json({
        message: "Department not found."
      });
    }

    const semesterData = await Semester.findOne({
      _id: semester,
      department
    });
    if (!semesterData) {
      return res.status(400).json({
        message: "Selected semester does not belong to the selected department."
      });
    }

    let divisionData = null;
    if (division) {
      divisionData = await Division.findOne({
        _id: division,
        semester
      });
      if (!divisionData) {
        return res.status(400).json({
          message: "Selected division does not belong to the selected semester."
        });
      }
    }

    // Call unified department timetable generation engine for this semester/division
    const genResult = await generateDepartmentTimetable({
      departmentId: department,
      academicYear,
      semesterNumbers: [semesterData.number],
      divisionId: divisionData?._id || null,
      useDivisions: Boolean(divisionData),
      userId: req.user?._id || null
    });

    const targetTimetable = genResult.timetables?.[0];
    if (!targetTimetable) {
      return res.status(500).json({
        message: "Generation engine did not return a valid timetable."
      });
    }

    const populatedTimetable = await Timetable.findById(targetTimetable._id)
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("entries.subject", "name code type weeklyHours practicalHours")
      .populate("entries.faculty", "name employeeId")
      .populate("entries.room", "name roomNumber type capacity")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type")
      .populate("entries.childBatches.faculty", "name employeeId")
      .populate("entries.childBatches.room", "name roomNumber type");

    res.status(201).json({
      message: divisionData
        ? "Division timetable generated successfully."
        : "Semester timetable generated successfully.",
      timetable: populatedTimetable,
      validation: {
        isValid: genResult.hardConstraintViolations === 0,
        violations: genResult.hardConstraintViolations,
        softConstraintScore: genResult.softConstraintScore,
        fitness: genResult.fitness
      },
      ...genResult
    });
  } catch (error) {
    console.error("Generate timetable error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate timetable.",
      error: error.message
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================


// =====================================================
// GENERATE ENTIRE DEPARTMENT TIMETABLE
// =====================================================
const generateDepartment = async (req, res) => {
  try {
    const { departmentId, academicYear = "2026-27", semesterNumbers = [3, 5, 7] } = req.body;

    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required." });
    }

    const result = await generateDepartmentTimetable({
      departmentId,
      academicYear,
      semesterNumbers,
      userId: req.user?._id || null
    });

    res.status(201).json({
      message: result.isFullyValid
        ? "Complete department timetable generated successfully without conflicts."
        : "Department timetable generated with partial constraint warnings.",
      ...result
    });
  } catch (error) {
    console.error("Department Timetable Generation error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate department timetable."
    });
  }
};

// =====================================================
// VALIDATE DEPARTMENT PRACTICAL BATCHES
// =====================================================
const validateBatches = async (req, res) => {
  try {
    const { departmentId, semesterNumbers } = req.body;
    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required." });
    }
    const result = await validateDepartmentBatches({
      departmentId,
      semesterNumbers: semesterNumbers || [3, 5, 7]
    });
    res.status(200).json({
      message: result.isValid
        ? "All department practical batches are valid."
        : "Batch validation detected issues.",
      ...result
    });
  } catch (error) {
    console.error("Batch validation error:", error);
    res.status(500).json({ message: error.message || "Failed to validate batches." });
  }
};

// =====================================================
// GET FACULTY TIMETABLE (Across all classes + free slots)
// =====================================================
const getFacultyTimetable = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { academicYear = "2026-27" } = req.query;

    const faculty = await Faculty.findById(facultyId).populate("department", "name code");
    if (!faculty) {
      return res.status(404).json({ message: "Faculty member not found." });
    }

    // Find all timetables for this academic year
    const timetables = await Timetable.find({ academicYear })
      .populate("division", "name studentCount")
      .populate("semester", "name number")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.room", "name roomNumber type capacity")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.room", "name roomNumber type capacity")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .lean();

    const facultyEntries = [];
    const occupiedSlotKeys = new Set();

    let theoryHours = 0;
    let practicalHours = 0;
    let tutorialHours = 0;
    let projectHours = 0;

    for (const tt of timetables) {
      for (const entry of tt.entries || []) {
        const slot = entry.timeSlot;
        const duration = entry.durationSlots || 1;
        const subType = entry.subject?.type || entry.entryType;

        // 1. Direct faculty match (theory, tutorial, project)
        if (String(entry.faculty) === String(facultyId) || String(entry.faculty?._id) === String(facultyId)) {
          if (subType === "PRACTICAL") practicalHours += duration;
          else if (subType === "TUTORIAL") tutorialHours += duration;
          else if (subType === "PROJECT") projectHours += duration;
          else theoryHours += duration;

          facultyEntries.push({
            subject: entry.subject,
            room: entry.room,
            timeSlot: slot,
            division: tt.division,
            semester: tt.semester,
            durationSlots: duration,
            batch: entry.batch || null,
            entryType: entry.entryType || subType
          });

          if (slot) {
            occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber}`);
            if (duration === 2) {
              occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber + 1}`);
            }
          }
        }

        // 2. Child batch match (practical labs)
        if (entry.childBatches && entry.childBatches.length > 0) {
          for (const cb of entry.childBatches) {
            if (String(cb.faculty) === String(facultyId) || String(cb.faculty?._id) === String(facultyId)) {
              const cbDuration = cb.durationHours || 2;
              practicalHours += cbDuration;

              facultyEntries.push({
                subject: cb.subject,
                room: cb.room,
                timeSlot: slot,
                division: tt.division,
                semester: tt.semester,
                durationSlots: 2,
                batch: cb.batch,
                entryType: "PRACTICAL"
              });

              if (slot) {
                occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber}`);
                occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber + 1}`);
              }
            }
          }
        }
      }
    }

    // Get all valid slots to determine FREE slots
    const allSlots = await TimeSlot.find({ day: { $in: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] } })
      .sort({ day: 1, slotNumber: 1 })
      .lean();

    const freeSlots = allSlots.filter((slot) => !slot.isBreak && !occupiedSlotKeys.has(`${slot.day}_${slot.slotNumber}`));

    res.status(200).json({
      faculty,
      academicYear,
      entries: facultyEntries,
      freeSlots,
      allSlots,
      workload: {
        theoryHours,
        practicalHours,
        tutorialHours,
        projectHours,
        totalHours: theoryHours + practicalHours + tutorialHours + projectHours
      }
    });
  } catch (error) {
    console.error("Get faculty timetable error:", error);
    res.status(500).json({ message: "Failed to fetch faculty timetable.", error: error.message });
  }
};

// =====================================================
// GET ROOM / LAB TIMETABLE (Schedule + free slots)
// =====================================================
const getRoomTimetable = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { academicYear = "2026-27" } = req.query;

    const room = await Room.findById(roomId).populate("department", "name code");
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const timetables = await Timetable.find({ academicYear })
      .populate("division", "name studentCount")
      .populate("semester", "name number")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.faculty", "name employeeId designation")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .populate("entries.childBatches.room", "name roomNumber type capacity")
      .lean();

    const roomEntries = [];
    const occupiedSlotKeys = new Set();

    for (const tt of timetables) {
      for (const entry of tt.entries || []) {
        const slot = entry.timeSlot;
        const duration = entry.durationSlots || 1;

        // 1. Direct room match (classroom theory / tutorials)
        if (String(entry.room) === String(roomId) || String(entry.room?._id) === String(roomId)) {
          roomEntries.push({
            subject: entry.subject,
            faculty: entry.faculty,
            timeSlot: slot,
            division: tt.division,
            semester: tt.semester,
            durationSlots: duration,
            batch: entry.batch || null,
            entryType: entry.entryType || entry.subject?.type
          });

          if (slot) {
            occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber}`);
            if (duration === 2) {
              occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber + 1}`);
            }
          }
        }

        // 2. Child batch match (lab practicals)
        if (entry.childBatches && entry.childBatches.length > 0) {
          for (const cb of entry.childBatches) {
            if (String(cb.room) === String(roomId) || String(cb.room?._id) === String(roomId)) {
              roomEntries.push({
                subject: cb.subject,
                faculty: cb.faculty,
                timeSlot: slot,
                division: tt.division,
                semester: tt.semester,
                durationSlots: 2,
                batch: cb.batch,
                entryType: "PRACTICAL"
              });

              if (slot) {
                occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber}`);
                occupiedSlotKeys.add(`${slot.day}_${slot.slotNumber + 1}`);
              }
            }
          }
        }
      }
    }

    const allSlots = await TimeSlot.find({ day: { $in: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] } })
      .sort({ day: 1, slotNumber: 1 })
      .lean();

    const workingSlots = allSlots.filter((slot) => !slot.isBreak);
    const freeSlots = workingSlots.filter((slot) => !occupiedSlotKeys.has(`${slot.day}_${slot.slotNumber}`));

    const totalWorkingSlotsCount = workingSlots.length;
    const usedSlotsCount = occupiedSlotKeys.size;
    const utilizationRate = totalWorkingSlotsCount > 0 ? Math.round((usedSlotsCount / totalWorkingSlotsCount) * 100) : 0;

    res.status(200).json({
      room,
      academicYear,
      entries: roomEntries,
      freeSlots,
      allSlots,
      utilization: {
        usedSlots: usedSlotsCount,
        totalSlots: totalWorkingSlotsCount,
        utilizationRate: `${utilizationRate}%`
      }
    });
  } catch (error) {
    console.error("Get room timetable error:", error);
    res.status(500).json({ message: "Failed to fetch room timetable.", error: error.message });
  }
};

// =====================================================
// GET DEPARTMENT OVERVIEW & SUMMARY
// =====================================================
const getDepartmentOverview = async (req, res) => {
  try {
    const { departmentCode = "CSE", academicYear = "2026-27" } = req.query;

    const department = await Department.findOne({ code: departmentCode });
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const [
      departmentsCount,
      semestersCount,
      divisionsCount,
      facultyList,
      subjectsList,
      roomsList,
      timetables
    ] = await Promise.all([
      Department.countDocuments(),
      Semester.countDocuments({ department: department._id }),
      Division.countDocuments(),
      Faculty.find({ department: department._id }).lean(),
      Subject.find({ department: department._id }).lean(),
      Room.find({ department: department._id }).lean(),
      Timetable.find({ department: department._id, academicYear })
        .populate("division", "name studentCount")
        .populate("semester", "name number")
        .lean()
    ]);

    const classrooms = roomsList.filter((r) => r.type === "CLASSROOM");
    const labs = roomsList.filter((r) => r.type === "LAB");

    let totalEntriesCount = 0;
    let totalConflictsCount = 0;

    for (const tt of timetables) {
      totalEntriesCount += (tt.entries || []).length;
      totalConflictsCount += (tt.conflicts || []).length;
    }

    // Classroom and lab utilization
    const totalWeeklySlots = 30; // 5 days * 6 non-break slots
    const totalClassroomCap = classrooms.length * totalWeeklySlots;
    const totalLabCap = labs.length * totalWeeklySlots;

    let usedClassroomSlots = 0;
    let usedLabSlots = 0;

    for (const tt of timetables) {
      for (const entry of tt.entries || []) {
        const room = roomsList.find((r) => String(r._id) === String(entry.room));
        const duration = entry.durationSlots || 1;
        if (room?.type === "LAB") usedLabSlots += duration;
        else usedClassroomSlots += duration;
      }
    }

    res.status(200).json({
      department,
      counts: {
        totalDepartments: departmentsCount,
        totalSemesters: semestersCount,
        totalDivisions: divisionsCount,
        totalFaculty: facultyList.length,
        totalSubjects: subjectsList.length,
        totalRooms: classrooms.length,
        totalLabs: labs.length,
        generatedTimetables: timetables.length,
        totalSessions: totalEntriesCount,
        totalConflicts: totalConflictsCount
      },
      utilization: {
        classrooms: {
          rate: totalClassroomCap > 0 ? Math.round((usedClassroomSlots / totalClassroomCap) * 100) : 0,
          used: usedClassroomSlots,
          capacity: totalClassroomCap
        },
        laboratories: {
          rate: totalLabCap > 0 ? Math.round((usedLabSlots / totalLabCap) * 100) : 0,
          used: usedLabSlots,
          capacity: totalLabCap
        }
      },
      timetables
    });
  } catch (error) {
    console.error("Get department overview error:", error);
    res.status(500).json({ message: "Failed to fetch department overview.", error: error.message });
  }
};

// =====================================================
// GET WORKLOAD REPORT
// =====================================================
const getWorkloadReport = async (req, res) => {
  try {
    const { departmentCode = "CSE", academicYear = "2026-27" } = req.query;

    const department = await Department.findOne({ code: departmentCode }).populate("institution");
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const facultyList = await Faculty.find({ department: department._id }).sort({ name: 1 }).lean();
    const timetables = await Timetable.find({ department: department._id, academicYear })
      .populate("division", "name")
      .populate("semester", "name number")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.faculty", "name employeeId designation")
      .populate("entries.room", "roomNumber type")
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .populate("entries.childBatches.room", "roomNumber type")
      .lean();

    const facultyWorkloadMap = new Map();
    for (const f of facultyList) {
      facultyWorkloadMap.set(String(f._id), {
        facultyId: f._id,
        name: f.name,
        employeeId: f.employeeId,
        designation: f.designation,
        email: f.email,
        theory: 0,
        practical: 0,
        tutorial: 0,
        project: 0,
        total: 0,
        subjects: new Set(),
        divisions: new Set()
      });
    }

    for (const tt of timetables) {
      const classLabel = tt.division?.name || (tt.semester?.name ? `${tt.semester.name}` : `Sem ${tt.semester?.number || ""}`);

      for (const entry of tt.entries || []) {
        // A. Child batches (parallel practical labs)
        if (entry.childBatches && entry.childBatches.length > 0) {
          for (const cb of entry.childBatches) {
            const facId = String(cb.faculty?._id || cb.faculty);
            if (!facultyWorkloadMap.has(facId)) continue;

            const row = facultyWorkloadMap.get(facId);
            const duration = cb.durationHours || 2;
            row.practical += duration;
            row.total += duration;

            if (cb.subject?.name) row.subjects.add(cb.subject.name);
            if (classLabel) row.divisions.add(`${classLabel} (${cb.batch})`);
          }
        } else {
          // B. Direct faculty entries (theory, tutorial, project)
          const facId = String(entry.faculty?._id || entry.faculty);
          if (!facultyWorkloadMap.has(facId)) continue;

          const row = facultyWorkloadMap.get(facId);
          const duration = entry.durationSlots || 1;
          const subType = entry.subject?.type || entry.entryType;

          if (subType === "PRACTICAL") row.practical += duration;
          else if (subType === "TUTORIAL") row.tutorial += duration;
          else if (subType === "PROJECT") row.project += duration;
          else row.theory += duration;

          row.total += duration;
          if (entry.subject?.name) row.subjects.add(entry.subject.name);
          if (classLabel) row.divisions.add(classLabel);
        }
      }
    }

    const report = Array.from(facultyWorkloadMap.values()).map((r) => ({
      ...r,
      subjects: Array.from(r.subjects),
      divisions: Array.from(r.divisions)
    }));

    // Reconciled department-wide totals
    const departmentTotals = {
      theory: 0,
      practical: 0,
      tutorial: 0,
      project: 0,
      total: 0,
      facultyCount: facultyList.length
    };

    for (const r of report) {
      departmentTotals.theory += r.theory;
      departmentTotals.practical += r.practical;
      departmentTotals.tutorial += r.tutorial;
      departmentTotals.project += r.project;
      departmentTotals.total += r.total;
    }

    res.status(200).json({
      department,
      institution: department.institution || null,
      academicYear,
      workloadReport: report,
      departmentTotals
    });
  } catch (error) {
    console.error("Get workload report error:", error);
    res.status(500).json({ message: "Failed to fetch workload report.", error: error.message });
  }
};

// =====================================================
// GET LOGGED-IN FACULTY'S OWN SCHEDULE
// =====================================================
const getMyFacultySchedule = async (req, res) => {
  try {
    let facultyId = req.user?.facultyProfile;
    if (!facultyId) {
      const fac = await Faculty.findOne({ email: req.user?.email });
      if (fac) facultyId = fac._id;
    }

    if (!facultyId) {
      return res.status(404).json({ message: "No faculty profile linked to this account." });
    }

    req.params.facultyId = facultyId;
    return getFacultyTimetable(req, res);
  } catch (error) {
    console.error("Get my faculty schedule error:", error);
    res.status(500).json({ message: "Failed to fetch faculty schedule.", error: error.message });
  }
};

module.exports = {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  updateTimetableEntry,
  deleteTimetable,
  validateTimetableById,
  publishTimetable,
  getMyTimetable,
  generateTimetableByConfig,
  generateDepartment,
  getFacultyTimetable,
  getMyFacultySchedule,
  getRoomTimetable,
  getDepartmentOverview,
  getWorkloadReport,
  validateBatches
};
