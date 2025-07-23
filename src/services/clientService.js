// src/services/clientService.js
const { Client, User } = require("../models");
const { AppError } = require("../middlewares/errorHandler");

/**
 * Service for client management operations
 */
class ClientService {
  /**
   * Get all clients with optional filtering
   * @param {Object} filters - Filters to apply
   * @returns {Array} List of clients
   */
  async getAllClients(filters = {}) {
    const query = {};

    // Apply filters if provided
    if (filters.status) query.status = filters.status;

    return Client.findAll({
      where: query,
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "email", "full_name", "role", "status"],
          where: { role: "ClientAdmin" },
          required: false,
        },
      ],
    });
  }

  /**
   * Get client by ID
   * @param {number} id - Client ID
   * @returns {Object} Client data
   */
  async getClientById(id) {
    const client = await Client.findByPk(id, {
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "email", "full_name", "role", "status"],
          where: { role: "ClientAdmin" },
          required: false,
        },
      ],
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    return client;
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @returns {Object} Created client
   */
  async createClient(clientData) {
    const { name, status, onboarding_date, contact_email, contact_phone } =
      clientData;

    // Check if client with same name already exists
    const existingClient = await Client.findOne({ where: { name } });
    if (existingClient) {
      throw new AppError("Client with this name already exists", 400);
    }

    // Create client
    const client = await Client.create({
      name,
      status: status || "pending",
      onboarding_date: onboarding_date || new Date(),
      contact_email,
      contact_phone,
    });

    return client;
  }

  /**
   * Update an existing client
   * @param {number} id - Client ID
   * @param {Object} clientData - Updated client data
   * @returns {Object} Updated client
   */
  async updateClient(id, clientData) {
    const client = await Client.findByPk(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const { name, status, onboarding_date, contact_email, contact_phone } =
      clientData;

    // Check if name is being changed and if it's already in use
    if (name && name !== client.name) {
      const existingClient = await Client.findOne({ where: { name } });
      if (existingClient) {
        throw new AppError("Client with this name already exists", 400);
      }
    }

    // Update client fields
    if (name) client.name = name;
    if (status) client.status = status;
    if (onboarding_date) client.onboarding_date = onboarding_date;
    if (contact_email !== undefined) client.contact_email = contact_email;
    if (contact_phone !== undefined) client.contact_phone = contact_phone;

    await client.save();

    return client;
  }

  /**
   * Delete a client (soft delete by setting status to inactive)
   * @param {number} id - Client ID
   * @returns {boolean} Success flag
   */
  async deleteClient(id) {
    const client = await Client.findByPk(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Soft delete by setting status to inactive
    client.status = "inactive";
    await client.save();

    // Also set associated users to inactive
    await User.update({ status: "inactive" }, { where: { client_id: id } });

    return true;
  }
}

module.exports = new ClientService();
