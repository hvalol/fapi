// src/routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// Login route with validation
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
    validateRequest,
  ],
  authController.login
);

// Validate token route
router.get("/validate-token", authenticate, authController.validateToken);

module.exports = router;
