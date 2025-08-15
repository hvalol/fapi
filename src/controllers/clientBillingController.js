// src/controllers/clientBillingController.js
const clientBillingService = require("../services/clientBillingService");
const { AppError } = require("../middlewares/errorHandler");

/**
 * Get all client billing data
 * Only accessible to admin users
 */
exports.getAllClientBilling = async (req, res, next) => {
  try {
    const clients = await clientBillingService.getAllClientBilling();

    res.json({
      status: "success",
      data: {
        clients,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get billing data for a specific client
 * Admin can access any client, client admin can only access their own client
 */
exports.getClientBillingById = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    // If user is ClientAdmin, check if they're trying to access their own client
    if (req.user.role === "ClientAdmin" && req.user.client_id !== clientId) {
      return next(
        new AppError(
          "You do not have permission to access this client's billing",
          403
        )
      );
    }

    const client = await clientBillingService.getClientBillingById(clientId);

    res.json({
      status: "success",
      data: {
        client,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new charge to a client's account
 * Only accessible to admin users
 */
exports.addCharge = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const chargeData = req.body;

    // Validate for Share Due charges
    if (chargeData.type === "Share Due") {
      // Check if we have currencyDetails or fallback to single currency
      if (
        !chargeData.currencyDetails ||
        chargeData.currencyDetails.length === 0
      ) {
        // Validate single-currency mode fields
        if (!chargeData.gameProvider) {
          return next(
            new AppError("Game provider is required for Share Due charges", 400)
          );
        }

        if (!chargeData.currency) {
          return next(
            new AppError("Currency is required for Share Due charges", 400)
          );
        }

        if (
          !chargeData.exchangeRate ||
          isNaN(parseFloat(chargeData.exchangeRate)) ||
          parseFloat(chargeData.exchangeRate) <= 0
        ) {
          return next(
            new AppError(
              "A valid exchange rate is required for Share Due charges",
              400
            )
          );
        }

        // Add monthlyBillingData if not present
        if (!chargeData.monthlyBillingData) {
          chargeData.monthlyBillingData = {
            month: chargeData.billingMonth,
            label:
              chargeData.billingPeriodLabel ||
              `Month ${chargeData.billingMonth}`,
            totalGGR: parseFloat(chargeData.totalGGR || 0),
            shareAmount: parseFloat(chargeData.amount),
            dueDate: chargeData.dueDate,
            gameProvider: chargeData.gameProvider,
          };
        }
      } else {
        // Multi-currency mode
        // Ensure each currency detail has the required fields
        chargeData.currencyDetails.forEach((detail, index) => {
          detail.currency = detail.currency.toUpperCase();
          detail.ggrAmount = parseFloat(detail.ggrAmount);
          detail.exchangeRate = parseFloat(detail.exchangeRate);
          detail.usdEquivalent = detail.ggrAmount * detail.exchangeRate;
        });

        // Add monthlyBillingData if not present
        if (!chargeData.monthlyBillingData) {
          chargeData.monthlyBillingData = {
            month: chargeData.billingMonth,
            label:
              chargeData.billingPeriodLabel ||
              `Month ${chargeData.billingMonth}`,
            totalGGR: parseFloat(chargeData.totalGgrUsd || 0),
            shareAmount: parseFloat(chargeData.amount),
            dueDate: chargeData.dueDate,
            gameProvider: chargeData.gameProvider,
          };
        }
      }
    }

    const client = await clientBillingService.addCharge(clientId, chargeData);

    res.json({
      status: "success",
      data: {
        client,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate appropriate success message based on payment allocation
 */
function generateSuccessMessage(paymentData) {
  if (paymentData.relatedBillingId && paymentData.depositPayment) {
    return "Payment recorded and allocated to both billing period and deposit";
  } else if (paymentData.relatedBillingId) {
    return "Payment recorded and associated with billing period";
  } else if (paymentData.depositPayment) {
    return `Payment recorded and allocated to ${paymentData.depositType} deposit`;
  } else {
    return "Payment recorded successfully";
  }
}

/**
 * Record a payment for a client
 * Only accessible to admin users
 * 08/03
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    // Get client to check for billing requirements
    const client = await clientBillingService.getClientBillingById(clientId);

    // Check client payment allocation requirements
    const hasUnpaidBillings = client.monthlyBilling?.some(
      (b) => b.status !== "Paid"
    );

    const securityDepositShortfall = Math.max(
      0,
      client.securityDeposit?.required - client.securityDeposit?.paid
    );

    const additionalDepositShortfall = Math.max(
      0,
      client.additionalDeposit?.required - client.additionalDeposit?.paid
    );

    const hasDepositRequirements =
      securityDepositShortfall > 0 || additionalDepositShortfall > 0;

    // Check if client only has monthly billing charges (Share Due)
    const hasOnlyMonthlyBillingCharges =
      client.monthlyBilling?.some((b) => b.status !== "Paid") &&
      !client.transactionHistory?.some(
        (tx) =>
          tx.type !== "Share Due" &&
          tx.type !== "Payment" &&
          tx.type !== "Deposit" &&
          tx.amount < 0
      );

    // Check if client only has deposit requirements
    const hasOnlyDepositRequirements =
      hasDepositRequirements &&
      !client.transactionHistory?.some(
        (tx) => tx.type !== "Deposit" && tx.type !== "Payment" && tx.amount < 0
      );

    // Standardize field names to match what the service expects
    const paymentData = {
      amount: parseFloat(req.body.amount),
      date: req.body.date,
      remarks: req.body.remarks,
      paymentMethod: req.body.paymentMethod,
      referenceNumber: req.body.referenceNumber,
      depositPayment: req.body.depositPayment,
      depositType: req.body.depositType,
      depositAmount: req.body.depositAmount
        ? parseFloat(req.body.depositAmount)
        : undefined,
      relatedBillingId: req.body.relatedBillingId,
    };

    // CASE 1: When only monthly billings exist, association is mandatory
    if (hasUnpaidBillings && !hasDepositRequirements) {
      if (!paymentData.relatedBillingId) {
        return next(
          new AppError(
            "This client has unpaid monthly billings. Payment must be associated with a billing period.",
            400
          )
        );
      }
    }

    // CASE 2: When only deposit requirements exist, allocation is mandatory
    if (hasDepositRequirements && !hasUnpaidBillings) {
      if (
        !paymentData.depositPayment ||
        !paymentData.depositAmount ||
        paymentData.depositAmount <= 0
      ) {
        return next(
          new AppError(
            "This client has deposit requirements. Payment must be allocated to deposits.",
            400
          )
        );
      }
    }

    // CASE 3: When both exist, at least one allocation is required
    if (hasUnpaidBillings && hasDepositRequirements) {
      const hasBillingAllocation = !!paymentData.relatedBillingId;
      const hasDepositAllocation =
        paymentData.depositPayment && paymentData.depositAmount > 0;

      if (!hasBillingAllocation && !hasDepositAllocation) {
        return next(
          new AppError(
            "This client has both unpaid billings and deposit requirements. Payment must be allocated to at least one of these.",
            400
          )
        );
      }
    }

    // Additional validation for billing relationship if provided
    if (paymentData.relatedBillingId) {
      // Convert to number for consistent comparison
      const billingId = parseInt(paymentData.relatedBillingId, 10);

      if (isNaN(billingId)) {
        return next(
          new AppError(
            `Invalid billing ID format: ${paymentData.relatedBillingId}`,
            400
          )
        );
      }

      // Validate that the billing ID belongs to this client
      const billing = client.monthlyBilling.find((b) => b.id === billingId);

      if (!billing) {
        return next(
          new AppError(
            "The selected billing period does not exist or does not belong to this client",
            400
          )
        );
      }

      // Cannot associate payment with a fully paid billing
      if (billing.status === "Paid") {
        return next(
          new AppError(
            "Cannot associate payment with a fully paid billing",
            400
          )
        );
      }

      // Store the validated numeric ID
      paymentData.relatedBillingId = billingId;
    }

    // Validate deposit details if provided
    if (paymentData.depositPayment) {
      if (
        !paymentData.depositType ||
        !["security", "additional"].includes(paymentData.depositType)
      ) {
        return next(
          new AppError(
            "Valid deposit type (security or additional) is required for deposit payments",
            400
          )
        );
      }

      if (!paymentData.depositAmount || paymentData.depositAmount <= 0) {
        return next(
          new AppError(
            "Valid deposit amount is required for deposit payments",
            400
          )
        );
      }

      // Check that deposit amount doesn't exceed shortfall
      const maxAmount =
        paymentData.depositType === "security"
          ? securityDepositShortfall
          : additionalDepositShortfall;

      if (paymentData.depositAmount > maxAmount) {
        return next(
          new AppError(
            `Deposit amount exceeds the remaining ${paymentData.depositType} deposit requirement of ${maxAmount}`,
            400
          )
        );
      }

      // Check that deposit amount doesn't exceed payment amount
      if (paymentData.depositAmount > paymentData.amount) {
        return next(
          new AppError("Deposit amount cannot exceed total payment amount", 400)
        );
      }
    }

    // Record the payment
    const updatedClient = await clientBillingService.recordPayment(
      clientId,
      paymentData
    );

    // Return success response with updated client data
    res.json({
      status: "success",
      data: {
        client: updatedClient,
        message: generateSuccessMessage(paymentData),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a billing statement PDF for a client
 * Admin can generate for any client, client admin can only access their own
 */
exports.generateBillingStatement = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const month = req.query.month;

    // If user is ClientAdmin, check if they're trying to access their own client
    if (req.user.role === "ClientAdmin" && req.user.client_id !== clientId) {
      return next(
        new AppError(
          "You do not have permission to access this client's billing",
          403
        )
      );
    }

    // Validate month format
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return next(
        new AppError(
          "Invalid month format. Please provide month in YYYY-MM format",
          400
        )
      );
    }

    const pdfPath = await clientBillingService.generateBillingStatement(
      clientId,
      month
    );

    res.download(pdfPath, `client-${clientId}-statement-${month}.pdf`);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new billing record for a client
 * Only accessible to admin users
 */
exports.createBilling = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const billingData = req.body;

    const billing = await clientBillingService.createBilling(
      clientId,
      billingData
    );

    res.status(201).json({
      status: "success",
      data: {
        billing,
      },
    });
  } catch (error) {
    next(error);
  }
};
