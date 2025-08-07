// src/services/index.js
const authService = require("./authService");
const userService = require("./userService");
const clientService = require("./clientService");
const agentService = require("./agentService");
const clientBillingService = require("./clientBillingService");
const zenithService = require("./zenithService");
const clientDashboardService = require("./clientDashboardService");

module.exports = {
  authService,
  userService,
  clientService,
  agentService,
  clientBillingService,
  zenithService,
  clientDashboardService,
};
