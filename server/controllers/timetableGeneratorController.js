const Department = require("../models/Department");
const Semester = require("../models/Semester");
const Division = require("../models/Division");
const Timetable = require("../models/Timetable");
const { generateDepartmentTimetable } = require("../services/departmentTimetableGenerator");

/**
 * Unified generation endpoint for /api/timetable-generator/generate
 * Delegates to the central GA department/semester timetable generator
 */
const generate = async (req, res) => {
  try {
    const { departmentId, semesterId, divisionId, academicYear = "2026-27" } = req.body;

    if (!departmentId || !semesterId) {
      return res.status(400).json({
        message: "departmentId and semesterId are required"
      });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({ message: "Semester not found" });
    }

    let division = null;
    if (divisionId) {
      division = await Division.findById(divisionId);
    }

    const genResult = await generateDepartmentTimetable({
      departmentId,
      academicYear,
      semesterNumbers: [semester.number],
      divisionId: division?._id || null,
      useDivisions: Boolean(division),
      userId: req.user?._id || null
    });

    const targetTimetable = genResult.timetables?.[0];
    if (!targetTimetable) {
      return res.status(500).json({
        message: "Failed to generate timetable entries."
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
      message: "Timetable generated successfully",
      timetable: populatedTimetable,
      validation: {
        isValid: genResult.hardConstraintViolations === 0,
        violations: genResult.hardConstraintViolations,
        softScore: genResult.softConstraintScore,
        fitness: genResult.fitness
      },
      ...genResult
    });
  } catch (error) {
    console.error("TimetableGenerator generate error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate timetable",
      error: error.message
    });
  }
};

module.exports = {
  generateTimetable: generate
};
