const { User, Client } = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const { hashPassword, verifyPassword } = require("../utils/authUtils");

/**
 * Service for user management operations
 */
class UserService {
  /**
   * Get all users with optional filtering
   * @param {Object} filters - Filters to apply
   * @returns {Array} List of users
   */
  async getAllUsers(filters = {}) {
    const query = {};

    // Apply filters if provided
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.client_id) query.client_id = filters.client_id;

    return User.findAll({
      where: query,
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "name", "status"],
        },
      ],
    });
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Object} User data
   */
  async getUserById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "name", "status"],
        },
      ],
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  async createUser(userData) {
    const { username, password, role, status, client_id } = userData;

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new AppError("Username already in use", 400);
    }

    // If client_id is provided, check if client exists
    if (client_id) {
      const client = await Client.findByPk(client_id);
      if (!client) {
        throw new AppError("Client not found", 404);
      }
    }

    // Create user
    const hashedPassword = hashPassword(password);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || "ClientAdmin",
      status: status || "active",
      client_id,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  /**
   * Update an existing user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Object} Updated user
   */
  async updateUser(id, userData) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { username, password, role, status, client_id } = userData;

    // Check if username is being changed and if it's already in use
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        throw new AppError("Username already in use", 400);
      }
    }

    // If client_id is provided, check if client exists
    if (client_id && client_id !== user.client_id) {
      const client = await Client.findByPk(client_id);
      if (!client) {
        throw new AppError("Client not found", 404);
      }
    }

    // Update user fields
    if (username) user.username = username;
    if (password) user.password = hashPassword(password);
    if (role) user.role = role;
    if (status) user.status = status;
    if (client_id !== undefined) user.client_id = client_id;

    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Delete a user (soft delete by setting status to inactive)
   * @param {number} id - User ID
   * @returns {boolean} Success flag
   */
  async deleteUser(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Soft delete by setting status to inactive
    user.status = "inactive";
    await user.save();

    return true;
  }

  /**
   * Change user's password
   * @param {number} id - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success flag
   */
  async changePassword(id, currentPassword, newPassword) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify current password
    const isPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    // Update password
    user.password = hashPassword(newPassword);
    await user.save();

    return true;
  }
}

module.exports = new UserService();
