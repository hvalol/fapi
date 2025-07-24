const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const { verifyPassword } = require("../utils/authUtils");
const jwtConfig = require("../config/jwt");

/**
 * Service for handling authentication-related operations
 */
class AuthService {
  /**
   * Authenticate a user and generate access and refresh tokens
   * @param {string} username - User username
   * @param {string} password - User password
   * @returns {Object} User data and tokens
   */
  async login(username, password) {
    // Find user by username
    const user = await User.findOne({ where: { username } });

    if (!user) {
      throw new AppError("Invalid username or password", 401);
    }

    // Verify password
    const passwordIsValid = verifyPassword(password, user.password);

    if (!passwordIsValid) {
      throw new AppError("Invalid username or password", 401);
    }

    // Check if user is active
    if (user.status !== "active") {
      throw new AppError("Your account is not active", 403);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    user.last_login = new Date();
    await user.save();

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        client_id: user.client_id,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate a short-lived JWT access token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        client_id: user.client_id,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  /**
   * Generate a long-lived JWT refresh token
   * @param {Object} user - User object
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, tokenType: "refresh" },
      jwtConfig.refreshSecret || jwtConfig.secret,
      { expiresIn: jwtConfig.refreshExpiresIn || "7d" }
    );
  }

  /**
   * Refresh access token using a valid refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token and user data
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(
        refreshToken,
        jwtConfig.refreshSecret || jwtConfig.secret
      );

      // Check if it's a refresh token
      if (decoded.tokenType !== "refresh") {
        throw new AppError("Invalid token type", 401);
      }

      // Get user
      const user = await User.findByPk(decoded.id);

      if (!user) {
        throw new AppError("User not found", 401);
      }

      if (user.status !== "active") {
        throw new AppError("User account is not active", 403);
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          client_id: user.client_id,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error.name === "TokenExpiredError") {
        throw new AppError("Refresh token expired", 401);
      }

      throw new AppError("Invalid refresh token", 401);
    }
  }

  /**
   * Validate the user's access token
   * @param {number} userId - User ID from token
   * @returns {Object} User data
   */
  async validateToken(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (user.status !== "active") {
      throw new AppError("User account is not active", 403);
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      client_id: user.client_id,
    };
  }

  /**
   * Invalidate a user's refresh tokens
   * In a real implementation, this would add tokens to a blacklist
   * or invalidate them in a database
   * @param {number} userId - User ID
   * @returns {boolean} Success flag
   */
  async logout(userId) {
    // For a complete implementation, you might want to:
    // 1. Store the token in a blacklist (Redis or DB)
    // 2. Set an expiry on the blacklist entry matching the token's expiry

    // For now, we'll just return success
    return true;
  }
}

module.exports = new AuthService();
