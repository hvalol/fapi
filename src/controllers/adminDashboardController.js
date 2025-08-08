const { AppError } = require("../middlewares/errorHandler");
const adminDashboardService = require("../services/AdminDashboardService");
const { Op } = require("sequelize");
const { LoggingService } = require("../services");

/**
 * Get dashboard summary data for admin (global)
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const dashboardData = await adminDashboardService.getDashboardSummary();

    res.status(200).json({
      status: "success",
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    next(error);
  }
};

/**
 * Get games and vendors data for the admin dashboard (global)
 */
exports.getGamesAndVendors = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getGamesAndVendors();

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Games and vendors error:", error);
    next(error);
  }
};

/**
 * Get agents data for the admin dashboard (global)
 */
exports.getAgents = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getAgents();

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Agents error:", error);
    next(error);
  }
};

/**
 * Get billing data for the admin dashboard (global)
 */
exports.getBillingData = async (req, res, next) => {
  try {
    const data = await adminDashboardService.getBillingData();

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Billing error:", error);
    next(error);
  }
};

/**
 * Placeholder for transaction data (future implementation)
 */
exports.getTransactions = async (req, res, next) => {
  try {
    res.status(200).json({
      status: "success",
      message: "Feature will be available in a future update",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs for admin (global)
 */
exports.getLogs = async (req, res, next) => {
  try {
    const filters = {
      // Only add date filters if they exist
      ...(req.query.from_date && {
        created_at: {
          [Op.gte]: new Date(req.query.from_date),
        },
      }),
      ...(req.query.to_date && {
        created_at: {
          [Op.lte]: new Date(req.query.to_date),
        },
      }),
      // Only add action_type if it's provided
      ...(req.query.action_type && { action_type: req.query.action_type }),
    };

    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const logs = await LoggingService.getAdminLogs({
      filters,
      limit,
      page,
    });

    res.status(200).json({
      status: "success",
      data: logs.rows,
      total: logs.count,
      page,
    });
  } catch (error) {
    console.error("Admin logs error:", error);
    next(error.statusCode ? error : new AppError(error.message, 500));
  }
};

exports.getAllClientLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const logs = await LoggingService.getAllClientLogs({
      limit,
      page,
    });

    res.status(200).json({
      status: "success",
      data: logs.rows,
      total: logs.count,
      page,
    });
  } catch (error) {
    console.error("All client logs error:", error);
    next(error.statusCode ? error : new AppError(error.message, 500));
  }
};
