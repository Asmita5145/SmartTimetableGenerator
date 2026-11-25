const Faculty = require("../models/Faculty");
const Department = require("../models/Department");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Create faculty
const createFaculty = async (req, res) => {
  try {
    const {
      name,
      employeeId,
      email,
      department,
      designation,
      password
    } = req.body;

    if (!name || !employeeId || !department) {
      return res.status(400).json({
        message: "Name, employee ID and department are required"
      });
    }

    // Check department
    const existingDepartment = await Department.findById(department);

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    // Check duplicate employee ID
    const existingFaculty = await Faculty.findOne({ employeeId });

    if (existingFaculty) {
      return res.status(400).json({
        message: "Faculty with this employee ID already exists"
      });
    }

    const cleanEmail = (email || `${employeeId.toLowerCase()}@dacoe.ac.in`).toLowerCase().trim();

    // Check or create linked User account
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const plainPassword = password || "faculty123";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      user = await User.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: "FACULTY",
        department: existingDepartment._id,
        institution: existingDepartment.institution || null,
        programme: "B.Tech"
      });
    } else {
      user.role = "FACULTY";
      user.department = existingDepartment._id;
      if (existingDepartment.institution) user.institution = existingDepartment.institution;
    }

    const faculty = await Faculty.create({
      name,
      employeeId,
      email: cleanEmail,
      department: existingDepartment._id,
      institution: existingDepartment.institution || null,
      designation: designation || "Assistant Professor",
      user: user._id
    });

    user.facultyProfile = faculty._id;
    await user.save();

    res.status(201).json({
      message: "Faculty created successfully with linked user account",
      faculty
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create faculty",
      error: error.message
    });
  }
};

// Get all faculty
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .populate("department", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Faculty fetched successfully",
      faculty
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch faculty",
      error: error.message
    });
  }
};

// Get faculty by ID
const getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate("department", "name code");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    res.status(200).json({
      message: "Faculty fetched successfully",
      faculty
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch faculty",
      error: error.message
    });
  }
};

// Update faculty
const updateFaculty = async (req, res) => {
  try {
    const {
      name,
      employeeId,
      email,
      department,
      designation
    } = req.body;

    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      faculty.department = department;
    }

    if (name) faculty.name = name;
    if (employeeId) faculty.employeeId = employeeId;
    if (email !== undefined) faculty.email = email;
    if (designation !== undefined) faculty.designation = designation;

    const updatedFaculty = await faculty.save();

    res.status(200).json({
      message: "Faculty updated successfully",
      faculty: updatedFaculty
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update faculty",
      error: error.message
    });
  }
};

// Delete faculty
const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found"
      });
    }

    await Faculty.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Faculty deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete faculty",
      error: error.message
    });
  }
};

module.exports = {
  createFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty
};