const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
// TODO: ADD DUE DATE PROPERTY
const ClientBilling = sequelize.define(
  "ClientBilling",
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
    month: {
      type: DataTypes.STRING(7), // Format: YYYY-MM
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false, // E.g., "July 2025"
    },
    game_provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General", // Default provider if none specified
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD", // Default currency
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1.0, // Default exchange rate (1:1 for USD to USD)
      comment: "Exchange rate from the transaction currency to USD",
    },
    total_ggr: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    share_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    share_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    platform_fee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    final_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Unpaid", "Partially Paid", "Paid"),
      defaultValue: "Unpaid",
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "client_billings",
    underscored: true,
    indexes: [
      // Add unique index to prevent duplicate billings for the same month, client, and game provider
      {
        unique: true,
        fields: ["client_id", "month", "game_provider"],
        name: "client_billing_month_provider_unique",
      },
    ],
  }
);

module.exports = ClientBilling;
