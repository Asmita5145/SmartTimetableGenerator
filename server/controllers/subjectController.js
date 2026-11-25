const Subject = require("../models/Subject");
const Department = require("../models/Department");
const Semester = require("../models/Semester");

// Create subject
const createSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      department,
      semester,
      weeklyHours,
      practicalHours,
      faculty
    } = req.body;

    if (!name || !code || !type || !department || !semester || !weeklyHours) {
      return res.status(400).json({
        message: "Name, code, type, department, semester and weekly hours are required"
      });
    }

    // Check department
    const existingDepartment = await Department.findById(department);

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    // Check semester
    const existingSemester = await Semester.findById(semester);

    if (!existingSemester) {
      return res.status(404).json({
        message: "Semester not found"
      });
    }

    // Check duplicate subject code
    const existingSubject = await Subject.findOne({ code });

    if (existingSubject) {
      return res.status(400).json({
        message: "Subject with this code already exists"
      });
    }

    const subject = await Subject.create({
      name,
      code,
      type,
      department,
      semester,
      weeklyHours,
      practicalHours: practicalHours || 0,
      faculty: faculty || []
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create subject",
      error: error.message
    });
  }
};

// Get all subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("faculty", "name employeeId")
      .sort({ name: 1 });

    res.status(200).json({
      message: "Subjects fetched successfully",
      subjects
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
};

// Get subject by ID
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("faculty", "name employeeId");

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found"
      });
    }

    res.status(200).json({
      message: "Subject fetched successfully",
      subject
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch subject",
      error: error.message
    });
  }
};

// Update subject
const updateSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      department,
      semester,
      weeklyHours,
      practicalHours,
      faculty
    } = req.body;

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found"
      });
    }

    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      subject.department = department;
    }

    if (semester) {
      const existingSemester = await Semester.findById(semester);

      if (!existingSemester) {
        return res.status(404).json({
          message: "Semester not found"
        });
      }

      subject.semester = semester;
    }

    if (name) subject.name = name;
    if (code) subject.code = code;
    if (type) subject.type = type;
    if (weeklyHours) subject.weeklyHours = weeklyHours;
    if (practicalHours !== undefined) subject.practicalHours = practicalHours;
    if (faculty !== undefined) subject.faculty = faculty;

    const updatedSubject = await subject.save();

    res.status(200).json({
      message: "Subject updated successfully",
      subject: updatedSubject
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update subject",
      error: error.message
    });
  }
};

// Delete subject
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found"
      });
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Subject deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete subject",
      error: error.message
    });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
};