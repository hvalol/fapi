const {
  Client,
  ClientBilling,
  ClientTransaction,
  ClientDeposit,
  ClientBillingCurrency,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

const { AppError } = require("../middlewares/errorHandler");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
/**
 * Generate default remarks for a payment based on allocation
 */
function generateDefaultRemarks(paymentData, unpaidBillings) {
  let remarks = `Payment received - ${paymentData.paymentMethod}`;

  if (paymentData.relatedBillingId) {
    const billing = unpaidBillings.find(
      (b) => b.id === parseInt(paymentData.relatedBillingId)
    );
    if (billing) {
      remarks = `Payment for ${billing.label} billing`;

      if (paymentData.depositPayment) {
        remarks += ` and ${paymentData.depositType} deposit`;
      }
    }
  } else if (paymentData.depositPayment) {
    remarks = `Payment for ${paymentData.depositType} deposit`;
  }

  return remarks;
}
/**
 * Service for client billing operations
 */
class ClientBillingService {
  /**
   * Get billing data for all clients
   * @param {Object} filters - Optional filters
   * @returns {Array} - Array of clients with billing data
   */
  async getAllClientBilling(filters = {}) {
    try {
      const clients = await Client.findAll({
        include: [
          {
            model: ClientDeposit,
            as: "deposit",
            required: false,
          },
          {
            model: ClientBilling,
            as: "billings",
            required: false,
            include: [
              {
                model: ClientBillingCurrency,
                as: "currencyDetails",
                required: false,
              },
            ],
            limit: 12,
            order: [["month", "DESC"]],
          },
          {
            model: ClientTransaction,
            as: "transactions",
            required: false,
            limit: 50,
            order: [["date", "DESC"]],
          },
        ],
        order: [["name", "ASC"]],
      });

      // Process data to match frontend expectations
      return this.processClientsData(clients);
    } catch (error) {
      console.error("Error in getAllClientBilling:", error);
      throw new AppError("Failed to fetch client billing data", 500);
    }
  }

  /**
   * Get billing data for a specific client
   * @param {number} id - Client ID
   * @returns {Object} - Client with billing data
   */
  async getClientBillingById(id) {
    try {
      const client = await Client.findByPk(id, {
        include: [
          {
            model: ClientDeposit,
            as: "deposit",
            required: false,
          },
          {
            model: ClientBilling,
            as: "billings",
            required: false,
            include: [
              {
                model: ClientBillingCurrency,
                as: "currencyDetails",
                required: false,
              },
            ],
            order: [["month", "DESC"]],
          },
          {
            model: ClientTransaction,
            as: "transactions",
            required: false,
            order: [["date", "DESC"]],
          },
        ],
      });

      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Process data to match frontend expectations
      const processedClients = this.processClientsData([client]);
      return processedClients[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in getClientBillingById for client ${id}:`, error);
      throw new AppError("Failed to fetch client billing data", 500);
    }
  }

  /**
   * Process raw client data into format expected by frontend
   * @param {Array} clients - Raw client data from database
   * @returns {Array} - Processed client data
   */
  processClientsData(clients) {
    return clients.map((client) => {
      const rawClient = client.toJSON();

      // Prepare security deposit data
      const securityDeposit = {
        required: rawClient.deposit
          ? parseFloat(rawClient.deposit.security_required)
          : 0,
        paid: rawClient.deposit
          ? parseFloat(rawClient.deposit.security_paid)
          : 0,
      };

      // Prepare additional deposit data
      const additionalDeposit = {
        required: rawClient.deposit
          ? parseFloat(rawClient.deposit.additional_required)
          : 0,
        paid: rawClient.deposit
          ? parseFloat(rawClient.deposit.additional_paid)
          : 0,
      };

      // Calculate accurate outstanding balance with detailed breakdown
      let outstandingBalance = 0;
      let totalCharges = 0;
      let totalPayments = 0;
      let depositCharges = 0;
      let regularCharges = 0;
      let depositPayments = 0;
      let regularPayments = 0;

      if (rawClient.transactions && rawClient.transactions.length > 0) {
        // Process all transactions for detailed balance calculation
        rawClient.transactions.forEach((tx) => {
          const amount = parseFloat(tx.amount);

          if (amount < 0) {
            // This is a charge
            totalCharges += Math.abs(amount);

            if (tx.type === "Deposit") {
              depositCharges += Math.abs(amount);
            } else {
              regularCharges += Math.abs(amount);
            }
          } else {
            // This is a payment
            totalPayments += amount;
          }
        });

        // Calculate deposit payments from deposit paid values
        depositPayments = securityDeposit.paid + additionalDeposit.paid;

        // Adjust regular payments to exclude deposit payments
        regularPayments = Math.max(0, totalPayments - depositPayments);

        // Calculate outstanding balance: charges minus payments
        const regularOutstanding = regularCharges - regularPayments;

        // Calculate deposit requirements shortfall
        const depositOutstanding = depositCharges - depositPayments;

        // Total outstanding balance
        outstandingBalance = regularOutstanding + depositOutstanding;

        // If fully paid up with no outstanding deposit requirements,
        // allow showing credit balance (negative outstanding)
        if (depositOutstanding <= 0 && regularOutstanding < 0) {
          outstandingBalance = regularOutstanding;
        }
      }

      // Calculate billing due amount (unpaid invoices)
      const billingDue = this.calculateBillingDue(rawClient);

      // Calculate deposit shortfalls
      const securityDepositShortfall = Math.max(
        0,
        securityDeposit.required - securityDeposit.paid
      );
      const additionalDepositShortfall = Math.max(
        0,
        additionalDeposit.required - additionalDeposit.paid
      );
      const depositDue = securityDepositShortfall + additionalDepositShortfall;

      // Calculate non-billing charges
      const nonBillingCharges = this.calculateNonBillingCharges(rawClient);

      // CHANGE: Total Share Due should only include billing due (monthly billings)
      const totalShareDue = Math.max(0, billingDue);

      // Monthly payment calculation
      const paidThisMonth = this.calculatePaidThisMonth(rawClient);

      // Calculate non-deposit charges
      const nonDepositDue = this.calculateNonDepositDue(rawClient);

      // Create detailed metadata for frontend
      const balanceMetadata = {
        billingDue,
        depositDue,
        nonBillingCharges,
        nonDepositDue,
        regularCharges,
        regularPayments,
        depositCharges,
        depositPayments,
        hasOnlyDepositRequirements: depositDue > 0 && nonDepositDue === 0,
      };

      // Determine last payment date
      const paymentTransactions = rawClient.transactions
        ? rawClient.transactions.filter((t) => t.type === "Payment")
        : [];
      const lastPaymentDate =
        paymentTransactions.length > 0 ? paymentTransactions[0].date : null;

      // Format transactions for the UI
      const transactionHistory = rawClient.transactions
        ? rawClient.transactions.map((t) => ({
            id: t.id,
            date: t.date,
            type: t.type,
            amount: t.amount,
            balanceAfter: t.balance_after,
            remarks: t.remarks || "",
            referenceNumber: t.reference_number || "",
            paymentMethod: t.payment_method || "",
          }))
        : [];

      // Calculate billing payments by related billing ID
      const billingPayments = {};
      if (rawClient.transactions) {
        rawClient.transactions
          .filter((t) => t.type === "Payment" && t.related_billing_id)
          .forEach((payment) => {
            const billingId = payment.related_billing_id;
            if (!billingPayments[billingId]) {
              billingPayments[billingId] = 0;
            }
            billingPayments[billingId] += parseFloat(payment.amount || 0);
          });
      }

      // Format monthly billing for the UI with currency details and payment info
      const monthlyBilling = rawClient.billings
        ? rawClient.billings.map((b) => {
            // Ensure we include the currency details
            const currencyDetails = b.currencyDetails || [];
            const paidAmount = billingPayments[b.id] || 0;

            return {
              id: b.id,
              month: b.month,
              label: b.label,
              gameProvider: b.game_provider,
              currency: b.currency, // Will be USD for multi-currency
              totalGGR: b.total_ggr, // Total in USD
              shareAmount: b.share_amount, // This is in USD
              datePosted: b.date_posted,
              status: b.status,
              // Include payment info
              paidAmount: paidAmount,
              remainingAmount: Math.max(
                0,
                parseFloat(b.final_amount) - paidAmount
              ),
              // Include currency details for multi-currency support
              hasMultipleCurrencies: currencyDetails.length > 0,
              currencyDetails: currencyDetails.map((cd) => ({
                currency: cd.currency,
                ggrAmount: parseFloat(cd.ggr_amount),
                exchangeRate: parseFloat(cd.exchange_rate),
                usdEquivalent: parseFloat(cd.usd_equivalent),
              })),
              breakdown: {
                totalGGR: b.total_ggr,
                sharePercentage: b.share_percentage,
                platformFee: b.platform_fee,
                finalAmount: b.final_amount,
                currency: "USD", // Always USD for calculations
              },
            };
          })
        : [];

      return {
        id: rawClient.id,
        name: rawClient.name,
        status: rawClient.status,
        onboardingDate: rawClient.onboarding_date,
        totalShareDue: totalShareDue,
        paidThisMonth,
        outstandingBalance,
        securityDeposit,
        additionalDeposit,
        balanceMetadata,
        lastPaymentDate,
        transactionHistory,
        monthlyBilling,
        default_currency: "USD",
      };
    });
  }

  /**
   * Calculate charges that are not included in monthly billing
   * This helps account for penalty charges, adjustments, etc.
   * @param {Object} client - Raw client data
   * @returns {number} - Total amount of non-billing charges
   */
  calculateNonBillingCharges(client) {
    if (!client.transactions || client.transactions.length === 0) {
      return 0;
    }

    // Sum up charges that are not Share Due or Deposit
    return client.transactions
      .filter(
        (t) =>
          t.type !== "Share Due" &&
          t.type !== "Deposit" &&
          t.type !== "Payment" &&
          parseFloat(t.amount) < 0
      )
      .reduce((total, t) => total + Math.abs(parseFloat(t.amount)), 0);
  }

  /**
   * Calculate billing due from all outstanding billings (excluding deposits)
   * @param {Object} client - Raw client data
   * @returns {number} - Billing due amount
   */
  calculateBillingDue(client) {
    if (!client.billings || client.billings.length === 0) {
      return 0;
    }

    return client.billings.reduce((total, billing) => {
      if (billing.status === "Unpaid") {
        return total + parseFloat(billing.final_amount);
      } else if (billing.status === "Partially Paid") {
        // Calculate how much is still due for partially paid billings
        const paidAmount = client.transactions
          .filter(
            (t) => t.type === "Payment" && t.related_billing_id === billing.id
          )
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return (
          total + Math.max(0, parseFloat(billing.final_amount) - paidAmount)
        );
      }
      return total;
    }, 0);
  }

  /**
   * Calculate non-deposit charge balance
   * This helps distinguish between deposit requirements and other charges
   * @param {Object} client - Raw client data
   * @returns {number} - Non-deposit due amount
   */
  calculateNonDepositDue(client) {
    if (!client.transactions || client.transactions.length === 0) {
      return 0;
    }

    return (
      client.transactions
        .filter((t) => t.type !== "Deposit" && t.type !== "Payment")
        .reduce((total, t) => total + parseFloat(t.amount), 0) * -1
    ); // Convert to positive
  }

  /**
   * Calculate amount paid this month
   * @param {Object} client - Raw client data
   * @returns {number} - Amount paid this month
   */
  calculatePaidThisMonth(client) {
    if (!client.transactions || client.transactions.length === 0) {
      return 0;
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only count positive amounts (payments)
    return client.transactions
      .filter(
        (t) => t.type === "Payment" && new Date(t.date) >= firstDayOfMonth
      )
      .reduce((total, t) => total + Math.abs(parseFloat(t.amount)), 0);
  }

  /**
   * Add a charge to a client's account
   * @param {number} clientId - Client ID
   * @param {Object} chargeData - Charge details
   * @returns {Object} - Updated client data
   */
  async addCharge(clientId, chargeData) {
    const transaction = await sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Get the current balance
      const lastTransaction = await ClientTransaction.findOne({
        where: { client_id: clientId },
        order: [
          ["date", "DESC"],
          ["id", "DESC"],
        ],
        transaction,
      });

      const currentBalance = lastTransaction
        ? parseFloat(lastTransaction.balance_after)
        : 0;

      let chargeAmount = parseFloat(chargeData.amount);
      let finalAmountUsd = chargeAmount; // Default to the provided amount

      // If this is a Share Due charge, create a monthly billing record
      if (chargeData.type === "Share Due" && chargeData.monthlyBillingData) {
        const billingData = chargeData.monthlyBillingData;
        const gameProvider = chargeData.gameProvider || "General";

        // Handle the case for multiple currencies
        const currencyDetails = chargeData.currencyDetails || [];

        // Calculate total GGR in USD across all currencies
        let totalGgrUsd = 0;

        // If no currency details provided, use the old single-currency logic
        if (currencyDetails.length === 0 && chargeData.totalGGR) {
          const currency = chargeData.currency || "USD";
          const exchangeRate = parseFloat(chargeData.exchangeRate) || 1.0;

          // Convert single GGR to USD
          totalGgrUsd = parseFloat(chargeData.totalGGR) * exchangeRate;

          // Add to currency details for consistent processing
          currencyDetails.push({
            currency,
            ggrAmount: parseFloat(chargeData.totalGGR),
            exchangeRate,
            usdEquivalent: totalGgrUsd,
          });
        } else {
          // Calculate total GGR in USD from all currencies
          totalGgrUsd = currencyDetails.reduce((sum, detail) => {
            const ggrAmount = parseFloat(detail.ggrAmount) || 0;
            const exchangeRate = parseFloat(detail.exchangeRate) || 1.0;
            const usdEquivalent = ggrAmount * exchangeRate;

            return sum + usdEquivalent;
          }, 0);
        }

        // Calculate share amount and final amount in USD
        const sharePercentage = parseFloat(chargeData.sharePercentage) || 0;
        const platformFee = parseFloat(chargeData.platformFee) || 0;

        const shareAmountUsd = (totalGgrUsd * sharePercentage) / 100;
        finalAmountUsd = shareAmountUsd + platformFee;

        // Check if a billing record already exists for this month and game provider
        const existingBilling = await ClientBilling.findOne({
          where: {
            client_id: clientId,
            month: billingData.month,
            game_provider: gameProvider,
          },
          transaction,
        });

        if (existingBilling) {
          throw new AppError(
            `A billing record for ${billingData.label} and provider "${gameProvider}" already exists`,
            400
          );
        }

        // Create the billing record - we'll set currency to USD since that's our calculation base
        const billing = await ClientBilling.create(
          {
            client_id: clientId,
            month: billingData.month,
            label: billingData.label,
            game_provider: gameProvider,
            currency: "USD", // Always USD as it's our calculation base
            exchange_rate: 1.0, // Not used for multi-currency, but set to 1.0 for USD
            total_ggr: totalGgrUsd, // Store the total GGR in USD
            share_amount: shareAmountUsd,
            share_percentage: sharePercentage,
            platform_fee: platformFee,
            final_amount: finalAmountUsd,
            date_posted: chargeData.date || new Date(),
            status: "Unpaid",
            notes:
              chargeData.remarks ||
              `Share due for ${billingData.label} (${gameProvider})`,
          },
          { transaction }
        );

        // Store all currency details related to this billing
        for (const detail of currencyDetails) {
          await ClientBillingCurrency.create(
            {
              billing_id: billing.id,
              currency: detail.currency,
              ggr_amount: parseFloat(detail.ggrAmount),
              exchange_rate: parseFloat(detail.exchangeRate),
              usd_equivalent:
                parseFloat(detail.ggrAmount) * parseFloat(detail.exchangeRate),
            },
            { transaction }
          );
        }

        // Use the final USD amount for the charge
        chargeAmount = finalAmountUsd;

        // Create the transaction
        const clientTransaction = await ClientTransaction.create(
          {
            client_id: clientId,
            type: chargeData.type,
            amount: -chargeAmount, // Negative amount for charges
            balance_before: currentBalance,
            balance_after: currentBalance + chargeAmount,
            date: chargeData.date || new Date(),
            remarks: chargeData.remarks || `${chargeData.type} charge`,
            reference_number: chargeData.referenceNumber,
            currency: "USD", // Always store charges in USD
            related_billing_id: billing.id,
          },
          { transaction }
        );
      } else {
        // For charge types other than Share Due, we increase the balance (negative amount for the client)
        const newBalance = currentBalance + chargeAmount;

        // Create the transaction
        await ClientTransaction.create(
          {
            client_id: clientId,
            type: chargeData.type,
            amount: -chargeAmount, // Negative amount for charges (consistent with financial convention)
            balance_before: currentBalance,
            balance_after: newBalance,
            date: chargeData.date || new Date(),
            remarks: chargeData.remarks || `${chargeData.type} charge`,
            reference_number: chargeData.referenceNumber,
            currency: "USD", // Always store charges in USD
          },
          { transaction }
        );

        // If this is a deposit charge, update the deposit record
        if (
          chargeData.type === "Deposit" &&
          chargeData.depositType &&
          chargeData.amount
        ) {
          let deposit = await ClientDeposit.findOne({
            where: { client_id: clientId },
            transaction,
          });

          if (!deposit) {
            deposit = await ClientDeposit.create(
              {
                client_id: clientId,
                security_required: 0,
                security_paid: 0,
                additional_required: 0,
                additional_paid: 0,
              },
              { transaction }
            );
          }

          if (chargeData.depositType === "security") {
            deposit.security_required =
              parseFloat(deposit.security_required) + chargeAmount;
          } else if (chargeData.depositType === "additional") {
            deposit.additional_required =
              parseFloat(deposit.additional_required) + chargeAmount;
          }

          await deposit.save({ transaction });
        }
      }

      await transaction.commit();

      // Return updated client data
      return await this.getClientBillingById(clientId);
    } catch (error) {
      await transaction.rollback();
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in addCharge for client ${clientId}:`, error);
      throw new AppError("Failed to add charge to client", 500);
    }
  }

  /**
   * 08/03
   * Record a payment for a client
   * @param {number} clientId - Client ID
   * @param {Object} paymentData - Payment details
   * @returns {Object} - Updated client data
   */
  async recordPayment(clientId, paymentData) {
    // Basic validation of payment data
    if (!paymentData || typeof paymentData !== "object") {
      throw new AppError("Invalid payment data", 400);
    }

    if (
      isNaN(parseFloat(paymentData.amount)) ||
      parseFloat(paymentData.amount) <= 0
    ) {
      throw new AppError("Payment amount must be a positive number", 400);
    }

    if (!paymentData.paymentMethod) {
      throw new AppError("Payment method is required", 400);
    }

    // Define context variables outside the try block for error handling
    let hasDepositRequirements = false;
    let hasMonthlyBillings = false;
    let unpaidBillings = [];
    let securityDepositShortfall = 0;
    let additionalDepositShortfall = 0;

    const transaction = await sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Get deposit requirements
      let deposit = await ClientDeposit.findOne({
        where: { client_id: clientId },
        transaction,
      });

      // Calculate deposit shortfalls
      securityDepositShortfall = deposit
        ? Math.max(
            0,
            parseFloat(deposit.security_required) -
              parseFloat(deposit.security_paid)
          )
        : 0;

      additionalDepositShortfall = deposit
        ? Math.max(
            0,
            parseFloat(deposit.additional_required) -
              parseFloat(deposit.additional_paid)
          )
        : 0;

      hasDepositRequirements =
        securityDepositShortfall > 0 || additionalDepositShortfall > 0;

      // Get unpaid billings
      unpaidBillings = await ClientBilling.findAll({
        where: {
          client_id: clientId,
          status: {
            [Op.ne]: "Paid",
          },
        },
        transaction,
      });

      hasMonthlyBillings = unpaidBillings.length > 0;

      // Get the current balance
      const lastTransaction = await ClientTransaction.findOne({
        where: { client_id: clientId },
        order: [
          ["date", "DESC"],
          ["id", "DESC"],
        ],
        transaction,
      });

      const currentBalance = lastTransaction
        ? parseFloat(lastTransaction.balance_after)
        : 0;

      // For payments, we decrease the balance (client owes less)
      const paymentAmount = parseFloat(paymentData.amount);
      let depositAmount = 0;

      // Process deposit payment if applicable
      if (paymentData.depositPayment && paymentData.depositAmount > 0) {
        depositAmount = parseFloat(paymentData.depositAmount);

        if (!deposit) {
          // Create a new deposit record if it doesn't exist
          deposit = await ClientDeposit.create(
            {
              client_id: clientId,
              security_required:
                paymentData.depositType === "security" ? depositAmount : 0,
              security_paid:
                paymentData.depositType === "security" ? depositAmount : 0,
              additional_required:
                paymentData.depositType === "additional" ? depositAmount : 0,
              additional_paid:
                paymentData.depositType === "additional" ? depositAmount : 0,
              last_deposit_date: paymentData.date || new Date(),
            },
            { transaction }
          );
        } else {
          // Update existing deposit record based on deposit type
          if (paymentData.depositType === "security") {
            deposit.security_paid =
              parseFloat(deposit.security_paid) + depositAmount;
          } else {
            deposit.additional_paid =
              parseFloat(deposit.additional_paid) + depositAmount;
          }

          deposit.last_deposit_date = paymentData.date || new Date();
          await deposit.save({ transaction });
        }
      }

      // Calculate the new balance after payment
      const newBalance = Math.max(0, currentBalance - paymentAmount);

      // Create the payment transaction
      const paymentTransaction = await ClientTransaction.create(
        {
          client_id: clientId,
          type: "Payment",
          amount: paymentAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          date: paymentData.date || new Date(),
          remarks:
            paymentData.remarks ||
            generateDefaultRemarks(paymentData, unpaidBillings),
          reference_number: paymentData.referenceNumber,
          payment_method: paymentData.paymentMethod,
          related_billing_id: paymentData.relatedBillingId || null,
        },
        { transaction }
      );

      // Update billing status if this payment is related to a specific billing
      if (paymentData.relatedBillingId) {
        const relatedBillingId = parseInt(paymentData.relatedBillingId);

        if (isNaN(relatedBillingId)) {
          throw new AppError("Invalid billing ID provided", 400);
        }

        // Find the related billing record
        const billing = await ClientBilling.findOne({
          where: {
            id: relatedBillingId,
            client_id: clientId,
          },
          transaction,
        });

        if (!billing) {
          throw new AppError("Related billing record not found", 404);
        }

        // Get total payments made for this billing (including the current one)
        const billingPayments = await ClientTransaction.findAll({
          where: {
            client_id: clientId,
            type: "Payment",
            related_billing_id: relatedBillingId,
          },
          transaction,
        });

        // Calculate total payments including the current one
        const totalPayments = billingPayments.reduce(
          (sum, payment) => sum + parseFloat(payment.amount),
          0
        );

        // Get the final amount of the billing
        const billingAmount = parseFloat(billing.final_amount);

        // Determine the new billing status
        let newStatus;
        if (totalPayments >= billingAmount) {
          newStatus = "Paid";
        } else if (totalPayments > 0) {
          newStatus = "Partially Paid";
        } else {
          newStatus = "Unpaid";
        }

        // Update the billing status
        billing.status = newStatus;
        await billing.save({ transaction });
      }

      await transaction.commit();

      // Return updated client data
      return await this.getClientBillingById(clientId);
    } catch (error) {
      await transaction.rollback();

      // Enhanced error logging with complete context
      console.error("Error in recordPayment service:", {
        clientId,
        errorMessage: error.message,
        errorStack: error.stack,
        paymentData: JSON.stringify(paymentData),
        context: {
          hasDepositRequirements,
          hasMonthlyBillings,
          unpaidBillingCount: unpaidBillings.length,
          securityDepositShortfall,
          additionalDepositShortfall,
          providedRelatedBillingId: paymentData.relatedBillingId || "none",
          providedDepositAllocation: paymentData.depositPayment ? "yes" : "no",
        },
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(`Failed to record payment: ${error.message}`, 500);
    }
  }

  /**
   * Generate a billing statement PDF
   * @param {number} clientId - Client ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {string} - Path to the generated PDF
   */
  async generateBillingStatement(clientId, month) {
    try {
      const client = await Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      const billing = await ClientBilling.findOne({
        where: {
          client_id: clientId,
          month: month,
        },
      });

      if (!billing) {
        throw new AppError("Billing record not found", 404);
      }

      // Create a directory for statements if it doesn't exist
      const statementsDir = path.join(__dirname, "../../statements");
      if (!fs.existsSync(statementsDir)) {
        fs.mkdirSync(statementsDir, { recursive: true });
      }

      // Generate PDF filename
      const filename = `statement_${clientId}_${month}_${Date.now()}.pdf`;
      const outputPath = path.join(statementsDir, filename);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add content to PDF
      this.generatePdfContent(doc, client, billing);

      // Finalize the PDF
      doc.end();

      // Return the path to the PDF file
      return new Promise((resolve, reject) => {
        stream.on("finish", () => resolve(outputPath));
        stream.on("error", reject);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(
        `Error in generateBillingStatement for client ${clientId}, month ${month}:`,
        error
      );
      throw new AppError("Failed to generate billing statement", 500);
    }
  }

  /**
   * Generate the content for the PDF statement
   * @param {PDFDocument} doc - PDF document
   * @param {Object} client - Client object
   * @param {Object} billing - Billing object
   */
  generatePdfContent(doc, client, billing) {
    // Add header
    doc.fontSize(20).text("Billing Statement", { align: "center" }).moveDown();

    // Add client info
    doc
      .fontSize(12)
      .text(`Client: ${client.name}`, { align: "left" })
      .text(`Statement Period: ${billing.label}`, { align: "left" })
      .text(
        `Date Issued: ${new Date(billing.date_posted).toLocaleDateString()}`,
        {
          align: "left",
        }
      )
      .text(`Statement ID: ${billing.id}`, { align: "left" })
      .moveDown();

    // Add billing summary
    doc.fontSize(16).text("Billing Summary", { align: "left" }).moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Total GGR: $${parseFloat(billing.total_ggr).toFixed(2)}`, {
      align: "left",
    });
    doc.text(`Share Percentage: ${billing.share_percentage}%`, {
      align: "left",
    });
    doc.text(`Platform Fee: $${parseFloat(billing.platform_fee).toFixed(2)}`, {
      align: "left",
    });

    if (parseFloat(billing.adjustments) !== 0) {
      doc.text(
        `Adjustments: ${
          parseFloat(billing.adjustments) > 0 ? "+" : ""
        }$${parseFloat(billing.adjustments).toFixed(2)}`,
        { align: "left" }
      );
    }

    doc
      .moveDown()
      .fontSize(14)
      .text(
        `Total Amount Due: $${parseFloat(billing.final_amount).toFixed(2)}`,
        {
          align: "left",
        }
      )
      .text(`Status: ${billing.status}`, { align: "left" })
      .moveDown(2);

    // Add payment instructions
    doc
      .fontSize(14)
      .text("Payment Instructions", { align: "left" })
      .moveDown(0.5);

    doc.fontSize(12).text(
      `Please remit payment by the due date to avoid any service interruptions. 
       Payment can be made via bank transfer or credit card through our payment portal.
       For any billing inquiries, please contact our finance department.`,
      { align: "left" }
    );

    // Add footer
    const footerY = doc.page.height - 100;
    doc
      .fontSize(10)
      .text(
        "This is an electronic statement and requires no signature. Please keep this for your records.",
        50,
        footerY,
        { align: "center" }
      );
  }

  /**
   * Create a new billing record for a client
   * @param {number} clientId - Client ID
   * @param {Object} billingData - Billing details
   * @returns {Object} - Created billing record
   */
  async createBilling(clientId, billingData) {
    const transaction = await sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Check if billing for this month already exists
      const existingBilling = await ClientBilling.findOne({
        where: {
          client_id: clientId,
          month: billingData.month,
        },
        transaction,
      });

      if (existingBilling) {
        throw new AppError(
          `Billing for ${billingData.month} already exists`,
          400
        );
      }

      // Calculate final amount
      const finalAmount =
        parseFloat(billingData.shareAmount || 0) -
        parseFloat(billingData.platformFee || 0) +
        parseFloat(billingData.adjustments || 0);

      // Create billing record
      const billing = await ClientBilling.create(
        {
          client_id: clientId,
          month: billingData.month,
          label: billingData.label,
          total_ggr: billingData.totalGGR,
          share_amount: billingData.shareAmount,
          share_percentage: billingData.sharePercentage,
          platform_fee: billingData.platformFee || 0,
          adjustments: billingData.adjustments || 0,
          final_amount: finalAmount,
          date_posted: billingData.datePosted || new Date(),
          status: "Unpaid",
          notes: billingData.notes,
        },
        { transaction }
      );

      // Create a transaction record for this billing
      const lastTransaction = await ClientTransaction.findOne({
        where: { client_id: clientId },
        order: [["date", "DESC"]],
        transaction,
      });

      const currentBalance = lastTransaction
        ? lastTransaction.balance_after
        : 0;
      const newBalance = currentBalance - finalAmount;

      await ClientTransaction.create(
        {
          client_id: clientId,
          type: "Share Due",
          amount: -finalAmount, // Negative amount for dues
          balance_before: currentBalance,
          balance_after: newBalance,
          date: billingData.datePosted || new Date(),
          remarks: `Share due for ${billingData.label}`,
          related_billing_id: billing.id,
        },
        { transaction }
      );

      await transaction.commit();
      return billing;
    } catch (error) {
      await transaction.rollback();
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in createBilling for client ${clientId}:`, error);
      throw new AppError("Failed to create billing record", 500);
    }
  }
}

module.exports = new ClientBillingService();
