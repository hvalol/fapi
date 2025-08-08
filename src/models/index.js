// src/models/index.js
const sequelize = require("../config/database");
const User = require("./User");
const Client = require("./Client");
const Agent = require("./Agent");
const AgentProfile = require("./AgentProfile");
const AgentSettings = require("./AgentSettings");
const AgentCommission = require("./AgentCommission");
const ClientBilling = require("./ClientBilling");
const ClientTransaction = require("./ClientTransaction");
const ClientDeposit = require("./ClientDeposit");
const ClientBillingCurrency = require("./ClientBillingCurrency");
const ZenithGame = require("./ZenithGame");
const ZenithVendor = require("./ZenithVendor");
const AdminLogs = require("./AdminLogs");
const ClientLogs = require("./ClientLogs");
const AdminLogsArchive = require("./AdminLogsArchive");
const ClientLogsArchive = require("./ClientLogsArchive");

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

// Client-ClientBilling Association
Client.hasMany(ClientBilling, { foreignKey: "client_id", as: "billings" });
ClientBilling.belongsTo(Client, { foreignKey: "client_id" });

// Client-ClientTransaction Association
Client.hasMany(ClientTransaction, {
  foreignKey: "client_id",
  as: "transactions",
});
ClientTransaction.belongsTo(Client, { foreignKey: "client_id" });

// ClientBilling-ClientTransaction Association (Optional)
ClientBilling.hasMany(ClientTransaction, {
  foreignKey: "related_billing_id",
  as: "transactions",
});
ClientTransaction.belongsTo(ClientBilling, {
  foreignKey: "related_billing_id",
  as: "billing",
});

// Client-ClientDeposit Association (One-to-One)
Client.hasOne(ClientDeposit, { foreignKey: "client_id", as: "deposit" });
ClientDeposit.belongsTo(Client, { foreignKey: "client_id" });

// User-Agent Association (Each agent can have a user account)
Agent.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasOne(Agent, { foreignKey: "user_id", as: "agent" });

// ClientBilling-ClientBillingCurrency
ClientBilling.hasMany(ClientBillingCurrency, {
  foreignKey: "billing_id",
  as: "currencyDetails",
});
ClientBillingCurrency.belongsTo(ClientBilling, {
  foreignKey: "billing_id",
});

// Admin Logs Associations
User.hasMany(AdminLogs, { foreignKey: "user_id", as: "adminLogs" });
AdminLogs.belongsTo(User, { foreignKey: "user_id", as: "admin" });

// Client Logs Associations
Client.hasMany(ClientLogs, { foreignKey: "client_id", as: "clientLogs" });
ClientLogs.belongsTo(Client, { foreignKey: "client_id", as: "client" });
User.hasMany(ClientLogs, { foreignKey: "user_id", as: "userClientLogs" });
ClientLogs.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Admin Logs Archive Associations
User.hasMany(AdminLogsArchive, {
  foreignKey: "admin_id",
  as: "adminLogsArchive",
});
AdminLogsArchive.belongsTo(User, { foreignKey: "admin_id", as: "admin" });

// Client Logs Archive Associations
Client.hasMany(ClientLogsArchive, {
  foreignKey: "client_id",
  as: "clientLogsArchive",
});
ClientLogsArchive.belongsTo(Client, { foreignKey: "client_id", as: "client" });
User.hasMany(ClientLogsArchive, {
  foreignKey: "user_id",
  as: "userClientLogsArchive",
});
ClientLogsArchive.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Vendor-Game
ZenithVendor.hasMany(ZenithGame, { foreignKey: "vendor_id", as: "games" });
ZenithGame.belongsTo(ZenithVendor, { foreignKey: "vendor_id", as: "vendor" });
module.exports = {
  sequelize,
  User,
  Client,
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
  ClientBilling,
  ClientTransaction,
  ClientDeposit,
  ClientBillingCurrency,
  ZenithGame,
  ZenithVendor,
  AdminLogs,
  ClientLogs,
  AdminLogsArchive,
  ClientLogsArchive,
};
