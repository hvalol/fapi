// src/models/Agent.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Agent = sequelize.define(
  "Agent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      allowNull: false,
      defaultValue: "active",
    },
    can_create_subagent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "USD",
    },
    max_agents: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "agents",
    underscored: true,
  }
);

// Self-referencing relationship for hierarchy
Agent.belongsTo(Agent, { as: "parent", foreignKey: "parent_id" });
Agent.hasMany(Agent, { as: "children", foreignKey: "parent_id" });

module.exports = Agent;
