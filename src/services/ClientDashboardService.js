const { Op } = require("sequelize");
const models = require("../models");
const { AppError } = require("../middlewares/errorHandler");

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

      // Initialize default dashboard data
      const dashboardData = {
        gamesCount: 0,
        vendorsCount: 0,
        agentsCount: 0,
        outstandingBalance: 0,
        hasUnpaidBilling: false,
        billingMessage: "",
      };

      // Count Zenith games
      const zenithGamesCount = await models.ZenithGame.count({
        where: {
          is_active: true,
          is_disabled: false,
        },
      });
      dashboardData.gamesCount = zenithGamesCount;

      // Count Zenith vendors
      const zenithVendorsCount = await models.ZenithVendor.count({
        where: {
          is_active: true,
          is_disabled: false,
        },
      });
      dashboardData.vendorsCount = zenithVendorsCount;

      // Count agents for this client
      const agentsCount = await models.Agent.count({
        where: {
          client_id: clientId,
          status: "active",
        },
      });
      dashboardData.agentsCount = agentsCount;

      // Get billing information and outstanding balance
      const { outstandingBalance, hasUnpaidBilling, billingMessage } =
        await this.getClientBillingInfo(clientId);

      // Update dashboard data with billing info
      dashboardData.outstandingBalance = outstandingBalance;
      dashboardData.hasUnpaidBilling = hasUnpaidBilling;
      dashboardData.billingMessage = billingMessage;

      return dashboardData;
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
  async getGamesAndVendors(clientId) {
    try {
      // Fetch games from ZenithGame model
      const zenithGames = await models.ZenithGame.findAll({
        where: {
          is_active: true,
        },
        include: [
          {
            model: models.ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
            where: {
              is_active: true,
              is_disabled: false,
            },
          },
        ],
        limit: 100,
      });

      // Fetch vendors from ZenithVendor model
      const zenithVendors = await models.ZenithVendor.findAll({
        where: {
          is_active: true,
        },
        include: [
          {
            model: models.ZenithGame,
            as: "games",
            where: {
              is_active: true,
            },
            required: false,
          },
        ],
      });

      // Format games data for frontend
      const games = zenithGames.map((game) => {
        const gameData = game.toJSON();

        return {
          id: gameData.id,
          name: gameData.gameName,
          vendor: gameData.vendor ? gameData.vendor.name : "Unknown",
          category: gameData.categoryCode || "Uncategorized",
          popular: false, // Could be enhanced with real data in the future
          status: gameData.is_disabled ? "inactive" : "active",
        };
      });

      // Format vendors data for frontend
      const vendors = zenithVendors.map((vendor) => {
        const vendorData = vendor.toJSON();
        // Parse category codes from comma-separated string if present
        let categories = [];
        if (vendorData.categoryCode) {
          categories = vendorData.categoryCode
            .split(",")
            .map((cat) => cat.trim());
        }

        return {
          id: vendorData.id,
          name: vendorData.name,
          gamesCount: vendorData.games ? vendorData.games.length : 0,
          status: vendorData.is_disabled ? "inactive" : "active",
          categories: categories.length > 0 ? categories : ["General"],
        };
      });

      return {
        games,
        vendors,
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
