// Install cookie-parser first:
// npm install cookie-parser

// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { errorHandler } = require("./middlewares/errorHandler");
const apiRoutes = require("./routes");

// Initialize express app
const app = express();

// Middleware
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN || "*",
//     credentials: true, // Allow cookies to be sent across domains
//   })
// );

// Configure CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Important for cookies
  })
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser
app.use(morgan("dev"));

// API routes
app.use("/api/v1", apiRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
