const Division = require("../models/Division");
const Semester = require("../models/Semester");

// Create division
const createDivision = async (req, res) => {
  try {
    const { name, semester, studentCount } = req.body;

    if (!name || !semester || !studentCount) {
      return res.status(400).json({
        message: "Division name, semester and student count are required"
      });
    }

    const existingSemester = await Semester.findById(semester);

    if (!existingSemester) {
      return res.status(404).json({
        message: "Semester not found"
      });
    }

    const existingDivision = await Division.findOne({
      name,
      semester
    });

    if (existingDivision) {
      return res.status(400).json({
        message: "This division already exists for this semester"
      });
    }

    const division = await Division.create({
      name,
      semester,
      studentCount
    });

    res.status(201).json({
      message: "Division created successfully",
      division
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create division",
      error: error.message
    });
  }
};

// Get all divisions
const getDivisions = async (req, res) => {
  try {
    const divisions = await Division.find()
      .populate({
        path: "semester",
        select: "name number",
        populate: {
          path: "department",
          select: "name code"
        }
      })
      .sort({ name: 1 });

    res.status(200).json({
      message: "Divisions fetched successfully",
      divisions
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch divisions",
      error: error.message
    });
  }
};

// Get division by ID
const getDivisionById = async (req, res) => {
  try {
    const division = await Division.findById(req.params.id)
      .populate({
        path: "semester",
        select: "name number",
        populate: {
          path: "department",
          select: "name code"
        }
      });

    if (!division) {
      return res.status(404).json({
        message: "Division not found"
      });
    }

    res.status(200).json({
      message: "Division fetched successfully",
      division
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch division",
      error: error.message
    });
  }
};

// Update division
const updateDivision = async (req, res) => {
  try {
    const { name, semester, studentCount } = req.body;

    const division = await Division.findById(req.params.id);

    if (!division) {
      return res.status(404).json({
        message: "Division not found"
      });
    }

    if (semester) {
      const existingSemester = await Semester.findById(semester);

      if (!existingSemester) {
        return res.status(404).json({
          message: "Semester not found"
        });
      }

      division.semester = semester;
    }

    if (name) {
      division.name = name;
    }

    if (studentCount !== undefined) {
      division.studentCount = studentCount;
    }

    const updatedDivision = await division.save();

    res.status(200).json({
      message: "Division updated successfully",
      division: updatedDivision
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update division",
      error: error.message
    });
  }
};

// Delete division
const deleteDivision = async (req, res) => {
  try {
    const division = await Division.findById(req.params.id);

    if (!division) {
      return res.status(404).json({
        message: "Division not found"
      });
    }

    await Division.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Division deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete division",
      error: error.message
    });
  }
};

module.exports = {
  createDivision,
  getDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision
};