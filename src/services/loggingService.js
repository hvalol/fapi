const { AdminLogs, ClientLogs } = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const userService = require("./userService");

class LoggingService {
  static validateLogData(data) {
    const validActionTypes = ["AUTHENTICATION", "UPDATE", "ACCESS"];

    if (!validActionTypes.includes(data.action_type?.toUpperCase())) {
      throw new AppError("Invalid action type", 400);
    }

    if (!data.action || typeof data.action !== "string") {
      throw new AppError("Action is required and must be a string", 400);
    }

    if (data.details) {
      try {
        if (typeof data.details === "string") {
          JSON.parse(data.details);
        } else {
          JSON.stringify(data.details);
        }
      } catch {
        throw new AppError("Invalid details format", 400);
      }
    }

    return {
      ...data,
      action_type: data.action_type.toUpperCase(),
    };
  }

  static async logAdminAction(logData) {
    try {
      const validatedData = this.validateLogData(logData);
      return await AdminLogs.create(validatedData);
    } catch (error) {
      console.error("Admin logging error:", error);
      // Don't throw - logging shouldn't break main functionality

      return null;
    }
  }

  static async logClientAction(logData) {
    try {
      const validatedData = this.validateLogData(logData);
      return await ClientLogs.create(validatedData);
    } catch (error) {
      console.error("Client logging error:", error);
      // Don't throw - logging shouldn't break main functionality
      return null;
    }
  }

  static async getAdminLogs({ filters, limit, page }) {
    try {
      const validatedFilters = {
        ...filters,
        action_type: filters.action_type?.toUpperCase(),
      };

      const logs = await AdminLogs.findAndCountAll({
        where: validatedFilters,
        limit: Math.min(limit || 10, 100),
        offset: ((page || 1) - 1) * (limit || 10),
        order: [["created_at", "DESC"]],
      });

      // Get usernames for all admin_ids
      const userIds = [...new Set(logs.rows.map((log) => log.admin_id))];
      const users = await Promise.all(
        userIds.map((id) => userService.getUserById(id).catch(() => null))
      );
      const userMap = users.reduce((map, user) => {
        if (user) map[user.id] = user.username;
        return map;
      }, {});

      // Add username to each log entry
      const enhancedLogs = logs.rows.map((log) => ({
        ...log.toJSON(),
        username: userMap[log.admin_id] || "Unknown User",
      }));

      return {
        rows: enhancedLogs,
        count: logs.count,
      };
    } catch (error) {
      throw new AppError(
        `Error fetching admin logs: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Get client logs with filters
   * @param {Object} options
   * @param {Object} options.filters - Query filters
   * @param {number} options.limit - Number of records to return
   * @param {number} options.page - Page number
   */
  static async getClientLogs({ filters, limit, page }) {
    try {
      const cleanFilters = Object.entries(filters || {}).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            if (
              key === "action_type" &&
              ["AUTHENTICATION", "UPDATE", "ACCESS"].includes(
                value.toUpperCase()
              )
            ) {
              acc[key] = value.toUpperCase();
            } else {
              acc[key] = value;
            }
          }
          return acc;
        },
        {}
      );

      const logs = await ClientLogs.findAndCountAll({
        where: cleanFilters,
        limit: Math.min(limit || 10, 100),
        offset: ((page || 1) - 1) * (limit || 10),
        order: [["created_at", "DESC"]],
      });

      // Get usernames for all user_ids
      const userIds = [
        ...new Set(logs.rows.map((log) => log.user_id).filter((id) => id)),
      ];
      const users = await Promise.all(
        userIds.map((id) => userService.getUserById(id).catch(() => null))
      );
      const userMap = users.reduce((map, user) => {
        if (user) map[user.id] = user.username;
        return map;
      }, {});

      // Add username to each log entry
      const enhancedLogs = logs.rows.map((log) => ({
        ...log.toJSON(),
        username: log.user_id
          ? userMap[log.user_id] || "Unknown User"
          : "System",
      }));

      return {
        rows: enhancedLogs,
        count: logs.count,
      };
    } catch (error) {
      console.error("Detailed client logs error:", error);
      throw new AppError(
        `Error fetching client logs: ${error.message}`,
        error.statusCode || 500
      );
    }
  }
}

module.exports = LoggingService;
