const { Op } = require("sequelize");
const LoggingService = require("../services/loggingService");
const LogArchivalService = require("../services/logArchivalService");
const { AppError } = require("../middlewares/errorHandler");

class LogsController {
  // Get admin logs with filtering
  static async getAdminLogs(req, res, next) {
    try {
      const filters = {
        ...(req.query.action && { action: req.query.action }),
        ...(req.query.action_type && { action_type: req.query.action_type }),
        ...(req.query.user_id && { admin_id: req.query.user_id }),
        ...(req.query.target_type && { target_type: req.query.target_type }),
        ...(req.query.from_date && {
          created_at: {
            [Op.gte]: new Date(req.query.from_date),
          },
        }),
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        page: req.query.page ? parseInt(req.query.page) : 1,
      };

      const logs = await LoggingService.getAdminLogs(filters);
      res.json({
        success: true,
        data: logs.rows,
        total: logs.count,
        page: filters.page,
      });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  // Get client logs with filtering
  static async getClientLogs(req, res, next) {
    try {
      const filters = {
        client_id: req.params.clientId,
        ...(req.query.action && { action: req.query.action }),
        ...(req.query.action_type && { action_type: req.query.action_type }),
        ...(req.query.user_id && { user_id: req.query.user_id }),
        ...(req.query.target_type && { target_type: req.query.target_type }),
        ...(req.query.from_date && {
          created_at: {
            [Op.gte]: new Date(req.query.from_date),
          },
        }),
      };

      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const page = req.query.page ? parseInt(req.query.page) : 1;

      const logs = await LoggingService.getClientLogs({ filters, limit, page });
      res.json({
        success: true,
        data: logs.rows,
        total: logs.count,
        page,
      });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  // Manual archival
  static async triggerAdminLogsArchival(req, res, next) {
    try {
      const daysToKeep = parseInt(req.query.days, 10) || 30;
      const batchSize = parseInt(req.query.batchSize, 10) || 1000;

      const result = await LogArchivalService.archiveAdminLogs(
        daysToKeep,
        batchSize
      );

      // Log this admin action
      await LoggingService.logAdminAction({
        userId: req.user.id,
        action: "MANUAL_ADMIN_LOGS_ARCHIVAL",
        action_type: "System",
        details: { daysKept: daysToKeep, batchSize, archived: result.archived },
        ipAddress: req.ip,
        targetType: "ADMIN_LOGS",
      });

      res.json({
        success: true,
        message: `Successfully archived ${result.archived} admin logs`,
        data: result,
      });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }

  static async triggerClientLogsArchival(req, res, next) {
    try {
      const daysToKeep = parseInt(req.query.days, 10) || 30;
      const batchSize = parseInt(req.query.batchSize, 10) || 1000;

      const result = await LogArchivalService.archiveClientLogs(
        daysToKeep,
        batchSize
      );

      // Log this admin action
      await LoggingService.logAdminAction({
        userId: req.user.id,
        action: "MANUAL_CLIENT_LOGS_ARCHIVAL",
        action_type: "System",
        details: { daysKept: daysToKeep, batchSize, archived: result.archived },
        ipAddress: req.ip,
        targetType: "CLIENT_LOGS",
      });

      res.json({
        success: true,
        message: `Successfully archived ${result.archived} client logs`,
        data: result,
      });
    } catch (error) {
      next(new AppError(error.message, 500));
    }
  }
}

module.exports = LogsController;
