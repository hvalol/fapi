"use strict";
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TransactionAudit = sequelize.define(
    "TransactionAudit",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      transactionId: {
        type: DataTypes.UUID,
        field: "transaction_id",
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
      aggregatorName: {
        type: DataTypes.STRING,
        field: "aggregator_name",
        allowNull: false,
      },
      rawPayload: {
        type: DataTypes.JSON,
        field: "raw_payload",
        allowNull: false,
      },
      receivedAt: {
        type: DataTypes.DATE,
        field: "received_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "transaction_audits",
      underscored: true,
      timestamps: false,
    }
  );

  return TransactionAudit;
};
