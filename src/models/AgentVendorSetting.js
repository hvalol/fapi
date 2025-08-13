const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentVendorSetting = sequelize.define(
  "AgentVendorSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    agent_id: { type: DataTypes.INTEGER, allowNull: false },
    vendor_id: { type: DataTypes.INTEGER, allowNull: false },
    is_disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "agent_vendor_settings",
    underscored: true,
    indexes: [{ unique: true, fields: ["agent_id", "vendor_id"] }],
  }
);

module.exports = AgentVendorSetting;
