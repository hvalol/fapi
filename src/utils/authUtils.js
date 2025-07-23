// src/utils/authUtils.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const jwtConfig = require("../config/jwt");

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign({ id: userId, email, role }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

// Hash password (since bcrypt was mentioned as not used)
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
};

// Verify password
const verifyPassword = (password, hashedPassword) => {
  const [salt, hash] = hashedPassword.split(":");
  const calculatedHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === calculatedHash;
};

// Generate API key for agents
const generateApiKey = () => {
  const prefix = "ag";
  const randomPart = crypto.randomBytes(12).toString("hex");
  return `${prefix}_${randomPart}`;
};

// Generate API secret for agents
const generateApiSecret = () => {
  return crypto.randomBytes(24).toString("hex");
};
module.exports = {
  generateToken,
  hashPassword,
  verifyPassword,
  generateApiKey,
  generateApiSecret,
};
