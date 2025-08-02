const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClientBillingCurrency = sequelize.define(
  "ClientBillingCurrency",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    billing_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    ggr_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      defaultValue: 1.0,
    },
    usd_equivalent: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "client_billing_currencies",
    underscored: true,
  }
);

module.exports = ClientBillingCurrency;
