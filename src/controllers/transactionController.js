const { sequelize } = require("../models");
const transactionService = require("../services/transactionService");
const { toCamel } = require("../utils/caseConverter");
// TODO: CHANGE USER_ID TO PLAYER_ID
exports.logTransaction = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const trx = await transactionService.logTransaction(req.body, t);
    await t.commit();
    return res.status(201).json({ success: true, transactionId: trx.id });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};

    // Log incoming query params
    console.log("Incoming query params:", req.query);

    if (req.query.client_id) {
      filters.clientId = parseInt(req.query.client_id);
    }
    if (req.query.agent_id) {
      filters.agentId = parseInt(req.query.agent_id);
    }
    if (req.query.player_id) {
      filters.playerId = parseInt(req.query.player_id);
    }
    if (req.query.vendor_id) {
      filters.vendorId = parseInt(req.query.vendor_id);
    }
    if (req.query.game_id) {
      filters.gameId = parseInt(req.query.game_id);
    }
    if (req.query.start_date) {
      filters.startDate = new Date(req.query.start_date);
    }
    if (req.query.end_date) {
      filters.endDate = new Date(req.query.end_date);
    }

    // Log filters object
    console.log("Filters used for query:", filters);

    const { count, rows } = await transactionService.getTransactions(
      page,
      limit,
      filters
    );

    return res.json({
      success: true,
      total: count,
      page,
      pageCount: Math.ceil(count / limit),
      transactions: toCamel(rows),
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await transactionService.getTransactionById(id);

    return res.json({ success: true, transaction: toCamel(transaction) });
  } catch (error) {
    next(error);
  }
};

exports.getAggregatedTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const groupBy = req.query.groupBy;
    const filters = {};

    if (req.query.client_id) filters.clientId = parseInt(req.query.client_id);
    if (req.query.agent_id) filters.agentId = parseInt(req.query.agent_id);
    if (req.query.player_id) filters.playerId = parseInt(req.query.player_id);
    if (req.query.vendor_id) filters.vendorId = parseInt(req.query.vendor_id);
    if (req.query.game_id) filters.gameId = parseInt(req.query.game_id);
    if (req.query.start_date)
      filters.startDate = new Date(req.query.start_date);
    if (req.query.end_date) filters.endDate = new Date(req.query.end_date);

    const result = await transactionService.getAggregatedTransactions(
      page,
      limit,
      filters,
      groupBy
    );

    return res.json({
      success: true,
      ...toCamel(result),
    });
  } catch (error) {
    next(error);
  }
};
