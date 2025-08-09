const express = require("express");
const { body } = require("express-validator");
const adminBillingController = require("../controllers/adminBillingController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

const router = express.Router();

// All admin billing routes require authentication and Admin role
router.use(authenticate);
router.use(authorize("Admin"));

// Get all clients billing summary
router.get("/", adminBillingController.getAllClientsBillingSummary);

// Get detailed billing for a specific client
router.get("/:id", adminBillingController.getClientBillingDetails);

// Add charge to client
router.post(
  "/:id/charges",
  loggingMiddleware(),
  [
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
  adminBillingController.addCharge
);

// Record payment for client
router.post(
  "/:id/payments",
  loggingMiddleware(),
  [
    body("amount")
      .notEmpty()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number"),
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    validateRequest,
  ],
  adminBillingController.recordPayment
);

// Generate billing statement for client
router.get(
  "/:id/statement",
  loggingMiddleware(),
  adminBillingController.generateBillingStatement
);

// Create billing record for client
router.post(
  "/:id/billings",
  loggingMiddleware(),
  [
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
  adminBillingController.createBilling
);

module.exports = router;
