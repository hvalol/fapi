// src/routes/index.js
const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const clientRoutes = require("./clientRoutes");
const agentRoutes = require("./agentRoutes");
const clientBillingRoutes = require("./clientBillingRoutes");
const zenithRoutes = require("./zenithRoutes");

const router = express.Router();

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/agents", agentRoutes);
router.use("/client-billing", clientBillingRoutes);
router.use("/vendors", zenithRoutes);

// Add additional routes here as they're implemented

module.exports = router;
