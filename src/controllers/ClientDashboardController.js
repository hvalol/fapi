const { AppError } = require("../middlewares/errorHandler");
const clientDashboardService = require("../services/clientDashboardService");
const { Op } = require("sequelize");
const { LoggingService } = require("../services");
/**
 * Get dashboard summary data for the authenticated client
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return next(new AppError("No client associated with this user", 400));
    }

    const dashboardData = await clientDashboardService.getDashboardSummary(
      clientId
    );

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
 * Get games and vendors data for the client dashboard
 */
exports.getGamesAndVendors = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return next(new AppError("No client associated with this user", 400));
    }

    const data = await clientDashboardService.getGamesAndVendors(clientId);

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
 * Get agents data for the client dashboard
 */
exports.getAgents = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return next(new AppError("No client associated with this user", 400));
    }

    const data = await clientDashboardService.getAgents(clientId);

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
 * Get billing data for the client dashboard
 */
exports.getBillingData = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return next(new AppError("No client associated with this user", 400));
    }

    const data = await clientDashboardService.getBillingData(clientId);

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

exports.getLogs = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return next(new AppError("No client associated with this user", 400));
    }

    const filters = {
      client_id: clientId,
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

    const logs = await LoggingService.getClientLogs({
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
    console.error("Client logs error:", error);
    next(error.statusCode ? error : new AppError(error.message, 500));
  }
};
