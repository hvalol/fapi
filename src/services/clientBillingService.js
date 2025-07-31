const {
  Client,
  ClientBilling,
  ClientTransaction,
  ClientDeposit,
  sequelize,
} = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

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

      // Calculate aggregate metrics
      const totalDue = this.calculateTotalDue(rawClient);
      const paidThisMonth = this.calculatePaidThisMonth(rawClient);
      const outstandingBalance = totalDue - paidThisMonth;

      // Prepare security deposit data
      const securityDeposit = {
        required: rawClient.deposit ? rawClient.deposit.security_required : 0,
        paid: rawClient.deposit ? rawClient.deposit.security_paid : 0,
      };

      // Prepare additional deposit data
      const additionalDeposit = {
        required: rawClient.deposit ? rawClient.deposit.additional_required : 0,
        paid: rawClient.deposit ? rawClient.deposit.additional_paid : 0,
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

      // Format monthly billing for the UI
      const monthlyBilling = rawClient.billings
        ? rawClient.billings.map((b) => ({
            month: b.month,
            label: b.label,
            totalGGR: b.total_ggr,
            shareAmount: b.final_amount,
            datePosted: b.date_posted,
            status: b.status,
            breakdown: {
              totalGGR: b.total_ggr,
              sharePercentage: b.share_percentage,
              platformFee: b.platform_fee,
              adjustments: b.adjustments,
              finalAmount: b.final_amount,
            },
          }))
        : [];

      return {
        id: rawClient.id,
        name: rawClient.name,
        status: rawClient.status,
        onboardingDate: rawClient.onboarding_date,
        totalDue,
        paidThisMonth,
        outstandingBalance,
        securityDeposit,
        additionalDeposit,
        lastPaymentDate,
        transactionHistory,
        monthlyBilling,
        default_currency: "USD", // Default currency - can be made dynamic later
      };
    });
  }

  /**
   * Calculate total due from all outstanding billings
   * @param {Object} client - Raw client data
   * @returns {number} - Total due amount
   */
  calculateTotalDue(client) {
    if (!client.billings || client.billings.length === 0) {
      return 0;
    }

    return client.billings.reduce((total, billing) => {
      if (billing.status !== "Paid") {
        return total + parseFloat(billing.final_amount);
      }
      return total;
    }, 0);
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
        order: [["date", "DESC"]],
        transaction,
      });

      const currentBalance = lastTransaction
        ? lastTransaction.balance_after
        : 0;
      const newBalance = currentBalance + parseFloat(chargeData.amount); // Add because charges increase what client owes

      // Create the transaction
      await ClientTransaction.create(
        {
          client_id: clientId,
          type: chargeData.type,
          amount: -parseFloat(chargeData.amount), // Negative amount for charges
          balance_before: currentBalance,
          balance_after: newBalance,
          date: chargeData.date || new Date(),
          remarks: chargeData.remarks || `${chargeData.type} charge`,
          reference_number: chargeData.referenceNumber,
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
            parseFloat(deposit.security_required) +
            parseFloat(chargeData.amount);
        } else if (chargeData.depositType === "additional") {
          deposit.additional_required =
            parseFloat(deposit.additional_required) +
            parseFloat(chargeData.amount);
        }

        await deposit.save({ transaction });
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
   * Record a payment for a client
   * @param {number} clientId - Client ID
   * @param {Object} paymentData - Payment details
   * @returns {Object} - Updated client data
   */
  async recordPayment(clientId, paymentData) {
    const transaction = await sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId);
      if (!client) {
        throw new AppError("Client not found", 404);
      }

      // Get the current balance
      const lastTransaction = await ClientTransaction.findOne({
        where: { client_id: clientId },
        order: [["date", "DESC"]],
        transaction,
      });

      const currentBalance = lastTransaction
        ? lastTransaction.balance_after
        : 0;
      const newBalance = currentBalance - parseFloat(paymentData.amount); // Subtract because payments reduce what client owes

      // Create the payment transaction
      await ClientTransaction.create(
        {
          client_id: clientId,
          type: "Payment",
          amount: parseFloat(paymentData.amount), // Positive amount for payments
          balance_before: currentBalance,
          balance_after: newBalance,
          date: paymentData.date || new Date(),
          remarks:
            paymentData.remarks ||
            `Payment received - ${paymentData.paymentMethod}`,
          reference_number: paymentData.referenceNumber,
          payment_method: paymentData.paymentMethod,
          related_billing_id: paymentData.relatedBillingId || null,
        },
        { transaction }
      );

      // Update billing status if this payment is related to a specific billing
      if (paymentData.relatedBillingId) {
        const billing = await ClientBilling.findByPk(
          paymentData.relatedBillingId,
          { transaction }
        );

        if (billing) {
          // Get all payments for this billing
          const billingPayments = await ClientTransaction.findAll({
            where: {
              client_id: clientId,
              type: "Payment",
              related_billing_id: billing.id,
            },
            transaction,
          });

          const totalPaid = billingPayments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount),
            0
          );

          // Update billing status based on payment amount
          if (totalPaid >= parseFloat(billing.final_amount)) {
            billing.status = "Paid";
          } else if (totalPaid > 0) {
            billing.status = "Partially Paid";
          }

          await billing.save({ transaction });
        }
      }

      // If this is a deposit payment, update the deposit record
      if (
        paymentData.depositPayment &&
        paymentData.depositType &&
        paymentData.amount
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

        if (paymentData.depositType === "security") {
          deposit.security_paid =
            parseFloat(deposit.security_paid) + parseFloat(paymentData.amount);
        } else if (paymentData.depositType === "additional") {
          deposit.additional_paid =
            parseFloat(deposit.additional_paid) +
            parseFloat(paymentData.amount);
        }

        deposit.last_deposit_date = paymentData.date || new Date();
        await deposit.save({ transaction });
      }

      await transaction.commit();

      // Return updated client data
      return await this.getClientBillingById(clientId);
    } catch (error) {
      await transaction.rollback();
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error in recordPayment for client ${clientId}:`, error);
      throw new AppError("Failed to record payment", 500);
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
