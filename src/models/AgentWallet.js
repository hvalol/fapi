"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AgentWallet = sequelize.define(
    "AgentWallet",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      agent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "agents", key: "id" },
      },
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "clients", key: "id" },
      },
      wallet_type: {
        type: DataTypes.ENUM("seamless", "transfer", "holdem"),
        allowNull: false,
      },
      topup_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0, // or whatever default makes sense
        comment: "Topup rate for this wallet type",
      },
      balance: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "USD",
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
      tableName: "agent_wallets",
      underscored: true,
      timestamps: true,
    }
  );
  return AgentWallet;
};
