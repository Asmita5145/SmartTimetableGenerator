const express = require("express");
const router = express.Router();
const {
  getCurrentInstitution,
  updateCurrentInstitution,
  getAllInstitutions,
  createInstitution
} = require("../controllers/institutionController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { resolveTenant } = require("../middleware/tenantMiddleware");

// Public/tenant-resolved read
router.get("/current", resolveTenant, getCurrentInstitution);
router.get("/", resolveTenant, getAllInstitutions);

// Protected writes
router.put("/current", protect, authorize("ADMIN"), resolveTenant, updateCurrentInstitution);
router.post("/", protect, authorize("ADMIN"), createInstitution);

module.exports = router;
