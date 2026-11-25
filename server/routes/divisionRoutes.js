const express = require("express");

const {
  createDivision,
  getDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision
} = require("../controllers/divisionController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create division
router.post("/", protect, adminOnly, createDivision);

// Get all divisions
router.get("/", protect, adminOnly, getDivisions);

// Get division by ID
router.get("/:id", protect, adminOnly, getDivisionById);

// Update division
router.put("/:id", protect, adminOnly, updateDivision);

// Delete division
router.delete("/:id", protect, adminOnly, deleteDivision);

module.exports = router;