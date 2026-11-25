const express = require("express");

const {
  generateSemesterTimetable,
  getLatestSemesterTimetable,
} = require("../controllers/cseSemesterTimetableController");

const router = express.Router();

/*
  Generate CSE semester timetable
  POST /api/cse-semester-timetables/generate
*/
router.post(
  "/generate",
  generateSemesterTimetable
);

/*
  Get latest timetable
  GET /api/cse-semester-timetables/latest
*/
router.get(
  "/latest",
  getLatestSemesterTimetable
);

module.exports = router;