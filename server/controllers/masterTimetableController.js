const MasterTimetable = require("../models/MasterTimetable");
const Department = require("../models/Department");
const Semester = require("../models/Semester");
const Batch = require("../models/Batch");
const { generateDepartmentTimetable } = require("../services/departmentTimetableGenerator");

const getMasterTimetables = async (req, res) => {
  try {
    const timetables = await MasterTimetable.find()
      .populate("department", "name code")
      .populate("semesters", "name number")
      .sort({ createdAt: -1 });

    res.json({ timetables });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch master timetables.",
      error: error.message,
    });
  }
};

const getLatestMaster = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const query = departmentId ? { department: departmentId } : {};
    const timetable = await MasterTimetable.findOne(query)
      .sort({ createdAt: -1 })
      .populate("department", "name code")
      .populate("institution", "name code tagline programmes defaultProgramme")
      .populate("semesters", "name number")
      .populate("entries.semester", "name number")
      .populate("entries.batch", "name code studentCount startRoll endRoll")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.faculty", "name employeeId designation")
      .populate("entries.room", "name roomNumber type capacity")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .populate("entries.childBatches.room", "name roomNumber type capacity");

    if (!timetable) {
      return res.status(404).json({ message: "No master timetable found." });
    }

    res.json({ timetable });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch latest master timetable.",
      error: error.message,
    });
  }
};

const getMasterTimetableById = async (req, res) => {
  try {
    const timetable = await MasterTimetable.findById(req.params.id)
      .populate("department", "name code")
      .populate("institution", "name code tagline programmes defaultProgramme")
      .populate("semesters", "name number")
      .populate("entries.semester", "name number")
      .populate("entries.batch", "name code studentCount startRoll endRoll")
      .populate("entries.subject", "name code type courseCategory credits")
      .populate("entries.faculty", "name employeeId designation")
      .populate("entries.room", "name roomNumber type capacity")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
      .populate("entries.childBatches.subject", "name code type courseCategory credits")
      .populate("entries.childBatches.faculty", "name employeeId designation")
      .populate("entries.childBatches.room", "name roomNumber type capacity");

    if (!timetable) {
      return res.status(404).json({
        message: "Master timetable not found.",
      });
    }

    res.json({ timetable });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch master timetable.",
      error: error.message,
    });
  }
};

const generateMaster = async (req, res) => {
  try {
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({
        message: "Department is required.",
      });
    }

    const departmentData = await Department.findById(department);
    if (!departmentData) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    // Call the robust, conflict-free, GA-optimized generator
    const genResult = await generateDepartmentTimetable({
      departmentId: department,
      userId: req.user?._id || null
    });

    const populated = await MasterTimetable.findById(genResult.masterTimetableId)
      .populate("department", "name code")
      .populate("semesters", "name number")
      .populate("entries.semester", "name number")
      .populate("entries.batch", "name code studentCount startRoll endRoll")
      .populate("entries.subject", "name code type")
      .populate("entries.faculty", "name employeeId")
      .populate("entries.room", "name roomNumber type")
      .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak");

    res.status(201).json({
      message: "Master timetable generated successfully.",
      timetable: populated,
      generationDetails: genResult
    });
  } catch (error) {
    console.error("Master Timetable generation error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate master timetable.",
      error: error.message,
    });
  }
};

module.exports = {
  getMasterTimetables,
  getMasterTimetableById,
  getLatestMaster,
  generateMaster
};
