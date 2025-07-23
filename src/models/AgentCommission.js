// src/models/AgentCommission.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentCommission = sequelize.define(
  "AgentCommission",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    agent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    commission_type: {
      type: DataTypes.ENUM("revenue_share", "fixed_fee"),
      allowNull: false,
      defaultValue: "revenue_share",
    },
    rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: "Percentage for revenue share or fixed amount",
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "If null, applies to all providers",
    },
    game_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "If null, applies to all game types",
    },
    min_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    max_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    settlement_cycle: {
      type: DataTypes.ENUM("daily", "weekly", "monthly"),
      allowNull: false,
      defaultValue: "monthly",
    },
    effective_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effective_to: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "agent_commissions",
    underscored: true,
  }
);

module.exports = AgentCommission;
