const express = require("express");

const {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester
} = require("../controllers/semesterController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create semester - Admin only
router.post("/", protect, adminOnly, createSemester);
// Get all semesters - Admin only
router.get("/", protect, adminOnly, getSemesters);
// Get single semester - Admin only
router.get("/:id", protect, adminOnly, getSemesterById);
// Update semester - Admin only
router.put("/:id", protect, adminOnly, updateSemester);
// Delete semester - Admin only
router.delete("/:id", protect, adminOnly, deleteSemester);

module.exports = router;