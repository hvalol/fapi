const express = require("express");
const clientDashboardController = require("../controllers/clientDashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Dashboard summary (main dashboard stats)
router.get("/summary", clientDashboardController.getDashboardSummary);

// Games and vendors data
router.get("/games-vendors", clientDashboardController.getGamesAndVendors);

// Agents data
router.get("/agents", clientDashboardController.getAgents);

// Billing data
router.get("/billing", clientDashboardController.getBillingData);

// Transactions data (placeholder for future implementation)
router.get("/transactions", clientDashboardController.getTransactions);

// Logs data (placeholder for future implementation)
router.get("/logs", clientDashboardController.getLogs);

module.exports = router;
