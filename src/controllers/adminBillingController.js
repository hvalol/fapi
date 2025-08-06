const clientBillingService = require("../services/clientBillingService");
const { AppError } = require("../middlewares/errorHandler");

/**
 * Get billing summary for all clients
 * Only accessible to admin users
 */
exports.getAllClientsBillingSummary = async (req, res, next) => {
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
 * Get detailed billing for a specific client
 * Only accessible to admin users
 */
exports.getClientBillingDetails = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
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
            datePosted: chargeData.date,
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
            datePosted: chargeData.date,
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
  let message = `Payment of $${paymentData.amount} successfully recorded.`;

  // Add details about deposit allocation if applicable
  if (paymentData.depositPayment && paymentData.depositAmount > 0) {
    message += ` $${paymentData.depositAmount} allocated to ${paymentData.depositType} deposit.`;
  }

  // Add details about billing allocation if applicable
  if (paymentData.relatedBillingId) {
    message += ` Payment associated with billing #${paymentData.relatedBillingId}.`;
  }

  return message;
}

/**
 * Record a payment for a client
 * Only accessible to admin users
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const paymentData = req.body;

    // Get client data to check requirements
    const client = await clientBillingService.getClientBillingById(clientId);

    if (!client) {
      return next(new AppError("Client not found", 404));
    }

    // Check if client has deposit requirements
    const hasDepositRequirements =
      (client.securityDeposit &&
        client.securityDeposit.required > client.securityDeposit.paid) ||
      (client.additionalDeposit &&
        client.additionalDeposit.required > client.additionalDeposit.paid);

    // Check if client has unpaid monthly billings
    const hasUnpaidBillings =
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
    const formattedPaymentData = {
      amount: parseFloat(paymentData.amount),
      date: paymentData.date,
      remarks: paymentData.remarks,
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber,
      depositPayment: paymentData.depositPayment,
      depositType: paymentData.depositType,
      depositAmount: paymentData.depositAmount
        ? parseFloat(paymentData.depositAmount)
        : undefined,
      relatedBillingId: paymentData.relatedBillingId,
    };

    // CASE 1: When only monthly billings exist, association is mandatory
    if (hasUnpaidBillings && !hasDepositRequirements) {
      if (!formattedPaymentData.relatedBillingId) {
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
        !formattedPaymentData.depositPayment ||
        !formattedPaymentData.depositAmount ||
        formattedPaymentData.depositAmount <= 0
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
      const hasBillingAllocation = !!formattedPaymentData.relatedBillingId;
      const hasDepositAllocation =
        formattedPaymentData.depositPayment &&
        formattedPaymentData.depositAmount > 0;

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
    if (formattedPaymentData.relatedBillingId) {
      // Convert to number for consistent comparison
      const billingId = parseInt(formattedPaymentData.relatedBillingId, 10);

      if (isNaN(billingId)) {
        return next(
          new AppError(
            `Invalid billing ID format: ${formattedPaymentData.relatedBillingId}`,
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
      formattedPaymentData.relatedBillingId = billingId;
    }

    // Validate deposit details if provided
    if (formattedPaymentData.depositPayment) {
      if (
        !formattedPaymentData.depositType ||
        !["security", "additional"].includes(formattedPaymentData.depositType)
      ) {
        return next(
          new AppError(
            "Valid deposit type (security or additional) is required for deposit payments",
            400
          )
        );
      }

      if (
        !formattedPaymentData.depositAmount ||
        formattedPaymentData.depositAmount <= 0
      ) {
        return next(
          new AppError(
            "Valid deposit amount is required for deposit payments",
            400
          )
        );
      }

      // Get security and additional deposit shortfalls
      const securityDepositShortfall = Math.max(
        0,
        client.securityDeposit.required - client.securityDeposit.paid
      );

      const additionalDepositShortfall = Math.max(
        0,
        client.additionalDeposit.required - client.additionalDeposit.paid
      );

      // Check that deposit amount doesn't exceed shortfall
      const maxAmount =
        formattedPaymentData.depositType === "security"
          ? securityDepositShortfall
          : additionalDepositShortfall;

      if (formattedPaymentData.depositAmount > maxAmount) {
        return next(
          new AppError(
            `Deposit amount exceeds the remaining ${formattedPaymentData.depositType} deposit requirement of ${maxAmount}`,
            400
          )
        );
      }

      // Check that deposit amount doesn't exceed payment amount
      if (formattedPaymentData.depositAmount > formattedPaymentData.amount) {
        return next(
          new AppError("Deposit amount cannot exceed total payment amount", 400)
        );
      }
    }

    // Record the payment
    const updatedClient = await clientBillingService.recordPayment(
      clientId,
      formattedPaymentData
    );

    // Return success response with updated client data
    res.json({
      status: "success",
      data: {
        client: updatedClient,
        message: generateSuccessMessage(formattedPaymentData),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a billing statement PDF for a client
 * Only accessible to admin users
 */
exports.generateBillingStatement = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const month = req.query.month;

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
