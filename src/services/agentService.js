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
      include.push({
        model: Client,
        as: "client",
        attributes: ["id", "name", "status"],
      });
    }

    // Include user information if requested
    if (filters.includeUser) {
      include.push({
        model: User,
        as: "user",
        attributes: ["id", "username"],
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
   * Get children for an agent, with optional recursion
   * @param {number} parentId - Parent agent ID
   * @param {boolean} recursive - Whether to fetch all descendants
   * @param {number} maxDepth - Maximum depth to traverse
   * @param {number} currentDepth - Current depth in the hierarchy
   * @returns {Array} Children agents
   */
  async getAgentChildren(
    parentId,
    recursive = false,
    maxDepth = 5,
    currentDepth = 0
  ) {
    // Base case for recursion - stop if we've reached max depth
    if (currentDepth >= maxDepth) {
      return [];
    }

    // Find direct children with basic info
    const children = await Agent.findAll({
      where: { parent_id: parentId },
      include: [
        { model: AgentProfile, as: "profile" },
        {
          model: AgentSettings,
          as: "settings",
          attributes: { exclude: ["api_secret"] },
        },
        { model: AgentCommission, as: "commissions" },
      ],
    });

    // If not recursive, return just the direct children
    if (!recursive || children.length === 0) {
      return children.map((child) => child.toJSON());
    }

    // For recursive calls, map through each child and get its children
    const childrenWithDescendants = [];
    for (const child of children) {
      const childObj = child.toJSON();
      childObj.children = await this.getAgentChildren(
        child.id,
        true,
        maxDepth,
        currentDepth + 1
      );
      childrenWithDescendants.push(childObj);
    }

    return childrenWithDescendants;
  }

  /**
   * Get agent by ID
   * @param {number} id - Agent ID
   * @param {Object} options - Additional options
   * @returns {Object} Agent data
   */
  async getAgentById(id, options = {}) {
    // Base include for main agent
    const include = [
      { model: AgentProfile, as: "profile" },
      {
        model: AgentSettings,
        as: "settings",
        attributes: { exclude: ["api_secret"] },
      },
      { model: AgentCommission, as: "commissions" },
      { model: Client, as: "client", attributes: ["id", "name"] },
      { model: User, as: "user", attributes: ["id", "username"] },
    ];

    // Include parent agent with its basic profile
    include.push({
      model: Agent,
      as: "parent",
      include: [{ model: AgentProfile, as: "profile" }],
    });

    // Find the agent with its direct relations
    const startTime = Date.now();
    const agent = await Agent.findByPk(id, { include });
    const queryTime = Date.now() - startTime;

    if (queryTime > 1000) {
      // Log if query takes more than 1 second
      console.warn(
        `Slow query detected: getAgentById(${id}) took ${queryTime}ms`
      );
    }

    if (!agent) {
      throw new AppError("Agent not found", 404);
    }

    // Convert to plain object FIRST
    const agentObj = agent.toJSON();

    // If children are requested, fetch them separately rather than in the main query
    if (options.includeChildren) {
      const maxDepth = options.maxDepth || 2; // Default to 2 levels
      const recursive = options.recursive !== false; // Default to true

      try {
        agentObj.children = await this.getAgentChildren(
          id,
          recursive,
          maxDepth,
          0,
          options.clientId || agent.client_id
        );
      } catch (error) {
        console.error(`Error getting agent details for ID ${id}:`, error);
        throw error;
      }
    }

    return agentObj;
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
      currencies,
      default_currency,
      profile,
      settings,
      commissions,
      user_id,
      max_agents,
      max_level,
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
    // Process currencies
    let processedCurrencies = ["USD"];
    let processedDefaultCurrency = "USD";

    if (Array.isArray(currencies) && currencies.length > 0) {
      processedCurrencies = currencies;
    }

    if (default_currency && processedCurrencies.includes(default_currency)) {
      processedDefaultCurrency = default_currency;
    } else if (processedCurrencies.length > 0) {
      processedDefaultCurrency = processedCurrencies[0];
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
          currencies: processedCurrencies,
          default_currency: processedDefaultCurrency,
          user_id,
          max_agents: max_agents || null,
          max_level: max_level || null,
        },
        { transaction }
      );

      // Create agent profile with simplified fields
      if (profile) {
        await AgentProfile.create(
          {
            agent_id: agent.id,
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
            timezone: "UTC",
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
      currencies,
      default_currency,
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

    // Process currencies
    let processedCurrencies = agent.currencies;
    let processedDefaultCurrency = agent.default_currency;

    if (Array.isArray(currencies)) {
      processedCurrencies = currencies.length > 0 ? currencies : ["USD"];
    }

    if (default_currency) {
      // Check if the default currency is in the list of currencies
      if (processedCurrencies.includes(default_currency)) {
        processedDefaultCurrency = default_currency;
      } else {
        throw new AppError(
          "Default currency must be in the list of currencies",
          400
        );
      }
    } else if (
      processedCurrencies !== agent.currencies &&
      !processedCurrencies.includes(agent.default_currency)
    ) {
      // If currencies changed and no longer includes old default, set a new default
      processedDefaultCurrency = processedCurrencies[0];
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
      if (processedCurrencies !== undefined)
        agent.currencies = processedCurrencies;
      if (processedDefaultCurrency !== undefined)
        agent.default_currency = processedDefaultCurrency;
      if (user_id !== undefined) agent.user_id = user_id;
      if (max_agents !== undefined) agent.max_agents = max_agents;
      if (max_level !== undefined) agent.max_level = max_level;

      await agent.save({ transaction });

      // Update profile if provided - simplified for updated model
      if (profile) {
        if (agent.profile) {
          // Update existing profile
          if (profile.notes !== undefined) agent.profile.notes = profile.notes;
          if (profile.timezone !== undefined)
            agent.profile.timezone = profile.timezone;

          await agent.profile.save({ transaction });
        } else {
          // Create profile if not exists
          await AgentProfile.create(
            {
              agent_id: agent.id,
              notes: profile.notes,
              timezone: profile.timezone || "UTC",
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
  async getAgentHierarchy(rootId, clientId, status = "active") {
    try {
      const query = { status };

      // Remove platform root assumptions
      if (!rootId && !clientId) {
        throw new AppError("Either rootId or clientId must be provided", 400);
      }

      if (clientId) {
        query.client_id = clientId;
      }

      if (rootId) {
        // Get the agent tree starting from rootId
        const rootAgent = await Agent.findByPk(rootId);
        if (!rootAgent) {
          throw new AppError("Root agent not found", 404);
        }
        query.client_id = rootAgent.client_id;
      }

      const agents = await Agent.findAll({
        where: query,
        include: [
          {
            model: AgentProfile,
            as: "profile",
          },
          {
            model: AgentSettings,
            as: "settings",
            attributes: { exclude: ["api_secret"] },
          },
        ],
        order: [
          ["level", "ASC"],
          ["id", "ASC"],
        ],
      });

      // Build hierarchy without assuming platform root
      return this.buildHierarchy(agents, rootId || null);
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Helper method to recursively build agent tree
   * @param {number} agentId - Agent ID
   * @returns {Object} Agent tree
   * @private
   */
  buildHierarchy(agents, rootId = null) {
    // Remove any references to platform root (ID 1)
    const agentMap = new Map(
      agents.map((agent) => [agent.id, { ...agent.toJSON(), children: [] }])
    );
    const hierarchy = [];

    for (const agent of agents) {
      if (agent.parent_id === null || agent.id === rootId) {
        hierarchy.push(agentMap.get(agent.id));
      } else if (agentMap.has(agent.parent_id)) {
        agentMap.get(agent.parent_id).children.push(agentMap.get(agent.id));
      }
    }

    return rootId ? hierarchy[0] : hierarchy;
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
