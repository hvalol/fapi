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

// User-Agent Association (Each agent can have a user account)
User.hasOne(Agent, { foreignKey: "user_id", as: "agent" });
Agent.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Additional models and associations will be added as they are created

module.exports = {
  sequelize,
  User,
  Client,
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
};
