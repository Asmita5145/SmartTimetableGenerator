const express = require("express");

const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} = require("../controllers/roomController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// Create room - Admin only
router.post("/", protect, adminOnly, createRoom);
// Get all rooms - Admin only
router.get("/", protect, adminOnly, getRooms);
// Get room by ID - Admin only
router.get("/:id", protect, adminOnly, getRoomById);
// Update room - Admin only
router.put("/:id", protect, adminOnly, updateRoom);
// Delete room - Admin only
router.delete("/:id", protect, adminOnly, deleteRoom);

module.exports = router;