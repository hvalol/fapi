// Root Agent Seed file
const {
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
  Client,
} = require("../models");
const { generateApiKey, generateApiSecret } = require("../utils/authUtils");

module.exports = async () => {
  try {
    // First, create a special client for the platform
    const platformClient = await Client.create({
      id: 1, // Force ID to be 1
      name: "Fabulous Platform",
      status: "active",
      onboarding_date: new Date(),
    });

    console.log("Platform client created successfully");

    // Check if root agent already exists
    const existingRoot = await Agent.findOne({ where: { id: 1 } });
    if (existingRoot) {
      console.log("Root agent already exists, skipping...");
      return;
    }

    // Create Fabulous Platform root agent
    const rootAgent = await Agent.create({
      id: 1,
      name: "Fabulous Platform",
      code: "FABROOT",
      parent_id: null,
      level: 0,
      client_id: platformClient.id,
      status: "active",
      can_create_subagent: true,
      currencies: ["USD", "EUR", "JPY"], // Supporting multiple currencies
      default_currency: "USD",
    });

    // Create root agent profile (simplified)
    await AgentProfile.create({
      agent_id: rootAgent.id,
      timezone: "UTC",
      notes: "Platform root agent",
    });

    // Create root agent settings
    await AgentSettings.create({
      agent_id: rootAgent.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    // Create default commission for root
    await AgentCommission.create({
      agent_id: rootAgent.id,
      commission_type: "revenue_share",
      rate: 100.0, // 100% as it's the top level
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    console.log("Root agent created successfully");
  } catch (error) {
    console.error("Root agent seed error:", error);
    throw error;
  }
};
