// src/routes/clientBillingRoutes.js
const express = require("express");
const { body } = require("express-validator");
const clientBillingController = require("../controllers/clientBillingController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

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
    loggingMiddleware(),
    body("type")
      .notEmpty()
      .isIn(["Share Due", "Deposit", "Penalty", "Adjustment"])
      .withMessage("Invalid charge type"),
    body("amount")
      .notEmpty()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number"),
    body("depositType")
      .if(body("type").equals("Deposit"))
      .isIn(["security", "additional"])
      .withMessage(
        "For deposit type, depositType must be 'security' or 'additional'"
      ),
    body("gameProvider")
      .if(body("type").equals("Share Due"))
      .notEmpty()
      .withMessage("Game provider is required for Share Due charges"),

    // Option 1: Using currencyDetails (multi-currency support)
    body("currencyDetails")
      .if(body("type").equals("Share Due"))
      .custom((value, { req }) => {
        // If currencyDetails is provided, it should be an array
        if (value !== undefined) {
          if (!Array.isArray(value)) {
            throw new Error("currencyDetails must be an array");
          }

          // Allow empty array only if we have currency & exchangeRate fields as fallback
          if (
            value.length === 0 &&
            (!req.body.currency || !req.body.exchangeRate)
          ) {
            throw new Error("At least one currency detail is required");
          }

          // Validate each currency detail
          value.forEach((detail, index) => {
            if (
              !detail.currency ||
              typeof detail.currency !== "string" ||
              detail.currency.length !== 3
            ) {
              throw new Error(
                `Currency at index ${index} must be a 3-letter code`
              );
            }

            if (
              !detail.ggrAmount ||
              isNaN(parseFloat(detail.ggrAmount)) ||
              parseFloat(detail.ggrAmount) <= 0
            ) {
              throw new Error(
                `GGR amount at index ${index} must be a positive number`
              );
            }

            if (
              !detail.exchangeRate ||
              isNaN(parseFloat(detail.exchangeRate)) ||
              parseFloat(detail.exchangeRate) <= 0
            ) {
              throw new Error(
                `Exchange rate at index ${index} must be a positive number`
              );
            }
          });
        }
        return true;
      }),

    // Option 2: Using currency & exchangeRate (backward compatibility)
    body("currency")
      .if(body("type").equals("Share Due"))
      .custom((value, { req }) => {
        // Only validate if currencyDetails is not provided
        if (!req.body.currencyDetails || !req.body.currencyDetails.length) {
          if (!value || typeof value !== "string" || value.length !== 3) {
            throw new Error("Currency must be a 3-letter code (e.g., USD)");
          }
        }
        return true;
      }),

    body("exchangeRate")
      .if(body("type").equals("Share Due"))
      .custom((value, { req }) => {
        // Only validate if currencyDetails is not provided
        if (!req.body.currencyDetails || !req.body.currencyDetails.length) {
          if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
            throw new Error("Exchange rate must be a positive number");
          }
        }
        return true;
      }),

    // Validate other Share Due specific fields
    body("sharePercentage")
      .if(body("type").equals("Share Due"))
      .notEmpty()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Share percentage must be between 0 and 100"),

    body("platformFee")
      .if(body("type").equals("Share Due"))
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Platform fee must be a non-negative number"),

    validateRequest,
  ],
  clientBillingController.addCharge
);

// Record payment for client (Admin only)
router.post(
  "/:id/payments",
  [
    authorize("Admin"),
    loggingMiddleware(),
    body("amount")
      .notEmpty()
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number"),
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    // Match the field name to what frontend sends
    body("referenceNumber")
      .optional()
      .isString()
      .withMessage("Reference number must be a string"),
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
    loggingMiddleware(),
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
