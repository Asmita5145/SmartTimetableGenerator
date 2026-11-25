const express = require("express");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require("../controllers/departmentController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create department - Admin only
router.post("/", protect, adminOnly, createDepartment);
// Get all departments - Admin only
router.get("/", protect, adminOnly, getDepartments);
// Get single department - Admin only
router.get("/:id", protect, adminOnly, getDepartmentById);
// Update department - Admin only
router.put("/:id", protect, adminOnly, updateDepartment);
// Delete department - Admin only
router.delete("/:id", protect, adminOnly, deleteDepartment);

module.exports = router;