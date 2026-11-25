const User = require("../models/User");
const Department = require("../models/Department");
const Semester = require("../models/Semester");
const Division = require("../models/Division");
const bcrypt = require("bcryptjs");

// GET ALL STUDENTS
const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "STUDENT" })
      .select("-password")
      .populate({
        path: "department",
        select: "name code"
      })
      .populate({
        path: "semester",
        select: "name number"
      })
      .populate({
        path: "division",
        select: "name studentCount semester",
        populate: {
          path: "semester",
          select: "name number"
        }
      })
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      message: "Failed to fetch students"
    });
  }
};

// GET STUDENT BY ID
const getStudentById = async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: "STUDENT"
    })
      .select("-password")
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount");

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    res.json({ student });
  } catch (error) {
    console.error("Get student error:", error);

    res.status(500).json({
      message: "Failed to fetch student"
    });
  }
};

// CREATE STUDENT
const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      semester,
      division,
      batch,
      rollNumber
    } = req.body;

    if (!name || !email || !password || !department || !semester) {
      return res.status(400).json({
        message:
          "Name, email, password, department and semester are required."
      });
    }

    const existingStudent = await User.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        message: "A user with this email already exists."
      });
    }

    const departmentExists = await Department.findById(department);

    if (!departmentExists) {
      return res.status(404).json({
        message: "Department not found."
      });
    }

    const semesterExists = await Semester.findOne({
      _id: semester,
      department
    });

    if (!semesterExists) {
      return res.status(400).json({
        message: "Selected semester does not belong to this department."
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
          message:
            "Selected division does not belong to the selected semester."
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "STUDENT",
      department,
      semester,
      division: division || null,
      batch: batch ? batch.trim().toUpperCase() : null,
      rollNumber: rollNumber ? rollNumber.trim() : null,
      institution: departmentExists.institution || null,
      programme: "B.Tech"
    });

    const populatedStudent = await User.findById(student._id)
      .select("-password")
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount");

    res.status(201).json({
      message: "Student created successfully.",
      student: populatedStudent
    });
  } catch (error) {
    console.error("Create student error:", error);

    res.status(500).json({
      message: "Failed to create student."
    });
  }
};

// UPDATE STUDENT
const updateStudent = async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: "STUDENT"
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    const {
      name,
      email,
      password,
      department,
      semester,
      division,
      batch,
      rollNumber
    } = req.body;

    if (!name || !email || !department || !semester) {
      return res.status(400).json({
        message:
          "Name, email, department and semester are required."
      });
    }

    const duplicate = await User.findOne({
      email,
      _id: { $ne: student._id }
    });

    if (duplicate) {
      return res.status(400).json({
        message: "Another user already uses this email."
      });
    }

    const departmentExists = await Department.findById(department);

    if (!departmentExists) {
      return res.status(404).json({
        message: "Department not found."
      });
    }

    const semesterExists = await Semester.findOne({
      _id: semester,
      department
    });

    if (!semesterExists) {
      return res.status(400).json({
        message: "Selected semester does not belong to this department."
      });
    }

    if (division) {
      const divisionExists = await Division.findOne({
        _id: division,
        semester
      });

      if (!divisionExists) {
        return res.status(400).json({
          message:
            "Selected division does not belong to the selected semester."
        });
      }
    }

    student.name = name;
    student.email = email;
    student.department = department;
    student.semester = semester;
    student.division = division || null;
    if (batch !== undefined) student.batch = batch ? batch.trim().toUpperCase() : null;
    if (rollNumber !== undefined) student.rollNumber = rollNumber ? rollNumber.trim() : null;

    if (password) {
      student.password = await bcrypt.hash(password, 10);
    }

    await student.save();

    const populatedStudent = await User.findById(student._id)
      .select("-password")
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount");

    res.json({
      message: "Student updated successfully.",
      student: populatedStudent
    });
  } catch (error) {
    console.error("Update student error:", error);

    res.status(500).json({
      message: "Failed to update student."
    });
  }
};

// DELETE STUDENT
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: "STUDENT"
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    await User.findByIdAndDelete(student._id);

    res.json({
      message: "Student deleted successfully."
    });
  } catch (error) {
    console.error("Delete student error:", error);

    res.status(500).json({
      message: "Failed to delete student."
    });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};