const { AppError } = require("../middlewares/errorHandler");
const clientDashboardService = require("../services/clientDashboardService");

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

/**
 * Placeholder for logs data (future implementation)
 */
exports.getLogs = async (req, res, next) => {
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
