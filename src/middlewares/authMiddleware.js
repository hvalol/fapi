// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { AppError } = require("./errorHandler");

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No authentication token provided", 401));
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    jwt.verify(token, jwtConfig.secret, async (err, decoded) => {
      if (err) {
        return next(new AppError("Invalid or expired token", 401));
      }

      // Attach user info to request
      req.user = decoded;

      // If agent_id is present, fetch and attach the full agent record
      if (decoded.agent_id) {
        try {
          const Agent = require("../models/Agent");
          const agent = await Agent.findByPk(decoded.agent_id);
          if (agent) {
            req.user.agent = agent.toJSON();
          }
        } catch (agentErr) {
          // If agent fetch fails, continue without agent context
        }
      }
      next();
    });
  } catch (error) {
    next(new AppError("Authentication error", 401));
  }
};

module.exports = { authenticate };
