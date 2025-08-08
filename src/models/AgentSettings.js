// src/models/AgentSettings.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentSettings = sequelize.define(
  "AgentSettings",
  {
    agent_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    api_secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    callback_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ip_whitelist: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Comma-separated list of allowed IPs",
    },
    seamless_wallet: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    transfer_wallet: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    allowed_games: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of allowed game IDs",
    },
    allowed_providers: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of allowed provider IDs",
    },
    max_bet: {
      type: DataTypes.JSON, // changed from DECIMAL
      allowNull: true,
      comment: "Object: { [providerId]: value }",
    },
    min_bet: {
      type: DataTypes.JSON, // changed from DECIMAL
      allowNull: true,
      comment: "Object: { [providerId]: value }",
    },
  },
  {
    timestamps: true,
    tableName: "agent_settings",
    underscored: true,
  }
);

module.exports = AgentSettings;
