const User = require("../models/User");
const Division = require("../models/Division");
const Faculty = require("../models/Faculty");
const Institution = require("../models/Institution");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// =====================================================
// REGISTER USER
// Public registration creates STUDENT by default
// =====================================================
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = "STUDENT", department, semester, division, batch, rollNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists"
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: ["ADMIN", "FACULTY", "STUDENT"].includes(role) ? role : "STUDENT",
      department: department || null,
      semester: semester || null,
      division: division || null,
      batch: batch || null,
      rollNumber: rollNumber || null
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        division: user.division,
        batch: user.batch,
        rollNumber: user.rollNumber,
        facultyProfile: user.facultyProfile
      }
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
};

// =====================================================
// LOGIN USER
// Supports ADMIN, FACULTY, STUDENT
// =====================================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail })
      .populate("institution", "name code tagline address programmes defaultProgramme")
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("facultyProfile", "name employeeId designation additionalResponsibilities");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Ensure institution is resolved
    let institutionObj = user.institution;
    if (!institutionObj) {
      institutionObj = await Institution.findOne();
      if (!institutionObj) {
        institutionObj = await Institution.create({
          name: "Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad",
          code: "DACOE",
          tagline: "Department of Computer Science & Engineering • B.Tech Programme",
          address: "Vidyanagar Ext. Banawadi, Karad 415124, Dist. Satara, Maharashtra",
          programmes: ["B.Tech", "M.Tech", "Diploma"],
          defaultProgramme: "B.Tech",
          academicYear: "2026-27"
        });
      }
      user.institution = institutionObj._id;
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        division: user.division,
        batch: user.batch,
        rollNumber: user.rollNumber,
        programme: user.programme || "B.Tech",
        institution: institutionObj,
        facultyProfile: user.facultyProfile
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
};

// =====================================================
// GET CURRENT USER PROFILE
// =====================================================
const getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user._id)
      .select("-password")
      .populate("institution", "name code tagline address programmes defaultProgramme")
      .populate("department", "name code")
      .populate("semester", "name number")
      .populate("division", "name studentCount")
      .populate("facultyProfile", "name employeeId designation additionalResponsibilities");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.institution) {
      const defaultInst = await Institution.findOne();
      if (defaultInst) {
        user.institution = defaultInst;
      }
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
};

// =====================================================
// ASSIGN STUDENT TO DIVISION
// =====================================================
const assignStudentDivision = async (req, res) => {
  try {
    const { studentId, divisionId } = req.body;

    if (!studentId || !divisionId) {
      return res.status(400).json({
        message: "Student ID and division ID are required"
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    if (student.role !== "STUDENT") {
      return res.status(400).json({
        message: "Selected user is not a student"
      });
    }

    const division = await Division.findById(divisionId);
    if (!division) {
      return res.status(404).json({
        message: "Division not found"
      });
    }

    student.division = division._id;
    await student.save();

    return res.status(200).json({
      message: "Student division assigned successfully",
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        division: student.division
      }
    });
  } catch (error) {
    console.error("ASSIGN DIVISION ERROR:", error);
    return res.status(500).json({
      message: "Failed to assign student division",
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  assignStudentDivision
};
