// src/routes/userRoutes.js
const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get("/", authorize("Admin"), userController.getAllUsers);

// Get user by ID (Admin or own user)
router.get("/:id", userController.getUserById);

// Create user (Admin only)
router.post(
  "/",
  [
    authorize("Admin"),
    loggingMiddleware(),
    body("username").notEmpty().withMessage("Username is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["Admin", "ClientAdmin", "Agent", "SubAgent"])
      .withMessage("Invalid role"),
    validateRequest,
  ],
  userController.createUser
);

// Update user (Admin or own user)
router.put(
  "/:id",
  [
    loggingMiddleware(),
    body("username")
      .optional()
      .notEmpty()
      .withMessage("Username cannot be empty"),
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["Admin", "ClientAdmin", "Agent", "SubAgent"])
      .withMessage("Invalid role"),
    validateRequest,
  ],
  userController.updateUser
);

// Delete user (Admin only)
router.delete(
  "/:id",
  authorize("Admin"),
  loggingMiddleware(),
  userController.deleteUser
);

// Change password (own user)
router.post(
  "/change-password",
  [
    loggingMiddleware(),
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters"),
    validateRequest,
  ],
  userController.changePassword
);

module.exports = router;
