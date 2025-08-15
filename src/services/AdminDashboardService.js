const { Op } = require("sequelize");
const models = require("../models");
const { AppError } = require("../middlewares/errorHandler");

/**
 * Service for Admin dashboard operations (global, not per-client)
 */
class AdminDashboardService {
  /**
   * Get dashboard summary data for Admin (global)
   * @returns {Object} Dashboard summary data
   */
  async getDashboardSummary() {
    try {
      // Initialize default dashboard data
      const dashboardData = {
        gamesCount: 0,
        vendorsCount: 0,
        agentsCount: 0,
      };

      // Count Zenith games
      dashboardData.gamesCount = await models.ZenithGame.count({
        where: {
          is_active: true,
          is_disabled: false,
        },
      });

      // Count Zenith vendors
      dashboardData.vendorsCount = await models.ZenithVendor.count({
        where: {
          is_active: true,
          is_disabled: false,
        },
      });

      // Count all active agents
      dashboardData.agentsCount = await models.Agent.count({
        where: {
          // status: "active",
        },
      });

      // Get global billing information and outstanding balance
      const { outstandingBalance, hasUnpaidBilling, billingMessage } =
        await this.getGlobalBillingInfo();

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
   * Get global billing information (all clients)
   * @returns {Object} Billing information
   */
  async getGlobalBillingInfo() {
    try {
      let outstandingBalance = 0;
      let hasUnpaidBilling = false;
      let billingMessage = "";

      // All client transactions
      const clientTransactions = await models.ClientTransaction.findAll();

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

      if (outstandingBalance > 0) {
        hasUnpaidBilling = true;

        // Find earliest due billing globally
        const clientBillings = await models.ClientBilling.findAll({
          where: { status: "Unpaid" },
          order: [["created_at", "ASC"]],
        });

        if (clientBillings && clientBillings.length > 0) {
          const earliestBilling = clientBillings[0];
          const dueDate = new Date(earliestBilling.due_date);
          const formattedDate = dueDate.toLocaleDateString();
          billingMessage = `There are unpaid billings due on ${formattedDate}`;
        } else {
          billingMessage = "There is outstanding balance that requires payment";
        }
      }

      return {
        outstandingBalance,
        hasUnpaidBilling,
        billingMessage,
      };
    } catch (error) {
      console.error("Error in getGlobalBillingInfo service:", error);
      throw error;
    }
  }

  /**
   * Get games and vendors data for admin dashboard (global)
   * @returns {Object} Games and vendors data
   */
  async getGamesAndVendors() {
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
          status: gameData.is_disabled ? "inactive" : "active",
        };
      });

      // Format vendors data for frontend
      const vendors = zenithVendors.map((vendor) => {
        const vendorData = vendor.toJSON();
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
   * Get agents data for admin dashboard (global)
   * @returns {Object} Agents data
   */
  async getAgents() {
    try {
      // Fetch all agents
      const agents = await models.Agent.findAll({
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
          players: 0, // Placeholder
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
          totalPlayers: 0, // Placeholder
        },
      };
    } catch (error) {
      console.error("Error in getAgents service:", error);
      throw error;
    }
  }

  /**
   * Get billing data for admin dashboard (global)
   * @returns {Object} Billing data
   */
  async getBillingData() {
    try {
      // Fetch all billings
      const clientBillings = await models.ClientBilling.findAll({
        order: [["created_at", "DESC"]],
        limit: 10,
      });

      // Fetch all transactions
      const clientTransactions = await models.ClientTransaction.findAll({
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

      if (clientTransactions && clientTransactions.length > 0) {
        currentBalance = clientTransactions.reduce((total, tx) => {
          const amount = parseFloat(tx.amount);
          if (tx.type === "Payment") {
            return total - amount;
          } else {
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
        lastPaymentDate = lastPaymentTx.created_at;
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

module.exports = new AdminDashboardService();
