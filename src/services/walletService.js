const { AgentWallet, WalletTransaction } = require("../models");
const sequelize = require("../models").sequelize;
const { AppError } = require("../middlewares/errorHandler");

/**
 * Service for agent wallet operations
 */
class WalletService {
  /**
   * Top-up wallet: Only master/root agent can top up sub-agents. The topup amount must not exceed the balance of the master/root agent.
   * @param {Object} params
   * @param {number} agentId - The sub-agent to top up
   * @param {number} clientId
   * @param {string} walletType
   * @param {number} amount
   * @param {string} reference
   * @param {object} metadata
   * @param {object} user - The user performing the topup (must be master/root agent)
   */
  async topupWallet({
    agentId,
    clientId,
    walletType,
    amount,
    reference,
    metadata,
    user,
  }) {
    // Validate: user must be a master/root agent and can only top up sub-agents
    if (!user || !user.agent_id) {
      throw new AppError("Only agents can perform top-up", 403);
    }
    if (Number(agentId) === Number(user.agent_id)) {
      throw new AppError("You cannot top up your own agent wallet", 403);
    }
    // Check that the agentId is a sub-agent of the user.agent_id
    const { Agent } = require("../models");
    const subAgent = await Agent.findByPk(agentId);
    if (!subAgent) {
      throw new AppError("Sub-agent not found", 404);
    }
    if (subAgent.parent_id !== user.agent_id) {
      throw new AppError("You can only top up your direct sub-agents", 403);
    }
    // Check master/root agent's wallet balance
    let masterWallet = await AgentWallet.findOne({
      where: {
        agent_id: user.agent_id,
        client_id: clientId,
        wallet_type: walletType,
      },
    });
    if (!masterWallet) {
      throw new AppError("Your (master agent) wallet not found", 404);
    }
    if (Number(masterWallet.balance) < Number(amount)) {
      throw new AppError(
        "Insufficient balance in your (master agent) wallet",
        400
      );
    }
    // Try to find/create the sub-agent's wallet
    let subWallet = await AgentWallet.findOne({
      where: {
        agent_id: agentId,
        client_id: clientId,
        wallet_type: walletType,
      },
    });
    if (!subWallet) {
      // Default currency for dev/testing; adjust as needed
      const currency = "USD";
      subWallet = await this.createWallet({
        agentId,
        clientId,
        currency,
        walletType,
      });
    }
    // Perform the transfer atomically
    return sequelize.transaction(async (t) => {
      // Deduct from master/root agent
      masterWallet.balance = Number(masterWallet.balance) - Number(amount);
      await masterWallet.save({ transaction: t });
      // Credit to sub-agent
      subWallet.balance = Number(subWallet.balance) + Number(amount);
      await subWallet.save({ transaction: t });
      // Log transactions for both wallets
      await WalletTransaction.create(
        {
          wallet_id: masterWallet.id,
          transaction_type: "transfer_out",
          amount,
          reference:
            reference ||
            `Top-up to sub-agent ${subAgent.name} (${subAgent.code})`,
          metadata: { ...metadata, to_agent_id: agentId },
          balance_before: Number(masterWallet.balance) + Number(amount),
          balance_after: masterWallet.balance,
        },
        { transaction: t }
      );
      await WalletTransaction.create(
        {
          wallet_id: subWallet.id,
          transaction_type: "transfer_in",
          amount,
          reference: reference || `Top-up from master agent ${user.agent_id}`,
          metadata: { ...metadata, from_agent_id: user.agent_id },
          balance_before: Number(subWallet.balance) - Number(amount),
          balance_after: subWallet.balance,
        },
        { transaction: t }
      );
      return subWallet;
    });
  }
  /**
   * Get all wallets for agent (optionally by clientId). Auto-create missing wallets for all supported types.
   */
  async getWallets({ agentId, clientId }) {
    if (!agentId) throw new AppError("agentId is required", 400);
    const where = { agent_id: agentId };
    if (clientId !== undefined && clientId !== null && clientId !== "") {
      where.client_id = clientId;
    }
    let wallets = await AgentWallet.findAll({ where });

    // Supported wallet types
    const supportedTypes = ["seamless", "transfer", "holdem"];
    const existingTypes = wallets.map((w) => w.wallet_type);
    const missingTypes = supportedTypes.filter(
      (type) => !existingTypes.includes(type)
    );

    // Default currency for auto-created wallets
    const currency = "USD";
    for (const walletType of missingTypes) {
      const newWallet = await AgentWallet.create({
        agent_id: agentId,
        client_id: clientId,
        currency,
        wallet_type: walletType,
        balance: 0,
      });
      wallets.push(newWallet);
    }
    return wallets;
  }

  /**
   * Get all wallet balances by type
   */
  async getBalance({ agentId, clientId }) {
    const wallets = await this.getWallets({ agentId, clientId });
    const result = { seamless: null, transfer: null, holdem: null };
    for (const wallet of wallets) {
      result[wallet.wallet_type] = wallet.balance;
    }
    return result;
  }

  /**
   * Create wallet (idempotent, by type)
   */
  async createWallet({ agentId, clientId, currency, walletType }) {
    if (!agentId || !currency || !walletType)
      throw new AppError("agentId, currency, and walletType are required", 400);
    const where = {
      agent_id: agentId,
      currency,
      wallet_type: walletType,
    };
    if (clientId !== undefined && clientId !== null && clientId !== "") {
      where.client_id = clientId;
    }
    let wallet = await AgentWallet.findOne({ where });
    if (!wallet) {
      const createObj = {
        agent_id: agentId,
        currency,
        wallet_type: walletType,
        balance: 0,
      };
      if (clientId !== undefined && clientId !== null && clientId !== "") {
        createObj.client_id = clientId;
      }
      wallet = await AgentWallet.create(createObj);
    }
    return wallet;
  }

  /**
   * Credit wallet (add funds, by type)
   */
  async credit({ agentId, clientId, amount, reference, metadata, walletType }) {
    if (!agentId || amount === undefined || amount === null || !walletType)
      throw new AppError("agentId, amount, and walletType are required", 400);
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
      throw new AppError("Amount must be a positive number", 400);
    return sequelize.transaction(async (t) => {
      const where = {
        agent_id: agentId,
        wallet_type: walletType,
      };
      if (clientId !== undefined && clientId !== null && clientId !== "") {
        where.client_id = clientId;
      }
      let wallet = await AgentWallet.findOne({ where });
      if (!wallet) throw new AppError("Wallet not found for this type", 404);
      const previousBalance = Number(wallet.balance);
      wallet.balance = previousBalance + Number(amount);
      await wallet.save({ transaction: t });
      await WalletTransaction.create(
        {
          wallet_id: wallet.id,
          transaction_type: "deposit", // For dev topup; for production, use business logic to set type
          amount,
          reference,
          metadata,
          balance_before: previousBalance,
          balance_after: wallet.balance,
        },
        { transaction: t }
      );
      return wallet;
    });
  }

  /**
   * Debit wallet (subtract funds, by type)
   */
  async debit({ agentId, clientId, amount, reference, metadata, walletType }) {
    if (!agentId || amount === undefined || amount === null || !walletType)
      throw new AppError("agentId, amount, and walletType are required", 400);
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
      throw new AppError("Amount must be a positive number", 400);
    return sequelize.transaction(async (t) => {
      const where = {
        agent_id: agentId,
        wallet_type: walletType,
      };
      if (clientId !== undefined && clientId !== null && clientId !== "") {
        where.client_id = clientId;
      }
      let wallet = await AgentWallet.findOne({ where });
      if (!wallet) throw new AppError("Wallet not found for this type", 404);
      const previousBalance = Number(wallet.balance);
      if (previousBalance < Number(amount))
        throw new AppError("Insufficient balance", 400);
      wallet.balance = previousBalance - Number(amount);
      await wallet.save({ transaction: t });
      await WalletTransaction.create(
        {
          wallet_id: wallet.id,
          transaction_type: "withdraw", // For production, use business logic to set type
          amount,
          reference,
          metadata,
          balance_before: previousBalance,
          balance_after: wallet.balance,
        },
        { transaction: t }
      );
      return wallet;
    });
  }

  /**
   * List wallet transactions (by type)
   */
  async getTransactions({
    agentId,
    clientId,
    walletType,
    limit = 20,
    offset = 0,
  }) {
    const where = { wallet_type: walletType };
    if (agentId !== undefined && agentId !== null && agentId !== "") {
      where.agent_id = agentId;
    }
    if (clientId !== undefined && clientId !== null && clientId !== "") {
      where.client_id = clientId;
    }
    let wallet = await AgentWallet.findOne({ where });
    if (!wallet) throw new AppError("Wallet not found for this type", 404);
    return WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
  }
}

module.exports = new WalletService();
