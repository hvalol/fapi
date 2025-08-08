const express = require("express");
const adminDashboardController = require("../controllers/adminDashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// All admin routes require authentication and Admin role
router.use(authenticate);
router.use(authorize("Admin"));

// Dashboard summary (main dashboard stats)
router.get("/summary", adminDashboardController.getDashboardSummary);

// Games and vendors data
router.get("/games-vendors", adminDashboardController.getGamesAndVendors);

// Agents data
router.get("/agents", adminDashboardController.getAgents);

// Billing data
router.get("/billing", adminDashboardController.getBillingData);

// Transactions data (placeholder for future implementation)
router.get("/transactions", adminDashboardController.getTransactions);

// Logs data for admin
router.get("/logs", adminDashboardController.getLogs);
// Logs data for clients
router.get("/client-logs", adminDashboardController.getAllClientLogs);

module.exports = router;
