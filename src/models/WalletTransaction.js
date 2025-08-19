"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WalletTransaction = sequelize.define(
    "WalletTransaction",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      wallet_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "agent_wallets", key: "id" },
      },
      transaction_type: {
        type: DataTypes.ENUM(
          "deposit",
          "withdraw",
          "adjustment",
          "provider_fee",
          "settlement"
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
      },
      balance_before: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
      },
      balance_after: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
      },
      reference_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: "updated_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "wallet_transactions",
      underscored: true,
      timestamps: true,
    }
  );
  return WalletTransaction;
};
