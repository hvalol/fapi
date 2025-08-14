const { Op } = require("sequelize");
const models = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const zenithService = require("./zenithService");

/**
 * Service for client dashboard operations
 */
class ClientDashboardService {
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

        // Fetch all games for allowed vendors (no limit, all pages)
        const allowedVendorIds = allVendors.map((v) => v.id);
        let allGames = [];
        page = 1;
        hasMore = true;
        while (hasMore) {
          const { games } = await zenithService.getAllGames(
            { vendor_id: { [Op.in]: allowedVendorIds } },
            page,
            1000,
            agentId,
            false
          );
          allGames = allGames.concat(games);
          hasMore = games.length === 1000;
          page += 1;
        }
        gamesCount = allGames.length;
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

      if (clientTransactions && clientTransactions.length > 0) {
        // Calculate outstanding balance from transactions
        outstandingBalance = clientTransactions.reduce((total, tx) => {
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

      // Check for outstanding balance and unpaid billings
      if (outstandingBalance > 0) {
        hasUnpaidBilling = true;

        // Find the earliest due billing to display in message
        const clientBillings = await models.ClientBilling.findAll({
          where: {
            client_id: clientId,
            status: "Unpaid",
          },
          order: [["date_posted", "ASC"]],
        });

        if (clientBillings && clientBillings.length > 0) {
          // Get the earliest due date for message
          const earliestBilling = clientBillings[0];
          const dueDate = new Date(earliestBilling.date_posted);
          // Format date as MM/DD/YYYY
          const formattedDate = dueDate.toLocaleDateString();
          billingMessage = `You have unpaid billings due on ${formattedDate}`;
        } else {
          billingMessage = "You have outstanding balance that requires payment";
        }
      }

      return {
        outstandingBalance,
        hasUnpaidBilling,
        billingMessage,
      };
    } catch (error) {
      console.error("Error in getClientBillingInfo service:", error);
      throw error;
    }
  }

  /**
   * Get games and vendors data for client dashboard
   * @param {number} clientId - Client ID
   * @returns {Object} Games and vendors data
   */
  async getGamesAndVendors(clientId, options = {}) {
    try {
      // Find the agent for this client (assuming one agent per client for dashboard)
      const agent = await models.Agent.findOne({
        where: { client_id: clientId, status: "active" },
        include: [{ model: models.AgentSettings, as: "settings" }],
      });
      if (!agent || !agent.settings) {
        return { games: [], vendors: [] };
      }
      const agentId = agent.id;

      const filters = options.filters || {};

      // Fetch all vendors (no limit, all pages)
      let allVendors = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { vendors } = await zenithService.getAllVendors(
          filters.vendor || {},
          page,
          1000,
          agentId,
          false
        );
        allVendors = allVendors.concat(vendors);
        hasMore = vendors.length === 1000;
        page += 1;
      }

      // Only get games for allowed vendors
      const allowedVendorIds = allVendors.map((v) => v.id);

      // Merge any additional filters for games
      const gamesFilters = {
        ...(filters.game || {}),
        vendor_id: { [Op.in]: allowedVendorIds },
      };

      // Fetch all games (no limit, all pages)
      let allGames = [];
      page = 1;
      hasMore = true;
      while (hasMore) {
        const { games } = await zenithService.getAllGames(
          gamesFilters,
          page,
          1000,
          agentId,
          false
        );
        allGames = allGames.concat(games);
        hasMore = games.length === 1000;
        page += 1;
      }

      // Create a map of vendorId to games for quick lookup
      const gamesByVendorId = {};
      allGames.forEach((game) => {
        const vendorId = game.vendor_id || (game.vendor && game.vendor.id);
        if (!vendorId) return;
        if (!gamesByVendorId[vendorId]) gamesByVendorId[vendorId] = [];
        gamesByVendorId[vendorId].push(game);
      });

      // Format games data for frontend
      const formattedGames = allGames.map((game) => ({
        id: game.id,
        name: game.gameName,
        vendor: game.vendor ? game.vendor.name : "Unknown",
        category: game.categoryCode || "Uncategorized",
        popular: false,
        status: game.is_disabled ? "inactive" : "active",
      }));

      // Format vendors data for frontend, with correct gamesCount
      const formattedVendors = allVendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        gamesCount: Array.isArray(gamesByVendorId[vendor.id])
          ? gamesByVendorId[vendor.id].length
          : 0,
        status: vendor.is_disabled ? "inactive" : "active",
        categories:
          Array.isArray(vendor.categories) && vendor.categories.length > 0
            ? vendor.categories
            : ["General"],
      }));

      return {
        games: formattedGames,
        vendors: formattedVendors,
      };
    } catch (error) {
      console.error("Error in getGamesAndVendors service:", error);
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
        order: [["date_posted", "DESC"]],
        limit: 10,
      });

      // Fetch client transactions
      const clientTransactions = await models.ClientTransaction.findAll({
        where: { client_id: clientId },
        order: [["date", "DESC"]],
        limit: 10,
      });

      // Format billings as invoices
      const invoices = clientBillings.map((billing) => {
        const billingData = billing.toJSON();
        return {
          id: `INV-${billingData.id}`,
          date: billingData.date_posted,
          dueDate: new Date(
            new Date(billingData.date_posted).setDate(
              new Date(billingData.date_posted).getDate() + 30
            )
          ), // Due date is 30 days after posting
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
          date: txData.date,
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
        // Due date is 30 days after posting
        nextDueDate = new Date(
          new Date(unpaidBilling.date_posted).setDate(
            new Date(unpaidBilling.date_posted).getDate() + 30
          )
        );
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
