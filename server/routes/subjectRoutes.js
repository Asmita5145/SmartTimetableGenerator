const express = require("express");

const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
} = require("../controllers/subjectController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create subject - Admin only
router.post("/", protect, adminOnly, createSubject);
// Get all subjects - Admin only
router.get("/", protect, adminOnly, getSubjects);
// Get subject by ID - Admin only
router.get("/:id", protect, adminOnly, getSubjectById);
// Update subject - Admin only
router.put("/:id", protect, adminOnly, updateSubject);
// Delete subject - Admin only
router.delete("/:id", protect, adminOnly, deleteSubject);

module.exports = router;