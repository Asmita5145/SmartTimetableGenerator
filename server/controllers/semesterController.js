const Semester = require("../models/Semester");
const Department = require("../models/Department");

// Create semester
const createSemester = async (req, res) => {
  try {
    const { name, number, department } = req.body;

    // Check required fields
    if (!name || !number || !department) {
      return res.status(400).json({
        message: "Semester name, number and department are required"
      });
    }

    // Check if department exists
    const existingDepartment = await Department.findById(department);

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    // Check duplicate semester
    const existingSemester = await Semester.findOne({
      number,
      department
    });

    if (existingSemester) {
      return res.status(400).json({
        message: "This semester already exists for this department"
      });
    }

    // Create semester
    const semester = await Semester.create({
      name,
      number,
      department
    });

    res.status(201).json({
      message: "Semester created successfully",
      semester
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create semester",
      error: error.message
    });
  }
};

// Get all semesters
const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find()
      .populate("department", "name code")
      .sort({
        number: 1
      });

    res.status(200).json({
      message: "Semesters fetched successfully",
      semesters
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch semesters",
      error: error.message
    });
  }
};

// Get single semester
const getSemesterById = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id)
      .populate("department", "name code");

    if (!semester) {
      return res.status(404).json({
        message: "Semester not found"
      });
    }

    res.status(200).json({
      message: "Semester fetched successfully",
      semester
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch semester",
      error: error.message
    });
  }
};

// Update semester
const updateSemester = async (req, res) => {
  try {
    const { name, number, department } = req.body;

    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return res.status(404).json({
        message: "Semester not found"
      });
    }

    // If department is being changed, verify it exists
    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      semester.department = department;
    }

    if (name) {
      semester.name = name;
    }

    if (number) {
      semester.number = number;
    }

    const updatedSemester = await semester.save();

    res.status(200).json({
      message: "Semester updated successfully",
      semester: updatedSemester
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update semester",
      error: error.message
    });
  }
};

// Delete semester
const deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return res.status(404).json({
        message: "Semester not found"
      });
    }

    await Semester.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Semester deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete semester",
      error: error.message
    });
  }
};

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester
};