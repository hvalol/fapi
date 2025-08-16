const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// All transaction routes require authentication
router.use(authenticate);

// Log a new transaction (Admin, ClientAdmin, Agent, SubAgent)
router.post(
  "/",
  authorize("Admin", "ClientAdmin", "Agent", "SubAgent"),
  transactionController.logTransaction
);

// Get paginated transactions (Admin, ClientAdmin, Agent, SubAgent)
router.get(
  "/",
  authorize("Admin", "ClientAdmin", "Agent", "SubAgent"),
  transactionController.getTransactions
);

router.get(
  "/aggregate",
  authorize("Admin", "ClientAdmin", "Agent", "SubAgent"),
  transactionController.getAggregatedTransactions
);

// Get transaction by ID with audits (Admin, ClientAdmin, Agent, SubAgent)
router.get(
  "/:id",
  authorize("Admin", "ClientAdmin", "Agent", "SubAgent"),
  transactionController.getTransactionById
);

module.exports = router;
