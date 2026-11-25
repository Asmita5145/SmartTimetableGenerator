const express = require("express");

const {
  createTimeSlot,
  generateStandardTimeSlots,
  getTimeSlots
} = require("../controllers/timeSlotController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create a single time slot - Admin only
router.post("/", protect, adminOnly, createTimeSlot);
// Generate standard Monday-Friday time slots - Admin only
router.post("/generate-standard", protect, adminOnly, generateStandardTimeSlots);
// Get all time slots - Admin only
router.get("/", protect, adminOnly, getTimeSlots);

module.exports = router;