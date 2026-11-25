const express = require("express");

const {
  registerUser,
  loginUser,
  assignStudentDivision,
} = require("../controllers/authController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// PUBLIC ROUTES
// =====================================================

router.post(
  "/register",
  registerUser
);

router.post(
  "/login",
  loginUser
);

// =====================================================
// PROTECTED USER ROUTES
// =====================================================

router.get("/profile", protect, async (req, res) => {
  try {
    const User = require("../models/User");

    const user = await User.findById(req.user._id)
      .select("-password")
      .populate({
        path: "division",
        populate: {
          path: "semester",
          populate: {
            path: "department",
            select: "name code"
          }
        }
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      user
    });

  } catch (error) {
    console.error("Profile error:", error);

    res.status(500).json({
      message: "Failed to fetch profile",
      error: error.message
    });
  }
});

// =====================================================
// ADMIN TEST
// =====================================================

router.get(
  "/admin-test",
  protect,
  adminOnly,
  (req, res) => {
    res.status(200).json({
      message:
        "Admin access granted",
      user: req.user,
    });
  }
);

// =====================================================
// ADMIN - ASSIGN STUDENT DIVISION
// =====================================================

router.put(
  "/assign-division",
  protect,
  adminOnly,
  assignStudentDivision
);

module.exports = router;