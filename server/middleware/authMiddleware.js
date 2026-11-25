const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message:
          "Not authorized, token missing",
      });
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message:
          "Not authorized, token missing",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is missing from .env"
      );

      return res.status(500).json({
        message:
          "Server authentication configuration error",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error(
      "AUTHENTICATION ERROR:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message:
          "Session expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message:
          "Not authorized, invalid token",
      });
    }

    return res.status(401).json({
      message:
        "Not authorized, invalid token",
    });
  }
};

const adminOnly = (
  req,
  res,
  next
) => {
  if (
    req.user &&
    ["ADMIN", "HOD", "COORDINATOR"].includes(req.user.role)
  ) {
    return next();
  }

  return res.status(403).json({
    message:
      "Admin or management access required",
  });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: role '${req.user?.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  adminOnly,
  authorize,
};