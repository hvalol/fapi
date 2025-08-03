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
 * Record a payment for a client
 * Only accessible to admin users
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    // Get client to check for billing requirements
    const client = await clientBillingService.getClientBillingById(clientId);

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

    // Check if client only has monthly billing charges
    const hasOnlyMonthlyBillingCharges =
      client.monthlyBilling?.some((b) => b.status !== "Paid") &&
      !client.transactionHistory?.some(
        (tx) =>
          tx.type !== "Share Due" &&
          tx.type !== "Payment" &&
          tx.type !== "Deposit" &&
          tx.amount < 0
      );

    // Enhanced validation when client only has monthly billing charges
    if (hasOnlyMonthlyBillingCharges) {
      if (!paymentData.relatedBillingId) {
        return next(
          new AppError(
            "This client only has monthly billing charges. Payment must be associated with a billing period.",
            400
          )
        );
      }

      // Validate the billing ID is a number
      const billingId = parseInt(paymentData.relatedBillingId, 10);
      if (isNaN(billingId)) {
        return next(
          new AppError(
            `Invalid billing ID format: ${paymentData.relatedBillingId}`,
            400
          )
        );
      }

      // Ensure the ID exists in the client's billings
      const billingExists = client.monthlyBilling.some(
        (b) => b.id === billingId
      );
      if (!billingExists) {
        return next(
          new AppError(
            `Billing with ID ${billingId} not found for this client`,
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
        message: paymentData.relatedBillingId
          ? "Payment recorded and associated with billing period"
          : "Payment recorded successfully",
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
