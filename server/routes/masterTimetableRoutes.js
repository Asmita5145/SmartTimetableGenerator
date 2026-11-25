const express = require("express");

const {
  getMasterTimetables,
  getMasterTimetableById,
  getLatestMaster,
  generateMaster,
} = require("../controllers/masterTimetableController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/latest",
  protect,
  getLatestMaster
);

router.post(
  "/generate",
  protect,
  adminOnly,
  generateMaster
);

router.get(
  "/",
  protect,
  getMasterTimetables
);

router.get(
  "/:id",
  protect,
  getMasterTimetableById
);

module.exports = router;
