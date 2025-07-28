// src/models/Agent.js
// Currency should be many, and it is for allowing kinds of currencies for that agent

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
    currencies: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify(["USD"]),
      get() {
        const rawValue = this.getDataValue("currencies");
        return rawValue ? JSON.parse(rawValue) : ["USD"];
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue("currencies", JSON.stringify(value));
        } else if (typeof value === "string") {
          this.setDataValue("currencies", JSON.stringify([value]));
        } else {
          this.setDataValue("currencies", JSON.stringify(["USD"]));
        }
      },
    },
    default_currency: {
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

module.exports = Agent;
