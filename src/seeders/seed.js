// src/seeders/seed.js
const {
  User,
  Client,
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
} = require("../models");
const {
  hashPassword,
  generateApiKey,
  generateApiSecret,
} = require("../utils/authUtils");
const rootAgentSeed = require("./rootAgentSeed");

const seedDatabase = async () => {
  try {
    // 1. First create the root agent
    await rootAgentSeed();

    // 2. Create default client
    const client = await Client.create({
      name: "Demo Casino",
      status: "active",
      onboarding_date: new Date(),
    });

    // 3. Create client's agent representation
    const clientAgent = await Agent.create({
      name: client.name,
      code: "DEMOCASINO",
      parent_id: 1, // Reference the Fabulous root agent
      level: 1, // Level 1 for client agents
      client_id: client.id,
      status: "active",
      can_create_subagent: true,
      currency: "USD",
    });

    // Create client agent profile (simplified)
    await AgentProfile.create({
      agent_id: clientAgent.id,
      timezone: "UTC",
      notes: "Main demo casino agent",
    });

    // Create client agent settings
    await AgentSettings.create({
      agent_id: clientAgent.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    // Create default commission for client agent
    await AgentCommission.create({
      agent_id: clientAgent.id,
      commission_type: "revenue_share",
      rate: 50.0, // 50% default for clients
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    // 4. Create admin user
    await User.create({
      username: "admin",
      password: hashPassword("Admin123!"),
      role: "Admin",
      status: "active",
    });

    // 5. Create client admin user
    await User.create({
      username: "client_demo",
      password: hashPassword("Client123!"),
      role: "ClientAdmin",
      status: "active",
      client_id: client.id,
    });

    // 6. Add level 2 agents (under client agent)
    const level2Agent1 = await Agent.create({
      name: "Regional Manager East",
      code: "REGION-EAST",
      parent_id: clientAgent.id,
      level: 2,
      client_id: client.id,
      status: "active",
      can_create_subagent: true,
      currency: "USD",
    });

    await AgentProfile.create({
      agent_id: level2Agent1.id,
      timezone: "America/New_York",
      notes: "East region management",
    });

    await AgentSettings.create({
      agent_id: level2Agent1.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    await AgentCommission.create({
      agent_id: level2Agent1.id,
      commission_type: "revenue_share",
      rate: 35.0, // Lower rate for sub-agents
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    const level2Agent2 = await Agent.create({
      name: "Regional Manager West",
      code: "REGION-WEST",
      parent_id: clientAgent.id,
      level: 2,
      client_id: client.id,
      status: "active",
      can_create_subagent: true,
      currency: "USD",
    });

    await AgentProfile.create({
      agent_id: level2Agent2.id,
      timezone: "America/Los_Angeles",
      notes: "West region management",
    });

    await AgentSettings.create({
      agent_id: level2Agent2.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    await AgentCommission.create({
      agent_id: level2Agent2.id,
      commission_type: "revenue_share",
      rate: 35.0,
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    // 7. Add level 3 agents (under Regional Manager East)
    const level3Agent1 = await Agent.create({
      name: "City Agent NYC",
      code: "CITY-NYC",
      parent_id: level2Agent1.id,
      level: 3,
      client_id: client.id,
      status: "active",
      can_create_subagent: false, // This agent cannot create sub-agents
      currency: "USD",
    });

    await AgentProfile.create({
      agent_id: level3Agent1.id,
      timezone: "America/New_York",
      notes: "New York City operations",
    });

    await AgentSettings.create({
      agent_id: level3Agent1.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: false, // Different settings for testing
    });

    await AgentCommission.create({
      agent_id: level3Agent1.id,
      commission_type: "revenue_share",
      rate: 20.0, // Even lower rate for level 3
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    const level3Agent2 = await Agent.create({
      name: "City Agent Boston",
      code: "CITY-BOS",
      parent_id: level2Agent1.id,
      level: 3,
      client_id: client.id,
      status: "active",
      can_create_subagent: false,
      currency: "USD",
    });

    await AgentProfile.create({
      agent_id: level3Agent2.id,
      timezone: "America/New_York",
      notes: "Boston operations",
    });

    await AgentSettings.create({
      agent_id: level3Agent2.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    await AgentCommission.create({
      agent_id: level3Agent2.id,
      commission_type: "revenue_share",
      rate: 20.0,
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    // 8. Add an inactive agent for testing filters
    const inactiveAgent = await Agent.create({
      name: "Inactive Agent",
      code: "INACTIVE",
      parent_id: clientAgent.id,
      level: 2,
      client_id: client.id,
      status: "inactive",
      can_create_subagent: false,
      currency: "USD",
    });

    await AgentProfile.create({
      agent_id: inactiveAgent.id,
      timezone: "UTC",
      notes: "Inactive test agent",
    });

    await AgentSettings.create({
      agent_id: inactiveAgent.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: false,
      transfer_wallet: false,
    });

    await AgentCommission.create({
      agent_id: inactiveAgent.id,
      commission_type: "revenue_share",
      rate: 30.0,
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    // 9. Create a second client with simpler hierarchy
    const secondClient = await Client.create({
      name: "VIP Casino",
      status: "active",
      onboarding_date: new Date(),
    });

    const secondClientAgent = await Agent.create({
      name: secondClient.name,
      code: "VIPCASINO",
      parent_id: 1, // Also under the root agent
      level: 1,
      client_id: secondClient.id,
      status: "active",
      can_create_subagent: true,
      currency: "EUR", // Different currency for testing
    });

    await AgentProfile.create({
      agent_id: secondClientAgent.id,
      timezone: "Europe/London",
      notes: "VIP casino main agent",
    });

    await AgentSettings.create({
      agent_id: secondClientAgent.id,
      api_key: generateApiKey(),
      api_secret: generateApiSecret(),
      seamless_wallet: true,
      transfer_wallet: true,
    });

    await AgentCommission.create({
      agent_id: secondClientAgent.id,
      commission_type: "revenue_share",
      rate: 60.0, // Different rate for testing
      settlement_cycle: "monthly",
      effective_from: new Date(),
    });

    // 10. Create a user for the second client
    await User.create({
      username: "admin_vip",
      password: hashPassword("Vip123!"),
      role: "ClientAdmin",
      status: "active",
      client_id: secondClient.id,
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
  }
};

// Run seeder if called directly
if (require.main === module) {
  const { sequelize } = require("../models");

  sequelize
    .sync({ force: true })
    .then(() => {
      console.log("Database synced");
      return seedDatabase();
    })
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
// Export both the seedDatabase function and a runWithSync function
async function runWithSync(force = false) {
  const { sequelize } = require("../models");

  try {
    console.log(`Syncing database${force ? " with force" : ""}...`);
    await sequelize.sync({ force: force });
    console.log("Database synced successfully");

    console.log("Starting seed process...");
    await seedDatabase();
    console.log("Seed completed successfully");

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error("Error during seed process:", error);
    if (require.main === module) {
      process.exit(1);
    }
  }
}

// Check for --force argument when run directly
if (require.main === module) {
  const forceSync = process.argv.includes("--force");
  runWithSync(forceSync);
}

// Export both functions
module.exports = { seedDatabase, runWithSync };
