// src/routes/index.js
const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const clientRoutes = require("./clientRoutes");
const agentRoutes = require("./agentRoutes");
const clientBillingRoutes = require("./clientBillingRoutes");
const zenithRoutes = require("./zenithRoutes");
const adminBillingRoutes = require("./adminBillingRoutes");
const clientDashboardRoutes = require("./clientDashboardRoutes");
const logsRoutes = require("./logsRoutes");
const adminDashboardRoutes = require("./adminDashboardRoutes");
const transactionRoutes = require("./transactionRoutes");
const router = express.Router();

const publicApiRoutes = require("./publicApi");
// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/agents", agentRoutes);
router.use("/client-billing", clientBillingRoutes);
router.use("/zenith", zenithRoutes);
router.use("/admin/client-billing", adminBillingRoutes);
router.use("/client/dashboard", clientDashboardRoutes);
router.use("/logs", logsRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/transactions", transactionRoutes);
router.use("/public", publicApiRoutes);

// Add additional routes here as they're implemented

module.exports = router;
