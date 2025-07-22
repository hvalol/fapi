// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { AppError } = require("./errorHandler");

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No authentication token provided", 401));
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        return next(new AppError("Invalid or expired token", 401));
      }

      // Attach user info to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(new AppError("Authentication error", 401));
  }
};

module.exports = { authenticate };
