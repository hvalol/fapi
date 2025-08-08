// src/routes/agentRoutes.js
const express = require("express");
const { body } = require("express-validator");
const agentController = require("../controllers/agentController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

const router = express.Router();

// All agent routes require authentication
router.use(authenticate);

// Get all agents (Admin and ClientAdmin)
router.get(
  "/",
  authorize("Admin", "ClientAdmin"),
  agentController.getAllAgents
);

// Get agent hierarchy (Admin and ClientAdmin)
router.get(
  "/hierarchy",
  authorize("Admin", "ClientAdmin"),
  agentController.getAgentHierarchy
);

// Get agent by ID (Admin and ClientAdmin)
router.get(
  "/:id",
  authorize("Admin", "ClientAdmin"),
  agentController.getAgentById
);

// Create agent (Admin and ClientAdmin)
router.post(
  "/",
  [
    authorize("Admin", "ClientAdmin"),
    loggingMiddleware(),
    body("name").notEmpty().withMessage("Agent name is required"),
    body("code").notEmpty().withMessage("Agent code is required"),
    body("client_id").isInt().withMessage("Client ID must be an integer"),
    // Updated profile validation - removed email, phone, address, contact_person
    body("profile.notes").optional(),
    body("profile.timezone").optional(),
    validateRequest,
  ],
  agentController.createAgent
);

// Update agent (Admin and ClientAdmin)
router.put(
  "/:id",
  [
    authorize("Admin", "ClientAdmin"),
    loggingMiddleware(),
    // Updated profile validation - removed email, phone, address, contact_person
    body("profile.notes").optional(),
    body("profile.timezone").optional(),
    validateRequest,
  ],
  agentController.updateAgent
);

// Update agent commissions (Admin and ClientAdmin)
router.put(
  "/:id/commissions",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  agentController.updateAgentCommissions
);

// Deactivate agent (Admin and ClientAdmin)
router.put(
  "/:id/deactivate",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  agentController.deactivateAgent
);

// Regenerate API credentials (Admin and ClientAdmin)
router.post(
  "/:id/regenerate-credentials",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  agentController.regenerateApiCredentials
);

router.post(
  "/:agentId/bet-limit",
  authorize("Admin", "ClientAdmin"),
  require("../controllers/agentController").setProviderBetLimit
);

module.exports = router;
