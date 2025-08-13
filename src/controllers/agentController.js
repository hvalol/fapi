// src/controllers/agentController.js
const agentService = require("../services/agentService");
const { AppError } = require("../middlewares/errorHandler");

exports.getAllAgents = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      client_id: req.query.client_id,
      level: req.query.level,
      parent_id: req.query.parent_id,
      root: req.query.root,
      includeClient: req.query.includeClient === "true",
      includeUser: req.query.includeUser === "true",
      includeChildren: req.query.includeChildren === "true",
    };

    // If user is ClientAdmin, restrict to their client
    if (req.user.role === "ClientAdmin") {
      filters.client_id = req.user.client_id;
    }

    const agents = await agentService.getAllAgents(filters);

    res.json({
      status: "success",
      results: agents.length,
      data: {
        agents,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAgentById = async (req, res, next) => {
  try {
    const options = {
      includeChildren: req.query.includeChildren === "true",
    };

    const agent = await agentService.getAgentById(req.params.id, options);

    // If user is ClientAdmin, check if agent belongs to their client
    if (
      req.user.role === "ClientAdmin" &&
      agent.client_id !== req.user.client_id
    ) {
      return next(
        new AppError("You do not have permission to view this agent", 403)
      );
    }

    res.json({
      status: "success",
      data: {
        agent,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createAgent = async (req, res, next) => {
  try {
    const agentData = {
      name: req.body.name,
      code: req.body.code,
      parent_id: req.body.parent_id,
      client_id: req.body.client_id,
      status: req.body.status,
      can_create_subagent: req.body.can_create_subagent,
      currencies: req.body.currencies,
      default_currency: req.body.default_currency,
      profile: {
        notes: req.body.profile?.notes,
        timezone: req.body.profile?.timezone,
      },
      settings: {
        ...req.body.settings,
        allowed_providers: req.body.allowed_providers, // should be array
      },
      commissions: req.body.commissions,
      user_id: req.body.user_id,
      max_agents: req.body.max_agents,
      max_level: req.body.max_level,
    };

    // If user is ClientAdmin, restrict to their client
    if (req.user.role === "ClientAdmin") {
      if (req.user.client_id !== agentData.client_id) {
        return next(
          new AppError("You can only create agents for your own client", 403)
        );
      }
      const currentAgent = await agentService.getAgentById(req.body.agent_id);

      if (!currentAgent.can_create_subagent) {
        return next(new AppError("This agent cannot create sub-agents", 403));
      }
    }

    const agent = await agentService.createAgent(agentData);

    res.status(201).json({
      status: "success",
      data: {
        agent,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAgent = async (req, res, next) => {
  try {
    // First check if user has permission to modify this agent
    const agent = await agentService.getAgentById(req.params.id);

    // If user is ClientAdmin, check if agent belongs to their client
    if (
      req.user.role === "ClientAdmin" &&
      agent.client_id !== req.user.client_id
    ) {
      return next(
        new AppError("You do not have permission to modify this agent", 403)
      );
    }

    const agentData = {
      name: req.body.name,
      code: req.body.code,
      status: req.body.status,
      can_create_subagent: req.body.can_create_subagent,
      currencies: req.body.currencies,
      default_currency: req.body.default_currency,
      profile: {
        notes: req.body.profile?.notes,
        timezone: req.body.profile?.timezone,
      },
      settings: {
        ...req.body.settings,
        allowed_providers: req.body.allowed_providers, // should be array
      },
      user_id: req.body.user_id,
      max_agents: req.body.max_agents,
      max_level: req.body.max_level,
    };

    const updatedAgent = await agentService.updateAgent(
      req.params.id,
      agentData
    );

    res.json({
      status: "success",
      data: {
        agent: updatedAgent,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAgentCommissions = async (req, res, next) => {
  try {
    // First check if user has permission to modify this agent
    const agent = await agentService.getAgentById(req.params.id);

    // If user is ClientAdmin, check if agent belongs to their client
    if (
      req.user.role === "ClientAdmin" &&
      agent.client_id !== req.user.client_id
    ) {
      return next(
        new AppError("You do not have permission to modify this agent", 403)
      );
    }

    // Validate commissions data
    if (!Array.isArray(req.body.commissions)) {
      return next(new AppError("Commissions must be an array", 400));
    }

    const updatedAgent = await agentService.updateAgentCommissions(
      req.params.id,
      req.body.commissions
    );

    res.json({
      status: "success",
      data: {
        agent: updatedAgent,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateAgent = async (req, res, next) => {
  try {
    // First check if user has permission to modify this agent
    const agent = await agentService.getAgentById(req.params.id);

    // If user is ClientAdmin, check if agent belongs to their client
    if (
      req.user.role === "ClientAdmin" &&
      agent.client_id !== req.user.client_id
    ) {
      return next(
        new AppError("You do not have permission to modify this agent", 403)
      );
    }

    await agentService.deactivateAgent(req.params.id);

    res.json({
      status: "success",
      data: null,
      message: "Agent deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAgentHierarchy = async (req, res, next) => {
  try {
    let { rootId, clientId, status } = req.query;
    const user = req.user;

    // For admin users
    if (user.role === "Admin") {
      if (!clientId && !rootId) {
        throw new AppError("Either clientId or rootId must be provided", 400);
      }
    }
    // For client users
    else {
      if (!user.client_id) {
        throw new AppError("User not associated with any client", 403);
      }
      // Override clientId with user's client_id for security
      clientId = user.client_id;
    }

    const hierarchy = await agentService.getAgentHierarchy(
      rootId ? parseInt(rootId) : null,
      clientId ? parseInt(clientId) : null,
      status
    );

    res.json({
      status: "success",
      data: { hierarchy },
    });
  } catch (error) {
    next(error);
  }
};

exports.regenerateApiCredentials = async (req, res, next) => {
  try {
    // First check if user has permission to modify this agent
    const agent = await agentService.getAgentById(req.params.id);

    // If user is ClientAdmin, check if agent belongs to their client
    if (
      req.user.role === "ClientAdmin" &&
      agent.client_id !== req.user.client_id
    ) {
      return next(
        new AppError("You do not have permission to modify this agent", 403)
      );
    }

    const credentials = await agentService.regenerateApiCredentials(
      req.params.id
    );

    res.json({
      status: "success",
      data: {
        credentials,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.setProviderBetLimit = async (req, res, next) => {
  try {
    const agentId = parseInt(req.params.agentId);
    const providerId = req.body.providerId;
    const minBet = req.body.minBet;
    const maxBet = req.body.maxBet;
    const gameId = req.body.gameId;

    if (!providerId) throw new AppError("Provider ID required", 400);

    const settings = await agentService.setProviderBetLimit(
      agentId,
      providerId,
      minBet,
      maxBet,
      gameId
    );

    res.status(200).json({
      status: "success",
      data: {
        min_bet: settings.min_bet,
        max_bet: settings.max_bet,
        min_bet_games: settings.min_bet_games,
        max_bet_games: settings.max_bet_games,
      },
    });
  } catch (error) {
    next(error.statusCode ? error : new AppError(error.message, 500));
  }
};
