const express = require("express");

const {
  validateMasterTimetableController,
} = require(
  "../controllers/cseMasterTimetableController"
);

const router = express.Router();

// Validate multiple semesters together
router.post(
  "/validate",
  validateMasterTimetableController
);

module.exports = router;