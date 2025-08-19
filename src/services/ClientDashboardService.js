const { Op } = require("sequelize");
const models = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const zenithService = require("./zenithService");

/**
 * Service for client dashboard operations
 */
class ClientDashboardService {
  /**
   * Get transaction analytics for dashboard: by game, by vendor, summary
   * @param {number} clientId
   * @returns {Object} { byGame, byVendor, summary }
   */
  async getTransactionAnalytics(clientId) {
    const { Transaction, ZenithGame, ZenithVendor } = models;
    // By Game (group by game, vendor, currency)
    const byGameRaw = await Transaction.findAll({
      where: { client_id: clientId },
      attributes: [
        "gameId",
        "vendorId",
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'bet' THEN amount ELSE 0 END`
            )
          ),
          "totalBets",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'win' THEN amount ELSE 0 END`
            )
          ),
          "totalWins",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'rollback' THEN amount ELSE 0 END`
            )
          ),
          "totalRollbacks",
        ],
        "currency",
      ],
      group: ["gameId", "vendorId", "currency"],
      raw: true,
    });

    // By Vendor (group by vendor, currency)
    const byVendorRaw = await Transaction.findAll({
      where: { client_id: clientId },
      attributes: [
        "vendorId",
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'bet' THEN amount ELSE 0 END`
            )
          ),
          "totalBets",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'win' THEN amount ELSE 0 END`
            )
          ),
          "totalWins",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'rollback' THEN amount ELSE 0 END`
            )
          ),
          "totalRollbacks",
        ],
        "currency",
      ],
      group: ["vendorId", "currency"],
      raw: true,
    });

    // Summary (group by currency)
    const summaryRaw = await Transaction.findAll({
      where: { client_id: clientId },
      attributes: [
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'bet' THEN amount ELSE 0 END`
            )
          ),
          "totalBets",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'win' THEN amount ELSE 0 END`
            )
          ),
          "totalWins",
        ],
        [
          models.sequelize.fn(
            "SUM",
            models.sequelize.literal(
              `CASE WHEN type = 'rollback' THEN amount ELSE 0 END`
            )
          ),
          "totalRollbacks",
        ],
        "currency",
      ],
      group: ["currency"],
      raw: true,
    });

    // Build lookup maps for game and vendor names
    let gameMap = {},
      vendorMap = {};
    const gameIds = [
      ...new Set(byGameRaw.map((r) => r.gameId).filter(Boolean)),
    ];
    const vendorIds = [
      ...new Set([
        ...byGameRaw.map((r) => r.vendorId).filter(Boolean),
        ...byVendorRaw.map((r) => r.vendorId).filter(Boolean),
      ]),
    ];
    if (gameIds.length) {
      const games = await ZenithGame.findAll({
        where: { id: gameIds },
        raw: true,
      });
      games.forEach((g) => {
        gameMap[g.id] = {
          name: g.gameName || g.name || `Game ${g.id}`,
          vendorId: g.vendorId,
        };
      });
    }
    if (vendorIds.length) {
      const vendors = await ZenithVendor.findAll({
        where: { id: vendorIds },
        raw: true,
      });
      vendors.forEach((v) => {
        vendorMap[v.id] = v.name || `Vendor ${v.id}`;
      });
    }

    // Group by currency
    const analyticsByCurrency = {};
    // byGame
    byGameRaw.forEach((r) => {
      const currency = r.currency || "USD";
      if (!analyticsByCurrency[currency])
        analyticsByCurrency[currency] = {
          byGame: [],
          byVendor: [],
          summary: {},
        };
      analyticsByCurrency[currency].byGame.push({
        gameId: r.gameId,
        gameName: gameMap[r.gameId]?.name || `Game ${r.gameId}`,
        vendorId: r.vendorId,
        vendorName:
          vendorMap[r.vendorId] ||
          (gameMap[r.gameId]?.vendorId
            ? vendorMap[gameMap[r.gameId].vendorId]
            : null) ||
          null,
        totalBets: Number(r.totalBets || 0),
        totalWins: Number(r.totalWins || 0),
        totalRollbacks: Number(r.totalRollbacks || 0),
        net:
          Number(r.totalBets || 0) -
          Number(r.totalWins || 0) -
          Number(r.totalRollbacks || 0),
        ggr: Number(r.totalBets || 0) - Number(r.totalWins || 0),
      });
    });
    // byVendor
    byVendorRaw.forEach((r) => {
      const currency = r.currency || "USD";
      if (!analyticsByCurrency[currency])
        analyticsByCurrency[currency] = {
          byGame: [],
          byVendor: [],
          summary: {},
        };
      analyticsByCurrency[currency].byVendor.push({
        vendorId: r.vendorId,
        vendorName: vendorMap[r.vendorId] || `Vendor ${r.vendorId}`,
        totalBets: Number(r.totalBets || 0),
        totalWins: Number(r.totalWins || 0),
        totalRollbacks: Number(r.totalRollbacks || 0),
        net:
          Number(r.totalBets || 0) -
          Number(r.totalWins || 0) -
          Number(r.totalRollbacks || 0),
        ggr: Number(r.totalBets || 0) - Number(r.totalWins || 0),
      });
    });
    // summary
    summaryRaw.forEach((r) => {
      const currency = r.currency || "USD";
      if (!analyticsByCurrency[currency])
        analyticsByCurrency[currency] = {
          byGame: [],
          byVendor: [],
          summary: {},
        };
      analyticsByCurrency[currency].summary = {
        totalBets: Number(r.totalBets || 0),
        totalWins: Number(r.totalWins || 0),
        totalRollbacks: Number(r.totalRollbacks || 0),
        net:
          Number(r.totalBets || 0) -
          Number(r.totalWins || 0) -
          Number(r.totalRollbacks || 0),
        ggr: Number(r.totalBets || 0) - Number(r.totalWins || 0),
        currency,
      };
    });

    return analyticsByCurrency;
  }
  /**
   * Get dashboard summary data for a client
   * @param {number} clientId - Client ID
   * @returns {Object} Dashboard summary data
   */
  async getDashboardSummary(clientId) {
    try {
      // Fetch client data
      const client = await models.Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Find the agent for this client (assuming one agent per client for dashboard)
      const agent = await models.Agent.findOne({
        where: { client_id: clientId, status: "active" },
        include: [{ model: models.AgentSettings, as: "settings" }],
      });

      let gamesCount = 0;
      let vendorsCount = 0;

      if (agent && agent.settings) {
        const agentId = agent.id;

        // Fetch all vendors (no limit, all pages)
        let allVendors = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const { vendors } = await zenithService.getAllVendors(
            {},
            page,
            1000,
            agentId,
            false
          );
          allVendors = allVendors.concat(vendors);
          hasMore = vendors.length === 1000;
          page += 1;
        }
        vendorsCount = allVendors.length;

        // Fetch only the total games count (no need to fetch all games)
        const { total } = await zenithService.getDashboardGames(
          agentId,
          {},
          1,
          1
        );
        gamesCount = total;
      }

      // Count agents for this client
      const agentsCount = await models.Agent.count({
        where: {
          client_id: clientId,
          status: "active",
        },
      });

      // Get billing information and outstanding balance
      const { outstandingBalance, hasUnpaidBilling, billingMessage } =
        await this.getClientBillingInfo(clientId);

      // Return summary using only allowed games/vendors
      return {
        gamesCount,
        vendorsCount,
        agentsCount,
        outstandingBalance,
        hasUnpaidBilling,
        billingMessage,
      };
    } catch (error) {
      console.error("Error in getDashboardSummary service:", error);
      throw error;
    }
  }
  /**
   * Get client billing information
   * @param {number} clientId - Client ID
   * @returns {Object} Billing information
   */
  async getClientBillingInfo(clientId) {
    try {
      let outstandingBalance = 0;
      let hasUnpaidBilling = false;
      let billingMessage = "";

      // Check client transactions for outstanding balance
      const clientTransactions = await models.ClientTransaction.findAll({
        where: { client_id: clientId },
      });

      // Calculate outstanding balance
      if (clientTransactions && clientTransactions.length > 0) {
        outstandingBalance = clientTransactions.reduce((total, tx) => {
          const amount = parseFloat(tx.amount);
          if (tx.type === "Payment") {
            return total - amount;
          } else {
            return total + Math.abs(amount);
          }
        }, 0);
      }

      // Check for unpaid billings
      const unpaidBilling = await models.ClientBilling.findOne({
        where: { client_id: clientId, status: "Unpaid" },
        order: [["due_date", "ASC"]],
      });
      if (unpaidBilling) {
        hasUnpaidBilling = true;
        billingMessage = `Outstanding invoice due on ${unpaidBilling.due_date}`;
      }

      return { outstandingBalance, hasUnpaidBilling, billingMessage };
    } catch (error) {
      console.error("Error in getClientBillingInfo service:", error);
      throw error;
    }
  }

  /**
   * Get agents data for client dashboard
   * @param {number} clientId - Client ID
   * @returns {Object} Agents data
   */
  async getAgents(clientId) {
    try {
      // Fetch agents for this client
      const agents = await models.Agent.findAll({
        where: { client_id: clientId },
        include: [
          {
            model: models.User,
            as: "user",
            attributes: ["username", "last_login"],
          },
          {
            model: models.AgentCommission,
            as: "commissions",
          },
        ],
      });

      // Format agent data for frontend
      const formattedAgents = agents.map((agent) => {
        const agentData = agent.toJSON();

        // Get average commission rate
        let commissionRate = 0;
        if (agentData.commissions && agentData.commissions.length > 0) {
          const totalRate = agentData.commissions.reduce((sum, commission) => {
            return sum + parseFloat(commission.rate);
          }, 0);
          commissionRate = totalRate / agentData.commissions.length;
        }

        return {
          id: agentData.id,
          name: agentData.name,
          username: agentData.user ? agentData.user.username : "",
          status: agentData.status,
          players: 0, // Placeholder - to be implemented with actual player count
          lastActivity: agentData.user ? agentData.user.last_login : null,
          commission: commissionRate,
        };
      });

      // Calculate stats
      const totalAgents = formattedAgents.length;
      const activeAgents = formattedAgents.filter(
        (agent) => agent.status === "active"
      ).length;

      return {
        agents: formattedAgents,
        stats: {
          totalAgents,
          activeAgents,
          totalPlayers: 0, // Placeholder - to be implemented with actual player count
        },
      };
    } catch (error) {
      console.error("Error in getAgents service:", error);
      throw error;
    }
  }

  /**
   * Get billing data for client dashboard
   * @param {number} clientId - Client ID
   * @returns {Object} Billing data
   */
  async getBillingData(clientId) {
    try {
      // Fetch client billings
      const clientBillings = await models.ClientBilling.findAll({
        where: { client_id: clientId },
        order: [["created_at", "DESC"]],
        limit: 10,
      });

      // Fetch client transactions
      const clientTransactions = await models.ClientTransaction.findAll({
        where: { client_id: clientId },
        order: [["created_at", "DESC"]],
        limit: 10,
      });

      // Format billings as invoices
      const invoices = clientBillings.map((billing) => {
        const billingData = billing.toJSON();
        return {
          id: `INV-${billingData.id}`,
          date: billingData.created_at,
          dueDate: billingData.due_date,
          amount: parseFloat(billingData.final_amount),
          status: billingData.status.toLowerCase(),
          period: billingData.label,
          description: `${billingData.game_provider} - ${billingData.month}`,
        };
      });

      // Format transactions
      const transactions = clientTransactions.map((transaction) => {
        const txData = transaction.toJSON();
        return {
          id: `TRX-${txData.id}`,
          date: txData.created_at,
          amount: Math.abs(parseFloat(txData.amount)),
          type: txData.type.toLowerCase(),
          method: txData.payment_method || "N/A",
          reference: txData.reference_number || `REF-${txData.id}`,
        };
      });

      // Calculate billing stats
      let currentBalance = 0;
      let lastPayment = 0;
      let lastPaymentDate = null;
      let nextDueDate = null;

      // Calculate current balance from transactions
      if (clientTransactions && clientTransactions.length > 0) {
        currentBalance = clientTransactions.reduce((total, tx) => {
          // Convert the amount to a number to ensure proper calculation
          const amount = parseFloat(tx.amount);

          // If it's a payment, subtract from outstanding balance
          if (tx.type === "Payment") {
            return total - amount;
          }
          // Otherwise it's a charge, add to outstanding balance
          else {
            return total + Math.abs(amount);
          }
        }, 0);
      }

      // Find last payment
      const lastPaymentTx = clientTransactions.find(
        (tx) => tx.type === "Payment"
      );
      if (lastPaymentTx) {
        lastPayment = Math.abs(parseFloat(lastPaymentTx.amount));
        lastPaymentDate = lastPaymentTx.date;
      }

      // Find next due date (earliest unpaid billing)
      const unpaidBilling = clientBillings.find(
        (billing) => billing.status === "Unpaid"
      );
      if (unpaidBilling) {
        nextDueDate = unpaidBilling.due_date;
      }

      return {
        invoices,
        transactions,
        stats: {
          currentBalance,
          lastPayment,
          lastPaymentDate,
          nextDueDate,
        },
      };
    } catch (error) {
      console.error("Error in getBillingData service:", error);
      throw error;
    }
  }
}

module.exports = new ClientDashboardService();
