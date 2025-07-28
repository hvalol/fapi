// src/routes/clientBillingRoutes.js
const express = require("express");
const { body } = require("express-validator");
const clientBillingController = require("../controllers/clientBillingController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

const router = express.Router();

// All client billing routes require authentication
router.use(authenticate);

// Get all clients billing (Admin only)
router.get(
  "/",
  authorize("Admin"),
  clientBillingController.getAllClientBilling
);

// Get client billing by ID (Admin or client's own admin)
router.get("/:id", clientBillingController.getClientBillingById);

// Add charge to client (Admin only)
router.post(
  "/:id/charges",
  [
    authorize("Admin"),
    body("type")
      .notEmpty()
      .isIn(["Share Due", "Deposit", "Penalty", "Adjustment"])
      .withMessage("Invalid charge type"),
    body("amount")
      .notEmpty()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number"),
    validateRequest,
  ],
  clientBillingController.addCharge
);

// Record payment for client (Admin only)
router.post(
  "/:id/payments",
  [
    authorize("Admin"),
    body("amount")
      .notEmpty()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number"),
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    validateRequest,
  ],
  clientBillingController.recordPayment
);

// Generate billing statement (Admin or client's own admin)
router.get("/:id/statement", clientBillingController.generateBillingStatement);

// Create billing record (Admin only)
router.post(
  "/:id/billings",
  [
    authorize("Admin"),
    body("month")
      .notEmpty()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("Month must be in YYYY-MM format"),
    body("label").notEmpty().withMessage("Label is required"),
    body("totalGGR")
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Total GGR must be a non-negative number"),
    body("shareAmount")
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Share amount must be a non-negative number"),
    body("sharePercentage")
      .notEmpty()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Share percentage must be between 0 and 100"),
    validateRequest,
  ],
  clientBillingController.createBilling
);

module.exports = router;
