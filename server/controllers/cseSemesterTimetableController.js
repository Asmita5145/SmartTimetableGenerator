const Semester = require("../models/Semester");
const Department = require("../models/Department");
const Batch = require("../models/Batch");
const Timetable = require("../models/Timetable");
const SemesterTimetable = require("../models/SemesterTimetable");

const { generateDepartmentTimetable } = require("../services/departmentTimetableGenerator");

/* =========================================================
   GENERATE SEMESTER TIMETABLE (UNIFIED)
========================================================= */

const generateSemesterTimetable = async (req, res) => {
  try {
    const { departmentId, semesterId, academicYear = "2026-27" } = req.body;

    if (!departmentId || !semesterId) {
      return res.status(400).json({
        success: false,
        message: "departmentId and semesterId are required.",
      });
    }

    const department = await Department.findById(departmentId).lean();
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const semester = await Semester.findById(semesterId).lean();
    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Semester not found.",
      });
    }

    const result = await generateDepartmentTimetable({
      departmentId,
      academicYear,
      semesterNumbers: [semester.number],
      userId: req.user?._id || null,
    });

    const targetTimetable = result.timetables?.[0];
    if (!targetTimetable) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate timetable entries.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Semester timetable generated successfully via unified AI engine.",
      data: targetTimetable,
      summary: {
        totalScheduledEntries: targetTimetable.entries?.length || 0,
        fitness: result.fitness,
        hardViolations: result.hardConstraintViolations,
      },
    });
  } catch (error) {
    console.error("CSE semester timetable generation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate semester timetable.",
    });
  }
};

/* =========================================================
   GET LATEST TIMETABLE (UNIFIED)
========================================================= */

const getLatestSemesterTimetable = async (req, res) => {
  try {
    const { departmentId, semesterId } = req.query;

    if (!departmentId || !semesterId) {
      return res.status(400).json({
        success: false,
        message: "departmentId and semesterId are required.",
      });
    }

    // Try unified Timetable model first
    let timetable = await Timetable.findOne({
      department: departmentId,
      semester: semesterId,
      academicYear: "2026-27",
    })
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("entries.subject", "name code type weeklyHours practicalHours")
      .populate("entries.faculty", "name employeeId")
      .populate("entries.room", "name roomNumber type capacity")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type")
      .populate("entries.childBatches.faculty", "name employeeId")
      .populate("entries.childBatches.room", "name roomNumber type")
      .sort({ createdAt: -1 })
      .lean();

    // Fallback to SemesterTimetable if needed
    if (!timetable) {
      timetable = await SemesterTimetable.findOne({
        department: departmentId,
        semester: semesterId,
        academicYear: "2026-27",
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "No timetable found.",
      });
    }

    return res.json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    console.error("Get semester timetable error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch timetable.",
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  generateSemesterTimetable,
  getLatestSemesterTimetable,
};
