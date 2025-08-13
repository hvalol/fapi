const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AgentGameSetting = sequelize.define(
  "AgentGameSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    agent_id: { type: DataTypes.INTEGER, allowNull: false },
    game_id: { type: DataTypes.INTEGER, allowNull: false },
    is_disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "agent_game_settings",
    underscored: true,
    indexes: [{ unique: true, fields: ["agent_id", "game_id"] }],
  }
);

module.exports = AgentGameSetting;
