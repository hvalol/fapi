// src/models/AgentProfile.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentProfile = sequelize.define(
  "AgentProfile",
  {
    agent_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contact_person: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "UTC",
    },
  },
  {
    timestamps: true,
    tableName: "agent_profiles",
    underscored: true,
  }
);

module.exports = AgentProfile;
