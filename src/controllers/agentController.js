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
      currency: req.body.currency,
      profile: {
        notes: req.body.profile?.notes,
        timezone: req.body.profile?.timezone,
      },
      settings: req.body.settings,
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
      currency: req.body.currency,
      profile: {
        notes: req.body.profile?.notes,
        timezone: req.body.profile?.timezone,
      },
      settings: req.body.settings,
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
    const rootId = req.query.rootId ? parseInt(req.query.rootId) : null;
    let clientId = req.query.clientId ? parseInt(req.query.clientId) : null;

    // If user is ClientAdmin, restrict to their client
    if (req.user.role === "ClientAdmin") {
      clientId = req.user.client_id;
    }

    const hierarchy = await agentService.getAgentHierarchy(rootId, clientId);

    res.json({
      status: "success",
      data: {
        hierarchy,
      },
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
