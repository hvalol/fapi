// src/services/agentService.js
const {
  Agent,
  AgentProfile,
  AgentSettings,
  AgentCommission,
  User,
  Client,
  sequelize,
} = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const { generateApiKey, generateApiSecret } = require("../utils/authUtils");

/**
 * Service for agent management operations
 */
class AgentService {
  /**
   * Get all agents with optional filtering
   * @param {Object} filters - Filters to apply
   * @returns {Array} List of agents
   */
  async getAllAgents(filters = {}) {
    const query = {};
    const include = [
      { model: AgentProfile, as: "profile" },
      {
        model: AgentSettings,
        as: "settings",
        attributes: { exclude: ["api_secret"] },
      },
    ];

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.client_id) query.client_id = filters.client_id;
    if (filters.level) query.level = filters.level;
    if (filters.parent_id) query.parent_id = filters.parent_id;

    // If requesting root agents only
    if (filters.root === "true" || filters.root === true) {
      query.parent_id = null;
    }

    // Include client information if requested
    if (filters.includeClient) {
      include.push({ model: Client, as: "client", attributes: ["id", "name"] });
    }

    // Include user information if requested
    if (filters.includeUser) {
      include.push({
        model: User,
        as: "user",
        attributes: ["id", "email", "full_name"],
      });
    }

    // Include children if requested
    if (filters.includeChildren) {
      include.push({
        model: Agent,
        as: "children",
        include: [{ model: AgentProfile, as: "profile" }],
      });
    }

    return Agent.findAll({
      where: query,
      include,
      order: [["id", "ASC"]],
    });
  }

  /**
   * Get agent by ID
   * @param {number} id - Agent ID
   * @param {Object} options - Additional options
   * @returns {Object} Agent data
   */
  async getAgentById(id, options = {}) {
    const include = [
      { model: AgentProfile, as: "profile" },
      {
        model: AgentSettings,
        as: "settings",
        attributes: { exclude: ["api_secret"] },
      },
      { model: AgentCommission, as: "commissions" },
      { model: Client, as: "client", attributes: ["id", "name"] },
      { model: User, as: "user", attributes: ["id", "email", "full_name"] },
    ];

    // Include parent agent if exists
    include.push({
      model: Agent,
      as: "parent",
      include: [{ model: AgentProfile, as: "profile" }],
    });

    // Include children agents if requested
    if (options.includeChildren) {
      include.push({
        model: Agent,
        as: "children",
        include: [{ model: AgentProfile, as: "profile" }],
      });
    }

    const agent = await Agent.findByPk(id, { include });

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    return agent;
  }

  /**
   * Create a new agent
   * @param {Object} agentData - Agent data
   * @returns {Object} Created agent
   */
  async createAgent(agentData) {
    const {
      name,
      code,
      parent_id,
      client_id,
      status,
      can_create_subagent,
      currency,
      profile,
      settings,
      commissions,
      user_id,
    } = agentData;

    // Validate client exists
    const client = await Client.findByPk(client_id);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Check if code is unique
    const existingAgent = await Agent.findOne({ where: { code } });
    if (existingAgent) {
      throw new AppError("Agent code already exists", 400);
    }

    // If parent_id is provided, check if parent agent exists
    let level = 1;
    if (parent_id) {
      const parentAgent = await Agent.findByPk(parent_id);

      if (!parentAgent) {
        throw new AppError("Parent agent not found", 404);
      }

      if (!parentAgent.can_create_subagent) {
        throw new AppError("Parent agent cannot create sub-agents", 403);
      }

      // Check client consistency
      if (parentAgent.client_id !== client_id) {
        throw new AppError("Parent agent belongs to different client", 400);
      }

      // Calculate level based on parent
      level = parentAgent.level + 1;

      // Check if max level is reached
      if (parentAgent.max_level && level > parentAgent.max_level) {
        throw new AppError(
          `Cannot create agent beyond level ${parentAgent.max_level}`,
          400
        );
      }

      // Check if max agents is reached
      if (parentAgent.max_agents) {
        const childCount = await Agent.count({ where: { parent_id } });
        if (childCount >= parentAgent.max_agents) {
          throw new AppError(
            `Parent agent has reached maximum sub-agents limit (${parentAgent.max_agents})`,
            400
          );
        }
      }
    }

    // If user_id is provided, check if user exists and belongs to the same client
    if (user_id) {
      const user = await User.findByPk(user_id);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (user.client_id !== client_id) {
        throw new AppError("User belongs to different client", 400);
      }

      // Check if user is already linked to another agent
      const existingAgentUser = await Agent.findOne({ where: { user_id } });
      if (existingAgentUser) {
        throw new AppError("User is already linked to another agent", 400);
      }
    }

    // Use transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      // Create agent
      const agent = await Agent.create(
        {
          name,
          code,
          parent_id,
          level,
          client_id,
          status: status || "active",
          can_create_subagent: can_create_subagent || false,
          currency: currency || "USD",
          user_id,
        },
        { transaction }
      );

      // Create agent profile
      if (profile) {
        await AgentProfile.create(
          {
            agent_id: agent.id,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            contact_person: profile.contact_person,
            notes: profile.notes,
            timezone: profile.timezone || "UTC",
          },
          { transaction }
        );
      } else {
        // Create default profile
        await AgentProfile.create(
          {
            agent_id: agent.id,
          },
          { transaction }
        );
      }

      // Create agent settings
      if (settings) {
        await AgentSettings.create(
          {
            agent_id: agent.id,
            api_key: settings.api_key || generateApiKey(),
            api_secret: settings.api_secret || generateApiSecret(),
            callback_url: settings.callback_url,
            ip_whitelist: settings.ip_whitelist,
            seamless_wallet:
              settings.seamless_wallet !== undefined
                ? settings.seamless_wallet
                : false,
            transfer_wallet:
              settings.transfer_wallet !== undefined
                ? settings.transfer_wallet
                : true,
            allowed_games: settings.allowed_games,
            allowed_providers: settings.allowed_providers,
            max_bet: settings.max_bet,
            min_bet: settings.min_bet,
          },
          { transaction }
        );
      } else {
        // Create default settings
        await AgentSettings.create(
          {
            agent_id: agent.id,
            api_key: generateApiKey(),
            api_secret: generateApiSecret(),
          },
          { transaction }
        );
      }

      // Create agent commissions
      if (commissions && commissions.length > 0) {
        for (const commission of commissions) {
          await AgentCommission.create(
            {
              agent_id: agent.id,
              commission_type: commission.commission_type || "revenue_share",
              rate: commission.rate,
              provider_id: commission.provider_id,
              game_type: commission.game_type,
              min_amount: commission.min_amount,
              max_amount: commission.max_amount,
              settlement_cycle: commission.settlement_cycle || "monthly",
              effective_from: commission.effective_from || new Date(),
              effective_to: commission.effective_to,
            },
            { transaction }
          );
        }
      } else {
        // Create default commission
        await AgentCommission.create(
          {
            agent_id: agent.id,
            commission_type: "revenue_share",
            rate: 30.0, // 30% default commission
            settlement_cycle: "monthly",
            effective_from: new Date(),
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Return created agent with associations
      return this.getAgentById(agent.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update an existing agent
   * @param {number} id - Agent ID
   * @param {Object} agentData - Updated agent data
   * @returns {Object} Updated agent
   */
  async updateAgent(id, agentData) {
    const agent = await Agent.findByPk(id, {
      include: [
        { model: AgentProfile, as: "profile" },
        { model: AgentSettings, as: "settings" },
      ],
    });

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    const {
      name,
      code,
      status,
      can_create_subagent,
      currency,
      profile,
      settings,
      user_id,
      max_agents,
      max_level,
    } = agentData;

    // Check if code is being changed and if it's unique
    if (code && code !== agent.code) {
      const existingAgent = await Agent.findOne({ where: { code } });
      if (existingAgent) {
        throw new AppError("Agent code already exists", 400);
      }
    }

    // If user_id is provided, check if user exists and belongs to the same client
    if (user_id && user_id !== agent.user_id) {
      const user = await User.findByPk(user_id);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (user.client_id !== agent.client_id) {
        throw new AppError("User belongs to different client", 400);
      }

      // Check if user is already linked to another agent
      const existingAgentUser = await Agent.findOne({
        where: { user_id, id: { [sequelize.Sequelize.Op.ne]: id } },
      });

      if (existingAgentUser) {
        throw new AppError("User is already linked to another agent", 400);
      }
    }

    // Use transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      // Update agent
      if (name) agent.name = name;
      if (code) agent.code = code;
      if (status) agent.status = status;
      if (can_create_subagent !== undefined)
        agent.can_create_subagent = can_create_subagent;
      if (currency) agent.currency = currency;
      if (user_id !== undefined) agent.user_id = user_id;
      if (max_agents !== undefined) agent.max_agents = max_agents;
      if (max_level !== undefined) agent.max_level = max_level;

      await agent.save({ transaction });

      // Update profile if provided
      if (profile) {
        if (agent.profile) {
          // Update existing profile
          if (profile.email !== undefined) agent.profile.email = profile.email;
          if (profile.phone !== undefined) agent.profile.phone = profile.phone;
          if (profile.address !== undefined)
            agent.profile.address = profile.address;
          if (profile.contact_person !== undefined)
            agent.profile.contact_person = profile.contact_person;
          if (profile.notes !== undefined) agent.profile.notes = profile.notes;
          if (profile.timezone !== undefined)
            agent.profile.timezone = profile.timezone;

          await agent.profile.save({ transaction });
        } else {
          // Create profile if not exists
          await AgentProfile.create(
            {
              agent_id: agent.id,
              ...profile,
            },
            { transaction }
          );
        }
      }

      // Update settings if provided
      if (settings) {
        if (agent.settings) {
          // Update existing settings
          if (settings.callback_url !== undefined)
            agent.settings.callback_url = settings.callback_url;
          if (settings.ip_whitelist !== undefined)
            agent.settings.ip_whitelist = settings.ip_whitelist;
          if (settings.seamless_wallet !== undefined)
            agent.settings.seamless_wallet = settings.seamless_wallet;
          if (settings.transfer_wallet !== undefined)
            agent.settings.transfer_wallet = settings.transfer_wallet;
          if (settings.allowed_games !== undefined)
            agent.settings.allowed_games = settings.allowed_games;
          if (settings.allowed_providers !== undefined)
            agent.settings.allowed_providers = settings.allowed_providers;
          if (settings.max_bet !== undefined)
            agent.settings.max_bet = settings.max_bet;
          if (settings.min_bet !== undefined)
            agent.settings.min_bet = settings.min_bet;

          // Generate new API credentials if requested
          if (settings.regenerate_api_key) {
            agent.settings.api_key = generateApiKey();
          }

          if (settings.regenerate_api_secret) {
            agent.settings.api_secret = generateApiSecret();
          }

          await agent.settings.save({ transaction });
        } else {
          // Create settings if not exists
          await AgentSettings.create(
            {
              agent_id: agent.id,
              api_key: generateApiKey(),
              api_secret: generateApiSecret(),
              ...settings,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      // Return updated agent with associations
      return this.getAgentById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update agent commissions
   * @param {number} id - Agent ID
   * @param {Array} commissions - Commission data
   * @returns {Object} Updated agent
   */
  async updateAgentCommissions(id, commissions) {
    const agent = await Agent.findByPk(id);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    const transaction = await sequelize.transaction();

    try {
      // Delete existing commissions if replacing all
      await AgentCommission.destroy({
        where: { agent_id: id },
        transaction,
      });

      // Create new commissions
      for (const commission of commissions) {
        await AgentCommission.create(
          {
            agent_id: id,
            commission_type: commission.commission_type || "revenue_share",
            rate: commission.rate,
            provider_id: commission.provider_id,
            game_type: commission.game_type,
            min_amount: commission.min_amount,
            max_amount: commission.max_amount,
            settlement_cycle: commission.settlement_cycle || "monthly",
            effective_from: commission.effective_from || new Date(),
            effective_to: commission.effective_to,
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Return updated agent with associations
      return this.getAgentById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Deactivate an agent
   * @param {number} id - Agent ID
   * @returns {boolean} Success flag
   */
  async deactivateAgent(id) {
    const agent = await Agent.findByPk(id);

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    // Check if agent has active children
    const activeChildren = await Agent.count({
      where: {
        parent_id: id,
        status: "active",
      },
    });

    if (activeChildren > 0) {
      throw new AppError("Cannot deactivate agent with active sub-agents", 400);
    }

    // Soft delete by setting status to inactive
    agent.status = "inactive";
    await agent.save();

    return true;
  }

  /**
   * Get agent hierarchy (tree structure)
   * @param {number} rootId - Root agent ID (if null, get all hierarchies)
   * @param {number} clientId - Client ID (required if rootId is null)
   * @returns {Array} Agent hierarchies
   */
  async getAgentHierarchy(rootId, clientId) {
    let rootAgents;

    if (rootId) {
      // Get specific agent tree
      const rootAgent = await Agent.findByPk(rootId);
      if (!rootAgent) {
        throw new AppError("Agent not found", 404);
      }
      rootAgents = [rootAgent];
    } else if (clientId) {
      // Get all root agents for a client
      rootAgents = await Agent.findAll({
        where: {
          client_id: clientId,
          parent_id: null,
        },
      });
    } else {
      throw new AppError("Either rootId or clientId is required", 400);
    }

    // Build hierarchy for each root agent
    const hierarchy = [];

    for (const rootAgent of rootAgents) {
      const agentTree = await this.buildAgentTree(rootAgent.id);
      hierarchy.push(agentTree);
    }

    return hierarchy;
  }

  /**
   * Helper method to recursively build agent tree
   * @param {number} agentId - Agent ID
   * @returns {Object} Agent tree
   * @private
   */
  async buildAgentTree(agentId) {
    const agent = await Agent.findByPk(agentId, {
      include: [
        { model: AgentProfile, as: "profile" },
        { model: User, as: "user", attributes: ["id", "email", "full_name"] },
      ],
      attributes: [
        "id",
        "name",
        "code",
        "level",
        "status",
        "can_create_subagent",
      ],
    });

    if (!agent) {
      return null;
    }

    // Get children
    const children = await Agent.findAll({
      where: { parent_id: agentId },
    });

    // Recursively build children trees
    const childrenTrees = [];

    for (const child of children) {
      const childTree = await this.buildAgentTree(child.id);
      childrenTrees.push(childTree);
    }

    // Convert to plain object and add children
    const agentTree = agent.toJSON();
    agentTree.children = childrenTrees;

    return agentTree;
  }

  /**
   * Regenerate API credentials for an agent
   * @param {number} id - Agent ID
   * @returns {Object} New API credentials
   */
  async regenerateApiCredentials(id) {
    const agent = await Agent.findByPk(id, {
      include: [{ model: AgentSettings, as: "settings" }],
    });

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    if (!agent.settings) {
      throw new AppError("Agent settings not found", 404);
    }

    // Generate new API key and secret
    const api_key = generateApiKey();
    const api_secret = generateApiSecret();

    // Update settings
    agent.settings.api_key = api_key;
    agent.settings.api_secret = api_secret;
    await agent.settings.save();

    return {
      api_key,
      api_secret,
    };
  }
}

module.exports = new AgentService();
