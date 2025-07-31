// src/seeders/clientBillingSeed.js
const {
  Client,
  ClientBilling,
  ClientTransaction,
  ClientDeposit,
} = require("../models");

/**
 * Seed client billing data for development
 *
 * Financial conventions:
 * 1. Positive balance means client owes money
 * 2. Charges (Share Due, Penalty, etc.) INCREASE balance (positive amount)
 * 3. Payments DECREASE balance (negative amount)
 * 4. Deposits are treated as charges (increasing balance)
 */
const seedClientBilling = async () => {
  try {
    console.log("Seeding client billing data...");

    // Get all clients
    const clients = await Client.findAll();

    for (const client of clients) {
      // Create deposit record for each client
      await ClientDeposit.create({
        client_id: client.id,
        security_required: 5000.0,
        security_paid: client.id % 2 === 0 ? 5000.0 : 2500.0, // Some clients have paid in full, others partially
        additional_required: client.id % 3 === 0 ? 2000.0 : 0, // Some clients have additional required
        additional_paid: client.id % 3 === 0 ? 1000.0 : 0,
        last_deposit_date: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ), // Random date within last 30 days
      });

      // Generate 6 months of billing history
      const currentDate = new Date();
      let balance = 0;

      for (let i = 0; i < 6; i++) {
        const billingDate = new Date(currentDate);
        billingDate.setMonth(currentDate.getMonth() - i);

        const month = `${billingDate.getFullYear()}-${String(
          billingDate.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthLabel = billingDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        // Generate random billing amounts
        const totalGGR = Math.floor(Math.random() * 100000) + 10000;
        const sharePercentage = 20 + Math.floor(Math.random() * 20); // 20-40%
        const shareAmount = parseFloat(
          ((totalGGR * sharePercentage) / 100).toFixed(2)
        );
        const platformFee = parseFloat((shareAmount * 0.05).toFixed(2)); // 5% platform fee
        const adjustments =
          Math.random() > 0.7
            ? parseFloat((Math.random() * 1000 - 500).toFixed(2))
            : 0; // Occasional adjustments
        const finalAmount = parseFloat(
          (shareAmount - platformFee + adjustments).toFixed(2)
        );

        // Determine status based on month
        let status;
        if (i >= 3) {
          status = "Paid"; // Older invoices are paid
        } else if (i === 2) {
          status = Math.random() > 0.5 ? "Paid" : "Partially Paid";
        } else if (i === 1) {
          status = Math.random() > 0.7 ? "Partially Paid" : "Unpaid";
        } else {
          status = "Unpaid"; // Current invoice is unpaid
        }

        // Create billing record
        const billing = await ClientBilling.create({
          client_id: client.id,
          month,
          label: monthLabel,
          total_ggr: totalGGR,
          share_amount: shareAmount,
          share_percentage: sharePercentage,
          platform_fee: platformFee,
          adjustments,
          final_amount: finalAmount,
          date_posted: new Date(
            billingDate.getFullYear(),
            billingDate.getMonth(),
            15
          ), // 15th of each month
          status,
          notes: `Monthly billing for ${monthLabel}`,
        });

        // Create Share Due transaction - INCREASES balance (client owes more)
        const shareDueAmount = finalAmount; // Positive amount (debt to client)
        const dueTxn = await ClientTransaction.create({
          client_id: client.id,
          type: "Share Due",
          amount: shareDueAmount, // Positive amount for charge
          balance_before: balance,
          balance_after: balance + shareDueAmount,
          date: new Date(billingDate.getFullYear(), billingDate.getMonth(), 15),
          remarks: `Share due for ${monthLabel}`,
          related_billing_id: billing.id,
        });

        // Update running balance
        balance = dueTxn.balance_after;

        // For paid or partially paid invoices, create payment transactions
        if (status === "Paid" || status === "Partially Paid") {
          const paymentDate = new Date(
            billingDate.getFullYear(),
            billingDate.getMonth(),
            25
          ); // Pay on the 25th

          const paymentAmount =
            status === "Paid"
              ? finalAmount
              : parseFloat(
                  (finalAmount * (0.3 + Math.random() * 0.4)).toFixed(2)
                ); // 30-70% of total

          // Payment DECREASES balance (client owes less)
          await ClientTransaction.create({
            client_id: client.id,
            type: "Payment",
            amount: -paymentAmount, // Negative amount for payment
            balance_before: balance,
            balance_after: balance - paymentAmount,
            date: paymentDate,
            remarks: `Payment for ${monthLabel}`,
            reference_number: `PAY-${Math.floor(Math.random() * 1000000)}`,
            payment_method:
              Math.random() > 0.5 ? "Bank Transfer" : "Credit Card",
            related_billing_id: billing.id,
          });

          // Update running balance
          balance = balance - paymentAmount;
        }
      }

      // Add security deposit transactions (these INCREASE client's balance)
      if (client.id % 2 === 0) {
        // Security deposit charge
        const securityDepositAmount = 5000.0;
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: securityDepositAmount, // Positive amount (debt to client)
          balance_before: balance,
          balance_after: balance + securityDepositAmount,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            5
          ), // Charge first
          remarks: "Security deposit requirement",
          reference_number: `DEP-REQ-${Math.floor(Math.random() * 1000000)}`,
        });

        balance += securityDepositAmount;

        // Security deposit payment (DECREASES balance)
        await ClientTransaction.create({
          client_id: client.id,
          type: "Payment",
          amount: -securityDepositAmount, // Negative amount for payment
          balance_before: balance,
          balance_after: balance - securityDepositAmount,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            10
          ), // Pay 5 days later
          remarks: "Security deposit payment",
          reference_number: `DEP-PAY-${Math.floor(Math.random() * 1000000)}`,
          payment_method: "Bank Transfer",
        });

        balance -= securityDepositAmount;
      } else {
        // Partial security deposit scenario
        const securityDepositAmount = 5000.0;
        const partialPayment = 2500.0;

        // Security deposit charge
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: securityDepositAmount, // Positive amount (debt to client)
          balance_before: balance,
          balance_after: balance + securityDepositAmount,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            5
          ), // Charge first
          remarks: "Security deposit requirement",
          reference_number: `DEP-REQ-${Math.floor(Math.random() * 1000000)}`,
        });

        balance += securityDepositAmount;

        // Partial security deposit payment
        await ClientTransaction.create({
          client_id: client.id,
          type: "Payment",
          amount: -partialPayment, // Negative amount for payment
          balance_before: balance,
          balance_after: balance - partialPayment,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            10
          ),
          remarks: "Partial security deposit payment",
          reference_number: `DEP-PAY-${Math.floor(Math.random() * 1000000)}`,
          payment_method: "Bank Transfer",
        });

        balance -= partialPayment;
      }

      // Add additional deposit for some clients
      if (client.id % 3 === 0) {
        const additionalDepositAmount = 2000.0;
        const additionalPayment = 1000.0;

        // Additional deposit charge
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: additionalDepositAmount, // Positive amount (debt to client)
          balance_before: balance,
          balance_after: balance + additionalDepositAmount,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            2
          ),
          remarks: "Additional deposit requirement",
          reference_number: `ADD-DEP-REQ-${Math.floor(
            Math.random() * 1000000
          )}`,
        });

        balance += additionalDepositAmount;

        // Additional deposit payment
        await ClientTransaction.create({
          client_id: client.id,
          type: "Payment",
          amount: -additionalPayment, // Negative amount for payment
          balance_before: balance,
          balance_after: balance - additionalPayment,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            5
          ),
          remarks: "Additional deposit payment",
          reference_number: `ADD-DEP-PAY-${Math.floor(
            Math.random() * 1000000
          )}`,
          payment_method: "Bank Transfer",
        });

        balance -= additionalPayment;
      }

      // Add occasional penalty or adjustment transactions
      if (client.id % 4 === 0) {
        const penaltyAmount = 500.0;

        // Penalty INCREASES balance
        await ClientTransaction.create({
          client_id: client.id,
          type: "Penalty",
          amount: penaltyAmount, // Positive amount for penalty
          balance_before: balance,
          balance_after: balance + penaltyAmount,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            20
          ),
          remarks: "Late payment penalty",
          reference_number: `PEN-${Math.floor(Math.random() * 1000000)}`,
        });

        balance += penaltyAmount;
      }

      if (client.id % 5 === 0) {
        // Adjustments can be positive (client owes more) or negative (client owes less)
        const adjAmount = Math.random() > 0.5 ? 250.0 : -250.0;

        await ClientTransaction.create({
          client_id: client.id,
          type: "Adjustment",
          amount: adjAmount,
          balance_before: balance,
          balance_after: balance + adjAmount,
          date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
          remarks:
            adjAmount < 0
              ? "Billing correction in client's favor"
              : "Billing correction against client",
          reference_number: `ADJ-${Math.floor(Math.random() * 1000000)}`,
        });

        balance += adjAmount;
      }
    }

    console.log("Client billing data seeded successfully");
  } catch (error) {
    console.error("Error seeding client billing data:", error);
    throw error;
  }
};

module.exports = seedClientBilling;
