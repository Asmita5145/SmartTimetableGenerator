const express = require("express");

const {
  createFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty
} = require("../controllers/facultyController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create faculty - Admin only
router.post("/", protect, adminOnly, createFaculty);
// Get all faculty - Admin only
router.get("/", protect, adminOnly, getFaculty);
// Get faculty by ID - Admin only
router.get("/:id", protect, adminOnly, getFacultyById);
// Update faculty - Admin only
router.put("/:id", protect, adminOnly, updateFaculty);
// Delete faculty - Admin only
router.delete("/:id", protect, adminOnly, deleteFaculty);

module.exports = router;