// Wallet Controller for AgentWallet and WalletTransaction
const WalletService = require("../services/walletService");
const { AppError } = require("../middlewares/errorHandler");

module.exports = {
  // POST /api/wallet/topup
  async topup(req, res, next) {
    try {
      const { agentId, clientId, walletType, amount, reference, metadata } =
        req.body;
      if (
        !agentId ||
        !clientId ||
        !walletType ||
        amount === undefined ||
        amount === null
      )
        return next(
          new AppError(
            "agentId, clientId, walletType, and amount are required",
            400
          )
        );
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
        return next(new AppError("amount must be a positive number", 400));
      const wallet = await WalletService.topupWallet({
        agentId,
        clientId,
        walletType,
        amount,
        reference,
        metadata,
      });
      res.json({ wallet });
    } catch (err) {
      next(err);
    }
  },
  // GET /api/wallet/balance?agentId=...&clientId=...
  async getBalance(req, res, next) {
    try {
      const { agentId, clientId } = req.query;
      if (!agentId) return next(new AppError("agentId is required", 400));
      const balances = await WalletService.getBalance({ agentId, clientId });
      res.json({ balances });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/wallet/credit
  async credit(req, res, next) {
    try {
      const { agentId, clientId, amount, reference, metadata, walletType } =
        req.body;
      if (
        !agentId ||
        !clientId ||
        amount === undefined ||
        amount === null ||
        !walletType
      )
        return next(
          new AppError(
            "agentId, clientId, amount, and walletType are required",
            400
          )
        );
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
        return next(new AppError("amount must be a positive number", 400));
      const wallet = await WalletService.credit({
        agentId,
        clientId,
        amount,
        reference,
        metadata,
        walletType,
      });
      res.json({ wallet });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/wallet/debit
  async debit(req, res, next) {
    try {
      const { agentId, clientId, amount, reference, metadata, walletType } =
        req.body;
      if (
        !agentId ||
        !clientId ||
        amount === undefined ||
        amount === null ||
        !walletType
      )
        return next(
          new AppError(
            "agentId, clientId, amount, and walletType are required",
            400
          )
        );
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0)
        return next(new AppError("amount must be a positive number", 400));
      const wallet = await WalletService.debit({
        agentId,
        clientId,
        amount,
        reference,
        metadata,
        walletType,
      });
      res.json({ wallet });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/wallet/transactions?agentId=...&clientId=...&limit=20&offset=0
  async getTransactions(req, res, next) {
    try {
      const { agentId, clientId, walletType, limit, offset } = req.query;
      if (!walletType || (!agentId && !clientId))
        return next(
          new AppError(
            "walletType and at least one of agentId or clientId are required",
            400
          )
        );
      const transactions = await WalletService.getTransactions({
        agentId:
          agentId !== undefined && agentId !== null && agentId !== ""
            ? agentId
            : undefined,
        clientId:
          clientId !== undefined && clientId !== null && clientId !== ""
            ? clientId
            : undefined,
        walletType,
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
      });
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },
};
