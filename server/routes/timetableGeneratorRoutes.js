const express = require("express");

const router = express.Router();

const {
  generateTimetable,
} = require("../controllers/timetableGeneratorController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");


// Generate timetable
router.post(
  "/generate",
  protect,
  adminOnly,
  generateTimetable
);

module.exports = router;