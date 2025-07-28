// src/seeders/clientBillingSeed.js
const {
  Client,
  ClientBilling,
  ClientTransaction,
  ClientDeposit,
} = require("../models");

/**
 * Seed client billing data for development
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
        const shareAmount = ((totalGGR * sharePercentage) / 100).toFixed(2);
        const platformFee = (shareAmount * 0.05).toFixed(2); // 5% platform fee
        const adjustments =
          Math.random() > 0.7 ? (Math.random() * 1000 - 500).toFixed(2) : 0; // Occasional adjustments
        const finalAmount = (
          parseFloat(shareAmount) -
          parseFloat(platformFee) +
          parseFloat(adjustments)
        ).toFixed(2);

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

        // Create Share Due transaction
        const dueTxn = await ClientTransaction.create({
          client_id: client.id,
          type: "Share Due",
          amount: -finalAmount, // Negative for due
          balance_before: balance,
          balance_after: balance - parseFloat(finalAmount),
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
              ? parseFloat(finalAmount)
              : (parseFloat(finalAmount) * (0.3 + Math.random() * 0.4)).toFixed(
                  2
                ); // 30-70% of total

          await ClientTransaction.create({
            client_id: client.id,
            type: "Payment",
            amount: paymentAmount,
            balance_before: balance,
            balance_after: parseFloat(balance) + parseFloat(paymentAmount),
            date: paymentDate,
            remarks: `Payment for ${monthLabel}`,
            reference_number: `PAY-${Math.floor(Math.random() * 1000000)}`,
            payment_method:
              Math.random() > 0.5 ? "Bank Transfer" : "Credit Card",
            related_billing_id: billing.id,
          });

          // Update running balance
          balance = parseFloat(balance) + parseFloat(paymentAmount);
        }
      }

      // Add some deposit transactions
      if (client.id % 2 === 0) {
        // Security deposit payment
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: 5000.0,
          balance_before: balance,
          balance_after: balance + 5000.0,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            10
          ),
          remarks: "Security deposit payment",
          reference_number: `DEP-${Math.floor(Math.random() * 1000000)}`,
          payment_method: "Bank Transfer",
        });

        balance += 5000.0;
      } else {
        // Partial security deposit payment
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: 2500.0,
          balance_before: balance,
          balance_after: balance + 2500.0,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 2,
            10
          ),
          remarks: "Partial security deposit payment",
          reference_number: `DEP-${Math.floor(Math.random() * 1000000)}`,
          payment_method: "Bank Transfer",
        });

        balance += 2500.0;
      }

      // Add additional deposit for some clients
      if (client.id % 3 === 0) {
        await ClientTransaction.create({
          client_id: client.id,
          type: "Deposit",
          amount: 1000.0,
          balance_before: balance,
          balance_after: balance + 1000.0,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            5
          ),
          remarks: "Additional deposit payment",
          reference_number: `DEP-${Math.floor(Math.random() * 1000000)}`,
          payment_method: "Bank Transfer",
        });

        balance += 1000.0;
      }

      // Add occasional penalty or adjustment transactions
      if (client.id % 4 === 0) {
        await ClientTransaction.create({
          client_id: client.id,
          type: "Penalty",
          amount: -500.0,
          balance_before: balance,
          balance_after: balance - 500.0,
          date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            20
          ),
          remarks: "Late payment penalty",
          reference_number: `PEN-${Math.floor(Math.random() * 1000000)}`,
        });

        balance -= 500.0;
      }

      if (client.id % 5 === 0) {
        const adjAmount = Math.random() > 0.5 ? 250.0 : -250.0;

        await ClientTransaction.create({
          client_id: client.id,
          type: "Adjustment",
          amount: adjAmount,
          balance_before: balance,
          balance_after: balance + adjAmount,
          date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
          remarks:
            adjAmount > 0
              ? "Billing correction in client's favor"
              : "Billing correction adjustment",
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
