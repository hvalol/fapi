"use strict";
const { DataTypes } = require("sequelize");
// TODO: CHANGE USERID TO PLAYERID
module.exports = (sequelize) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      externalTransactionId: {
        type: DataTypes.STRING,
        field: "external_transaction_id",
        allowNull: true,
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("bet", "win", "rollback", "bonus"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "success", "failed", "rolled_back"),
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        field: "user_id",
        allowNull: false,
      },
      clientId: {
        type: DataTypes.INTEGER,
        field: "client_id",
        allowNull: true,
      },
      agentId: {
        type: DataTypes.INTEGER,
        field: "agent_id",
        allowNull: true,
      },
      gameId: {
        type: DataTypes.INTEGER,
        field: "game_id",
        allowNull: true,
      },
      vendorId: {
        type: DataTypes.INTEGER,
        field: "vendor_id",
        allowNull: true,
      },
      roundId: {
        type: DataTypes.STRING,
        field: "round_id",
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
      tableName: "transactions",
      underscored: true,
      timestamps: true,
    }
  );

  return Transaction;
};
