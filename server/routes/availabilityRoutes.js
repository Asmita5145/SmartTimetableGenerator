const express = require("express");

const {
  createAvailability,
  getAvailabilities,
  getAvailabilityByResource,
  updateAvailability,
  deleteAvailability,
  generateStandardAvailability
} = require("../controllers/availabilityController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create availability - Admin only
router.post("/", protect, adminOnly, createAvailability);
router.post("/generate-standard", protect, adminOnly, generateStandardAvailability);
// Get all availability records - Admin only
router.get("/", protect, adminOnly, getAvailabilities);
// Get availability by resource - Admin only
router.get(
  "/:resourceType/:resourceId",
  protect,
  adminOnly,
  getAvailabilityByResource
);
// Update availability - Admin only
router.put("/:id", protect, adminOnly, updateAvailability);
// Delete availability - Admin only
router.delete("/:id", protect, adminOnly, deleteAvailability);

module.exports = router;