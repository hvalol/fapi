// Wallet routes for AgentWallet and WalletTransaction
const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// Get wallet balance
router.get("/balance", walletController.getBalance);
// Credit wallet
router.post("/credit", walletController.credit);
// Debit wallet
router.post("/debit", walletController.debit);

// Topup wallet (dev/testing only)
router.post("/topup", walletController.topup);
// Get wallet transactions
router.get("/transactions", walletController.getTransactions);

module.exports = router;
