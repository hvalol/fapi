const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClientTransaction = sequelize.define(
  "ClientTransaction",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "Payment",
        "Share Due",
        "Deposit",
        "Penalty",
        "Adjustment"
      ),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    balance_before: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    balance_after: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reference_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    related_billing_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "client_transactions",
    underscored: true,
  }
);

module.exports = ClientTransaction;
