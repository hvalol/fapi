const { AgentWallet, WalletTransaction } = require("../models");
const sequelize = require("../models").sequelize;
const { AppError } = require("../middlewares/errorHandler");

/**
 * Service for agent wallet operations
 */
class WalletService {
  /**
   * Top-up wallet (dev/testing only, just calls credit)
   */
  async topupWallet({
    agentId,
    clientId,
    walletType,
    amount,
    reference,
    metadata,
  }) {
    // Try to find the wallet first
    let wallet = await AgentWallet.findOne({
      where: {
        agent_id: agentId,
        client_id: clientId,
        wallet_type: walletType,
      },
    });
    if (!wallet) {
      // Default currency for dev/testing; adjust as needed
      const currency = "USD";
      await this.createWallet({ agentId, clientId, currency, walletType });
    }
    // Now credit the wallet
    return this.credit({
      agentId,
      clientId,
      walletType,
      amount,
      reference,
      metadata,
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
