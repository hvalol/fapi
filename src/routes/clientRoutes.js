// src/routes/clientRoutes.js
const express = require("express");
const { body } = require("express-validator");
const clientController = require("../controllers/clientController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

const router = express.Router();

// All client routes require authentication
router.use(authenticate);

// Get all clients (Admin only)
router.get("/", authorize("Admin"), clientController.getAllClients);

// Get client by ID (Admin or client admin of the specific client)
router.get("/:id", clientController.getClientById);

// Create client (Admin only)
router.post(
  "/",
  [
    authorize("Admin"),
    loggingMiddleware(),
    body("name").notEmpty().withMessage("Client name is required"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "pending"])
      .withMessage("Invalid status"),
    body("contact_email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format"),
    validateRequest,
  ],
  clientController.createClient
);

// Update client (Admin only)
router.put(
  "/:id",
  [
    authorize("Admin"),
    loggingMiddleware(),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Client name cannot be empty"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "pending"])
      .withMessage("Invalid status"),
    body("contact_email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format"),
    validateRequest,
  ],
  clientController.updateClient
);

// Delete client (Admin only)
router.delete(
  "/:id",
  authorize("Admin"),
  loggingMiddleware(),
  clientController.deleteClient
);

module.exports = router;
