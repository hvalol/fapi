const { Transaction, TransactionAudit } = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const agentService = require("./agentService");
const clientService = require("./clientService");
const { fn, col, literal, Op } = require("sequelize");

// TODO: CHANGE user_id TO PLAYERID
exports.logTransaction = async (data, transaction) => {
  const {
    externalTransactionId,
    provider,
    type,
    amount,
    currency,
    status,
    player_id,
    roundId,
    metadata,
    aggregatorName,
    rawPayload,
  } = data;

  // Basic validation example (expand as needed)
  if (
    !provider ||
    !type ||
    !amount ||
    !currency ||
    !status ||
    !player_id ||
    !aggregatorName ||
    !rawPayload
  ) {
    throw new AppError("Missing required transaction fields", 400);
  }

  // Create Transaction
  const trx = await Transaction.create(
    {
      externalTransactionId,
      provider,
      type,
      amount,
      currency,
      status,
      player_id,
      roundId,
      metadata,
    },
    { transaction }
  );

  // Create TransactionAudit
  await TransactionAudit.create(
    {
      transactionId: trx.id,
      aggregatorName,
      rawPayload,
    },
    { transaction }
  );

  return trx;
};

exports.getTransactions = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters.agentId) {
    where.agentId = filters.agentId;
  }
  if (filters.playerId) {
    where.player_id = filters.playerId;
  }
  if (filters.vendorId) {
    where.vendorId = filters.vendorId;
  }
  if (filters.gameId) {
    where.gameId = filters.gameId;
  }
  if (filters.startDate && filters.endDate) {
    where.created_at = {
      [Op.between]: [filters.startDate, filters.endDate],
    };
  } else if (filters.startDate) {
    where.created_at = {
      [Op.gte]: filters.startDate,
    };
  } else if (filters.endDate) {
    where.created_at = {
      [Op.lte]: filters.endDate,
    };
  }

  const result = await Transaction.findAndCountAll({
    where,
    offset,
    limit,
    order: [["created_at", "DESC"]],
  });

  // Collect unique agentIds and clientIds
  const agentIds = [
    ...new Set(result.rows.map((trx) => trx.agentId).filter(Boolean)),
  ];
  const clientIds = [
    ...new Set(result.rows.map((trx) => trx.clientId).filter(Boolean)),
  ];

  // Fetch agent and client details in parallel
  const [agents, clients] = await Promise.all([
    agentIds.length
      ? agentService.getAllAgents({}) // get all agents, then filter
      : [],
    clientIds.length ? clientService.getAllClients({}) : [],
  ]);

  // Build lookup maps
  const agentMap = {};
  agents.forEach((agent) => {
    agentMap[agent.id] = agent.name;
  });
  const clientMap = {};
  clients.forEach((client) => {
    clientMap[client.id] = client.name;
  });

  // Attach agentName and clientName to each transaction
  const transactionsWithNames = result.rows.map((trx) => {
    const trxObj = trx.toJSON();
    trxObj.agentName = agentMap[trx.agentId] || null;
    trxObj.clientName = clientMap[trx.clientId] || null;
    return trxObj;
  });

  return {
    count: result.count,
    rows: transactionsWithNames,
  };
};
exports.getTransactionById = async (id) => {
  if (!id) {
    throw new AppError("Transaction ID is required", 400);
  }
  const transaction = await Transaction.findByPk(id, {
    include: [
      {
        model: TransactionAudit,
        as: "audits",
      },
    ],
  });
  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }
  return transaction;
};

exports.getAggregatedTransactions = async (
  page = 1,
  limit = 20,
  filters = {},
  groupBy
) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.clientId) where.client_id = filters.clientId;
  if (filters.agentId) where.agent_id = filters.agentId;
  if (filters.playerId) where.player_id = filters.playerId;
  if (filters.vendorId) where.vendor_id = filters.vendorId;
  if (filters.gameId) where.game_id = filters.gameId;
  if (filters.startDate && filters.endDate) {
    where.created_at = { [Op.between]: [filters.startDate, filters.endDate] };
  } else if (filters.startDate) {
    where.created_at = { [Op.gte]: filters.startDate };
  } else if (filters.endDate) {
    where.created_at = { [Op.lte]: filters.endDate };
  }

  let group = [];
  let attributes = [];
  let order = [];

  switch (groupBy) {
    case "day":
      group = [fn("DATE", col("created_at")), "currency"];
      attributes = [
        [fn("DATE", col("created_at")), "date"],
        "currency",
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "totalBets",
        ],
        [
          fn("SUM", literal(`CASE WHEN type = 'win' THEN amount ELSE 0 END`)),
          "totalWins",
        ],
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'rollback' THEN amount ELSE 0 END`)
          ),
          "totalRollbacks",
        ],
        [fn("COUNT", col("id")), "rounds"],
        [fn("COUNT", fn("DISTINCT", col("player_id"))), "uniquePlayers"],
      ];
      order = [[fn("DATE", col("created_at")), "DESC"]];
      break;
    case "game":
      group = ["gameId", "vendorId", "currency"];
      attributes = [
        "gameId",
        "vendorId",
        "currency",
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "totalBets",
        ],
        [
          fn("SUM", literal(`CASE WHEN type = 'win' THEN amount ELSE 0 END`)),
          "totalWins",
        ],
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'rollback' THEN amount ELSE 0 END`)
          ),
          "totalRollbacks",
        ],
        [fn("COUNT", col("id")), "rounds"],
        [fn("COUNT", fn("DISTINCT", col("player_id"))), "uniquePlayers"],
      ];
      order = [
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "DESC",
        ],
      ];
      break;
    case "vendor":
      group = ["vendorId", "currency"];
      attributes = [
        "vendorId",
        "currency",
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "totalBets",
        ],
        [
          fn("SUM", literal(`CASE WHEN type = 'win' THEN amount ELSE 0 END`)),
          "totalWins",
        ],
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'rollback' THEN amount ELSE 0 END`)
          ),
          "totalRollbacks",
        ],
        [fn("COUNT", col("id")), "rounds"],
        [fn("COUNT", fn("DISTINCT", col("player_id"))), "uniquePlayers"],
      ];
      order = [
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "DESC",
        ],
      ];
      break;
    case "player":
      group = ["playerId", "currency"];
      attributes = [
        "playerId",
        "currency",
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "totalBets",
        ],
        [
          fn("SUM", literal(`CASE WHEN type = 'win' THEN amount ELSE 0 END`)),
          "totalWins",
        ],
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'rollback' THEN amount ELSE 0 END`)
          ),
          "totalRollbacks",
        ],
        [fn("COUNT", col("id")), "rounds"],
      ];
      order = [
        [
          fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
          "DESC",
        ],
      ];
      break;
    default:
      throw new AppError("Invalid groupBy parameter", 400);
  }

  // Main query
  const { count, rows } = await Transaction.findAndCountAll({
    where,
    attributes,
    group,
    order,
    offset,
    limit,
    raw: true,
  });

  // Compute summary (totals for all filtered data)
  const summaryData = await Transaction.findAll({
    where,
    attributes: [
      [
        fn("SUM", literal(`CASE WHEN type = 'bet' THEN amount ELSE 0 END`)),
        "totalBets",
      ],
      [
        fn("SUM", literal(`CASE WHEN type = 'win' THEN amount ELSE 0 END`)),
        "totalWins",
      ],
      [
        fn(
          "SUM",
          literal(`CASE WHEN type = 'rollback' THEN amount ELSE 0 END`)
        ),
        "totalRollbacks",
      ],
    ],
    raw: true,
  });

  const summary = summaryData[0] || {};

  // Add net and ggr to each row
  const resultRows = rows.map((row) => {
    const net =
      Number(row.totalBets || 0) -
      Number(row.totalWins || 0) -
      Number(row.totalRollbacks || 0);
    const ggr = Number(row.totalBets || 0) - Number(row.totalWins || 0);
    return { ...row, net, ggr };
  });

  return {
    rows: resultRows,
    total: Array.isArray(count) ? count.length : count,
    summary: {
      totalBets: Number(summary.totalBets || 0),
      totalWins: Number(summary.totalWins || 0),
      totalRollbacks: Number(summary.totalRollbacks || 0),
      net:
        Number(summary.totalBets || 0) -
        Number(summary.totalWins || 0) -
        Number(summary.totalRollbacks || 0),
      ggr: Number(summary.totalBets || 0) - Number(summary.totalWins || 0),
      currency:
        filters.currency ||
        (resultRows.length > 0 ? resultRows[0].currency : "") ||
        "",
    },
  };
};
