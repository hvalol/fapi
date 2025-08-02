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
