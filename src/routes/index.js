// src/routes/index.js
const express = require("express");
const authRoutes = require("./authRoutes");

const router = express.Router();

// API routes
router.use("/auth", authRoutes);

// Add additional routes here

module.exports = router;
