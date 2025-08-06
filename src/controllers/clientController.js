// src/controllers/clientController.js
const clientService = require("../services/clientService");

exports.getAllClients = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
    };

    const clients = await clientService.getAllClients(filters);

    res.json({
      status: "success",
      results: clients.length,
      data: {
        clients,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);

    res.json({
      status: "success",
      data: {
        client,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const clientData = {
      name: req.body.name,
      status: req.body.status,
      onboarding_date: req.body.onboarding_date,
      contact_email: req.body.contact_email,
    };

    const client = await clientService.createClient(clientData);

    res.status(201).json({
      status: "success",
      data: {
        client,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const clientData = {
      name: req.body.name,
      status: req.body.status,
      onboarding_date: req.body.onboarding_date,
      contact_email: req.body.contact_email,
    };

    const client = await clientService.updateClient(req.params.id, clientData);

    res.json({
      status: "success",
      data: {
        client,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.params.id);

    res.json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
