const express = require("express");

const {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  updateTimetableEntry,
  deleteTimetable,
  validateTimetableById,
  publishTimetable,
  getMyTimetable,
  generateTimetableByConfig,
  generateDepartment,
  getFacultyTimetable,
  getMyFacultySchedule,
  getRoomTimetable,
  getDepartmentOverview,
  getWorkloadReport,
  validateBatches
} = require("../controllers/timetableController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Department generation & Department reports
router.post(
  "/department/generate",
  protect,
  adminOnly,
  generateDepartment
);

router.get(
  "/department/overview",
  protect,
  adminOnly,
  getDepartmentOverview
);

router.get(
  "/department/workload",
  protect,
  adminOnly,
  getWorkloadReport
);

router.post(
  "/validate-batches",
  protect,
  adminOnly,
  validateBatches
);

// Faculty & Room schedules
router.get(
  "/faculty-me",
  protect,
  getMyFacultySchedule
);

router.get(
  "/faculty/:facultyId",
  protect,
  getFacultyTimetable
);

router.get(
  "/room/:roomId",
  protect,
  getRoomTimetable
);

// Single division / semester generate
router.post(
  "/generate",
  protect,
  adminOnly,
  generateTimetableByConfig
);

// Basic CRUD
router.post(
  "/",
  protect,
  adminOnly,
  createTimetable
);

router.get(
  "/",
  protect,
  adminOnly,
  getTimetables
);

router.get(
  "/student/my",
  protect,
  getMyTimetable
);

router.post(
  "/:id/validate",
  protect,
  adminOnly,
  validateTimetableById
);

router.post(
  "/:id/publish",
  protect,
  adminOnly,
  publishTimetable
);

router.get(
  "/:id",
  protect,
  adminOnly,
  getTimetableById
);

router.put(
  "/:id/entries/:entryId",
  protect,
  adminOnly,
  updateTimetableEntry
);

router.put(
  "/:id",
  protect,
  adminOnly,
  updateTimetable
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteTimetable
);

module.exports = router;
