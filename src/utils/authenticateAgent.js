// src/utils/authenticateAgent.js
const { AgentSettings } = require("../models");

/**
 * Authenticate agent by API key/secret from headers or body.
 * Returns agent settings if valid, otherwise null.
 */
module.exports = async function authenticateAgent(req) {
  // Accept API key/secret from headers or body
  const apiKey =
    req.headers["x-api-key"] || req.body.apiKey || req.body.api_key;
  const apiSecret =
    req.headers["x-api-secret"] || req.body.apiSecret || req.body.api_secret;
  if (!apiKey || !apiSecret) return null;

  // Find agent settings by API key/secret
  const agentSettings = await AgentSettings.findOne({
    where: { api_key: apiKey, api_secret: apiSecret },
    raw: true,
  });
  return agentSettings;
};
