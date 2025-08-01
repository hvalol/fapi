// src/models/index.js
const sequelize = require("../config/database");
const User = require("./User");
const Client = require("./Client");
const Agent = require("./Agent");
const AgentProfile = require("./AgentProfile");
const AgentSettings = require("./AgentSettings");
const AgentCommission = require("./AgentCommission");

// Client-User Association
Client.hasMany(User, { foreignKey: "client_id", as: "users" });
User.belongsTo(Client, { foreignKey: "client_id", as: "client" });

// Client-Agent Association
Client.hasMany(Agent, { foreignKey: "client_id", as: "agents" });
Agent.belongsTo(Client, { foreignKey: "client_id", as: "client" });

// Agent-AgentProfile Association (One-to-One)
Agent.hasOne(AgentProfile, { foreignKey: "agent_id", as: "profile" });
AgentProfile.belongsTo(Agent, { foreignKey: "agent_id" });

// Agent-AgentSettings Association (One-to-One)
Agent.hasOne(AgentSettings, { foreignKey: "agent_id", as: "settings" });
AgentSettings.belongsTo(Agent, { foreignKey: "agent_id" });

// Agent-AgentCommission Association (One-to-Many)
Agent.hasMany(AgentCommission, { foreignKey: "agent_id", as: "commissions" });
AgentCommission.belongsTo(Agent, { foreignKey: "agent_id" });

// Agent-Agent Association (Self-referencing for hierarchy)
Agent.belongsTo(Agent, { foreignKey: "parent_id", as: "parent" });
Agent.hasMany(Agent, { foreignKey: "parent_id", as: "children" });

module.exports = {
  sequelize,
  User,
  Client,
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
};
