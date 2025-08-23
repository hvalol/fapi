// Wallet routes for AgentWallet and WalletTransaction
const express = require("express");
const router = express.Router();

const walletController = require("../controllers/walletController");
const { authorize } = require("../middlewares/roleMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");

// All wallet routes require authentication
router.use(authenticate);

// Get wallet balance (any authenticated user)
router.get("/balance", walletController.getBalance);

// Credit wallet (only Admin/ClientAdmin/Agent)
router.post(
  "/credit",
  authorize("Admin", "ClientAdmin", "Agent"),
  walletController.credit
);

// Debit wallet (only Admin/ClientAdmin/Agent)
router.post(
  "/debit",
  authorize("Admin", "ClientAdmin", "Agent"),
  walletController.debit
);

// Topup wallet (only Admin/ClientAdmin/Agent)
router.post(
  "/topup",
  authorize("Admin", "ClientAdmin", "Agent"),
  walletController.topup
);

// Get wallet transactions (any authenticated user)
router.get("/transactions", walletController.getTransactions);

module.exports = router;
