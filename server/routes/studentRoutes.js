const express = require("express");

const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
} = require("../controllers/studentController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// ADMIN - STUDENT MANAGEMENT
// =====================================================

// Get all students
router.get(
  "/",
  protect,
  adminOnly,
  getStudents
);

// Get single student
router.get(
  "/:id",
  protect,
  adminOnly,
  getStudentById
);

// Create student
router.post(
  "/",
  protect,
  adminOnly,
  createStudent
);

// Update student
router.put(
  "/:id",
  protect,
  adminOnly,
  updateStudent
);

// Delete student
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteStudent
);

module.exports = router;