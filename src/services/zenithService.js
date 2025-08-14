const {
  ZenithVendor,
  ZenithGame,
  AgentSettings,
  Agent,
  AgentVendorSetting,
  AgentGameSetting,
} = require("../models");
const { AppError } = require("../middlewares/errorHandler");
const { Op } = require("sequelize");

/**
 * ZenithService
 * Handles business logic for Zenith vendors
 */
class ZenithService {
  /**
   *
   * ZENITH VENDOR
   *
   */

  /**
   * Get all vendors with formatted category and currency codes,
   * filtered by agent's allowed_providers if agentId is provided.
   * Get all vendors with agent-specific disable settings.
   * For admin: can get all agent settings. For agent: only own settings.
   * @param {Object} filters - Filters for the query
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of items per page
   * @param {number} [agentId] - Optional agent ID to filter by allowed_providers
   * @returns {Object} { vendors: Array, total: number }
   * @throws {AppError} If agent or agent settings not found, or on DB error
   */
  async getAllVendors(
    filters = {},
    page = 1,
    limit = 20,
    agentId = null,
    isAdmin = false
  ) {
    try {
      const offset = (page - 1) * limit;
      const where = {};

      // Search by name or code
      if (filters.search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${filters.search}%` } },
          { code: { [Op.like]: `%${filters.search}%` } },
        ];
      }

      // Filter by type/category
      if (filters.type && filters.type !== "All Types") {
        where.categoryCode = { [Op.like]: `%${filters.type}%` };
      }

      // Filter by agent's allowed_providers if agentId is provided
      let allowedProviders = null;
      if (agentId) {
        const agent = await Agent.findByPk(agentId, {
          include: [{ model: AgentSettings, as: "settings" }],
        });
        if (!agent) throw new AppError("Agent not found", 404);
        if (!agent.settings)
          throw new AppError("Agent settings not found", 404);
        allowedProviders = agent.settings.allowed_providers;
        if (!Array.isArray(allowedProviders) || allowedProviders.length === 0) {
          return { vendors: [], total: 0 };
        }
        where.code = { [Op.in]: allowedProviders };
      }

      // Include agent vendor settings
      let include = [];
      if (isAdmin) {
        include.push({
          model: AgentVendorSetting,
          as: "agentSettings",
        });
      } else if (agentId) {
        include.push({
          model: AgentVendorSetting,
          as: "agentSettings",
          where: { agent_id: agentId },
          required: false,
        });
      }

      const { rows, count } = await ZenithVendor.findAndCountAll({
        where,
        offset,
        limit,
        order: [["id", "ASC"]],
        include,
      });
      // Always use formatVendorData to ensure correct structure
      let vendors = this.formatVendorData(rows);

      // Attach agent-specific is_disabled if present
      vendors = vendors.map((data) => {
        if (!isAdmin && agentId) {
          // console.log(
          //   "[DEBUG] agentId:",
          //   agentId,
          //   "agentSettings:",
          //   data.agentSettings
          // );
          const setting = (data.agentSettings || []).find(
            (s) => String(s.agent_id) === String(agentId)
          );
          // console.log(
          //   "[DEBUG] Found setting for agentId:",
          //   agentId,
          //   "->",
          //   setting
          // );
          data.agent_is_disabled = setting ? setting.is_disabled : false;
        }
        // delete data.agentSettings;
        return data;
      });

      // Now filter by agent_is_disabled if requested
      if (filters.status === "Enabled") {
        vendors = vendors.filter((v) => !v.agent_is_disabled);
      } else if (filters.status === "Disabled") {
        vendors = vendors.filter((v) => v.agent_is_disabled);
      }

      // Debug: log any vendor with undefined categories
      vendors.forEach((v) => {
        if (!Array.isArray(v.categories)) {
          console.error(
            "[ZenithService.getAllVendors] Vendor ID",
            v.id,
            "has invalid categories:",
            v.categories,
            "categoryCode:",
            v.categoryCode
          );
        }
      });

      return { vendors, total: count };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error fetching vendors:", error);
      throw new AppError("Failed to fetch vendors", 500);
    }
  }

  /**
   * Get vendor by ID with formatted category and currency codes
   * @param {number} id - Vendor ID
   * @returns {Object} Vendor data
   */
  async getVendorById(id) {
    try {
      const vendor = await ZenithVendor.findByPk(id);

      if (!vendor) {
        throw new AppError("Vendor not found", 404);
      }

      return this.formatVendorData([vendor])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error fetching vendor with ID ${id}:`, error);
      throw new AppError("Failed to fetch vendor", 500);
    }
  }

  /**
   * Create a new vendor
   * @param {Object} vendorData - Vendor data
   * @returns {Object} Created vendor
   */
  async createVendor(vendorData) {
    try {
      // Check if vendor with same code already exists
      const existingVendor = await ZenithVendor.findOne({
        where: { code: vendorData.code },
      });

      if (existingVendor) {
        throw new AppError(
          `Vendor with code '${vendorData.code}' already exists`,
          400
        );
      }

      // Create the vendor
      const vendor = await ZenithVendor.create(vendorData);
      return this.formatVendorData([vendor])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error creating vendor:", error);
      throw new AppError(`Failed to create vendor: ${error.message}`, 500);
    }
  }

  /**
   * Update an existing vendor
   * @param {number} id - Vendor ID
   * @param {Object} vendorData - Updated vendor data
   * @returns {Object} Updated vendor
   */
  async updateVendor(id, vendorData) {
    try {
      const vendor = await ZenithVendor.findByPk(id);

      if (!vendor) {
        throw new AppError("Vendor not found", 404);
      }

      // Check if trying to update code to one that already exists
      if (vendorData.code && vendorData.code !== vendor.code) {
        const existingVendor = await ZenithVendor.findOne({
          where: { code: vendorData.code },
        });

        if (existingVendor) {
          throw new AppError(
            `Vendor with code '${vendorData.code}' already exists`,
            400
          );
        }
      }

      // Update the vendor
      await vendor.update(vendorData);

      // Fetch the updated vendor to return with formatted data
      const updatedVendor = await ZenithVendor.findByPk(id);
      return this.formatVendorData([updatedVendor])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error updating vendor with ID ${id}:`, error);
      throw new AppError(`Failed to update vendor: ${error.message}`, 500);
    }
  }

  /**
   * Delete a vendor
   * @param {number} id - Vendor ID
   * @returns {boolean} True if deleted successfully
   */
  async deleteVendor(id) {
    try {
      const vendor = await ZenithVendor.findByPk(id);

      if (!vendor) {
        throw new AppError("Vendor not found", 404);
      }

      await vendor.destroy();
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error deleting vendor with ID ${id}:`, error);
      throw new AppError("Failed to delete vendor", 500);
    }
  }

  /**
   * Toggle the disabled state of a vendor for an agent (per-agent).
   */
  async toggleAgentVendorDisabled(agentId, vendorId, disabledState) {
    try {
      // Upsert AgentVendorSetting
      let setting = await AgentVendorSetting.findOne({
        where: { agent_id: agentId, vendor_id: vendorId },
      });
      if (setting) {
        await setting.update({ is_disabled: disabledState });
      } else {
        setting = await AgentVendorSetting.create({
          agent_id: agentId,
          vendor_id: vendorId,
          is_disabled: disabledState,
        });
      }
      return setting;
    } catch (error) {
      console.error("Error toggling agent vendor disabled:", error);
      throw new AppError("Failed to toggle agent vendor disabled", 500);
    }
  }

  /**
   * Toggle the disabled state of a vendor
   * @param {number} id - Vendor ID
   * @param {boolean} disabledState - New disabled state
   * @returns {Object} Updated vendor
   */
  async toggleVendorDisabled(id, disabledState) {
    try {
      const vendor = await ZenithVendor.findByPk(id);

      if (!vendor) {
        throw new AppError("Vendor not found", 404);
      }

      // Update only the is_disabled field
      await vendor.update({ is_disabled: disabledState });

      // Return the updated vendor with formatted data
      return this.formatVendorData([vendor])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(
        `Error toggling disabled state for vendor with ID ${id}:`,
        error
      );
      throw new AppError(
        `Failed to toggle vendor disabled state: ${error.message}`,
        500
      );
    }
  }

  /**
   * Format vendor data to split comma-separated strings into arrays
   * @param {Array} vendors - Array of vendor objects
   * @returns {Array} Formatted vendor data
   */
  formatVendorData(vendors) {
    return vendors.map((vendor) => {
      const vendorData = vendor.toJSON();

      // Split category codes into array if they exist
      if (vendorData.categoryCode) {
        vendorData.categories = vendorData.categoryCode
          .split(",")
          .map((cat) => cat.trim());
      } else {
        vendorData.categories = [];
      }

      // Split currency codes into array if they exist
      if (vendorData.currencyCode) {
        vendorData.currencies = vendorData.currencyCode
          .split(",")
          .map((curr) => curr.trim());
      } else {
        vendorData.currencies = [];
      }

      return vendorData;
    });
  }

  /**
   *
   * ZENITH GAME
   *
   */

  /**
   * Get all games with formatted language, platform, and currency codes
   * Get all games with agent-specific disable settings.
   * For admin: can get all agent settings. For agent: only own settings.
   * @param {Object} filters - Optional filters for the query
   * @returns {Array} Array of game objects
   */
  async getAllGames(
    filters = {},
    page = 1,
    limit = 20,
    agentId = null,
    isAdmin = false
  ) {
    try {
      const offset = (page - 1) * limit;
      const where = {};

      // Filter by vendor_id (provider)
      if (filters.provider) {
        where.vendor_id = filters.provider;
      }

      // Search by name, gameCode, or id
      if (filters.search) {
        where[Op.or] = [
          { gameName: { [Op.like]: `%${filters.search}%` } },
          { gameCode: { [Op.like]: `%${filters.search}%` } },
        ];
        if (!isNaN(Number(filters.search))) {
          where[Op.or].push({ id: Number(filters.search) });
        }
      }

      // Filter by category/type
      if (filters.categoryCode && filters.categoryCode !== "All Types") {
        where.categoryCode = filters.categoryCode;
      }

      // Include agent game settings
      let include = [
        {
          model: require("../models").ZenithVendor,
          as: "vendor",
          attributes: ["id", "name", "code"],
        },
      ];
      if (isAdmin) {
        include.push({
          model: AgentGameSetting,
          as: "agentSettings",
        });
      } else if (agentId) {
        include.push({
          model: AgentGameSetting,
          as: "agentSettings",
          where: { agent_id: agentId },
          required: false,
        });
      }

      const { rows, count } = await ZenithGame.findAndCountAll({
        where,
        offset,
        limit,
        order: [["id", "ASC"]],
        include,
      });

      // Always use formatGameData to ensure correct structure
      let games = this.formatGameData(rows);

      // Attach agent-specific is_disabled if present
      games = games.map((data) => {
        if (!isAdmin && agentId) {
          const setting = (data.agentSettings || []).find(
            (s) => String(s.agent_id) === String(agentId)
          );
          data.agent_is_disabled = setting ? setting.is_disabled : false;
        }
        return data;
      });

      // Now filter by agent_is_disabled if requested
      if (filters.status === "Enabled") {
        games = games.filter((g) => !g.agent_is_disabled);
      } else if (filters.status === "Disabled") {
        games = games.filter((g) => g.agent_is_disabled);
      }

      console.log(games);
      // Debug: log any game with undefined languages/platforms/currencies
      games.forEach((g) => {
        if (
          !Array.isArray(g.languages) ||
          !Array.isArray(g.platforms) ||
          !Array.isArray(g.currencies)
        ) {
          console.error(
            "[ZenithService.getAllGames] Game ID",
            g.id,
            "has invalid arrays:",
            {
              languages: g.languages,
              platforms: g.platforms,
              currencies: g.currencies,
            }
          );
        }
      });

      return { games, total: count };
    } catch (error) {
      console.error("Error fetching games:", error);
      throw new AppError("Failed to fetch games", 500);
    }
  }

  /**
   * Get game by ID with formatted language, platform, and currency codes
   * @param {number} id - Game ID
   * @returns {Object} Game data
   */
  async getGameById(id) {
    try {
      const game = await ZenithGame.findByPk(id, {
        include: [
          {
            model: ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      if (!game) {
        throw new AppError("Game not found", 404);
      }

      return this.formatGameData([game])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error fetching game with ID ${id}:`, error);
      throw new AppError("Failed to fetch game", 500);
    }
  }

  /**
   * Create a new game
   * @param {Object} gameData - Game data
   * @returns {Object} Created game
   */
  async createGame(gameData) {
    try {
      // Check if game with same code already exists
      const existingGame = await ZenithGame.findOne({
        where: { gameCode: gameData.gameCode },
      });

      if (existingGame) {
        throw new AppError(
          `Game with code '${gameData.gameCode}' already exists`,
          400
        );
      }

      // If vendorId is provided, verify the vendor exists
      if (gameData.vendorId) {
        const vendor = await ZenithVendor.findByPk(gameData.vendorId);
        if (!vendor) {
          throw new AppError(
            `Vendor with ID ${gameData.vendorId} not found`,
            400
          );
        }
      }

      // Create the game
      const game = await ZenithGame.create(gameData);

      // Fetch the created game with vendor info to return
      const createdGame = await ZenithGame.findByPk(game.id, {
        include: [
          {
            model: ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      return this.formatGameData([createdGame])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error creating game:", error);
      throw new AppError(`Failed to create game: ${error.message}`, 500);
    }
  }

  /**
   * Update an existing game
   * @param {number} id - Game ID
   * @param {Object} gameData - Updated game data
   * @returns {Object} Updated game
   */
  async updateGame(id, gameData) {
    try {
      const game = await ZenithGame.findByPk(id);

      if (!game) {
        throw new AppError("Game not found", 404);
      }

      // Check if trying to update code to one that already exists
      if (gameData.gameCode && gameData.gameCode !== game.gameCode) {
        const existingGame = await ZenithGame.findOne({
          where: { gameCode: gameData.gameCode },
        });

        if (existingGame) {
          throw new AppError(
            `Game with code '${gameData.gameCode}' already exists`,
            400
          );
        }
      }

      // If vendorId is provided, verify the vendor exists
      if (gameData.vendorId) {
        const vendor = await ZenithVendor.findByPk(gameData.vendorId);
        if (!vendor) {
          throw new AppError(
            `Vendor with ID ${gameData.vendorId} not found`,
            400
          );
        }
      }

      // Update the game
      await game.update(gameData);

      // Fetch the updated game with vendor info to return
      const updatedGame = await ZenithGame.findByPk(id, {
        include: [
          {
            model: ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      return this.formatGameData([updatedGame])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error updating game with ID ${id}:`, error);
      throw new AppError(`Failed to update game: ${error.message}`, 500);
    }
  }

  /**
   * Delete a game
   * @param {number} id - Game ID
   * @returns {boolean} True if deleted successfully
   */
  async deleteGame(id) {
    try {
      const game = await ZenithGame.findByPk(id);

      if (!game) {
        throw new AppError("Game not found", 404);
      }

      await game.destroy();
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`Error deleting game with ID ${id}:`, error);
      throw new AppError("Failed to delete game", 500);
    }
  }

  /**
   * Toggle the disabled state of a game for an agent (per-agent).
   */
  async toggleAgentGameDisabled(agentId, gameId, disabledState) {
    try {
      let setting = await AgentGameSetting.findOne({
        where: { agent_id: agentId, game_id: gameId },
      });
      if (setting) {
        await setting.update({ is_disabled: disabledState });
      } else {
        setting = await AgentGameSetting.create({
          agent_id: agentId,
          game_id: gameId,
          is_disabled: disabledState,
        });
      }
      return setting;
    } catch (error) {
      console.error("Error toggling agent game disabled:", error);
      throw new AppError("Failed to toggle agent game disabled", 500);
    }
  }

  /**
   * Toggle the disabled state of a game
   * @param {number} id - Game ID
   * @param {boolean} disabledState - New disabled state
   * @returns {Object} Updated game
   */
  async toggleGameDisabled(id, disabledState) {
    try {
      const game = await ZenithGame.findByPk(id);

      if (!game) {
        throw new AppError("Game not found", 404);
      }

      // Update only the is_disabled field
      await game.update({ is_disabled: disabledState });

      // Fetch the updated game with vendor info to return
      const updatedGame = await ZenithGame.findByPk(id, {
        include: [
          {
            model: ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
          },
        ],
      });

      return this.formatGameData([updatedGame])[0];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(
        `Error toggling disabled state for game with ID ${id}:`,
        error
      );
      throw new AppError(
        `Failed to toggle game disabled state: ${error.message}`,
        500
      );
    }
  }

  /**
   * Format game data to split comma-separated strings into arrays
   * @param {Array} games - Array of game objects
   * @returns {Array} Formatted game data
   */
  formatGameData(games) {
    return games.map((game) => {
      const gameData = game.toJSON();

      // Don't split categoryCode as it's a single value per requirement

      // Split language codes into array if they exist
      if (gameData.languageCode) {
        gameData.languages = gameData.languageCode
          .split(",")
          .map((lang) => lang.trim());
      } else {
        gameData.languages = [];
      }

      // Split platform codes into array if they exist
      if (gameData.platformCode) {
        gameData.platforms = gameData.platformCode
          .split(",")
          .map((platform) => platform.trim());
      } else {
        gameData.platforms = [];
      }

      // Split currency codes into array if they exist
      if (gameData.currencyCode) {
        gameData.currencies = gameData.currencyCode
          .split(",")
          .map((curr) => curr.trim());
      } else {
        gameData.currencies = [];
      }

      return gameData;
    });
  }

  /**
   * Bulk upsert games into ZenithGame model.
   * @param {Array<Object>} games - Array of game objects to upsert
   * @returns {Promise<void>}
   */
  async upsertGame(games) {
    if (!Array.isArray(games) || games.length === 0) return;

    const updateFields = [
      "gameName",
      "categoryCode",
      "imageSquare",
      "imageLandscape",
      "languageCode",
      "platformCode",
      "currencyCode",
      "is_active",
      "is_disabled",
    ];

    const BATCH_SIZE = 500; // adjust as needed
    try {
      for (let i = 0; i < games.length; i += BATCH_SIZE) {
        const batch = games.slice(i, i + BATCH_SIZE);
        await ZenithGame.bulkCreate(batch, {
          updateOnDuplicate: updateFields,
        });
        console.log(
          `Upserted batch ${i / BATCH_SIZE + 1} (${batch.length} games)`
        );
      }
    } catch (error) {
      console.error("Error upserting games:", error);
      throw new AppError("Failed to upsert games", 500);
    }
  }

  /**
   * Bulk upsert vendors into ZenithVendor model.
   * @param {Array<Object>} vendors - Array of vendor objects to upsert
   * @returns {Promise<void>}
   */
  async upsertVendors(vendors) {
    if (!Array.isArray(vendors) || vendors.length === 0) return;

    const updateFields = ["name", "categoryCode", "currencyCode", "is_active"];

    const BATCH_SIZE = 500;
    try {
      for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
        const batch = vendors.slice(i, i + BATCH_SIZE);
        await ZenithVendor.bulkCreate(batch, {
          updateOnDuplicate: updateFields,
        });
        console.log(
          `Upserted vendor batch ${i / BATCH_SIZE + 1} (${
            batch.length
          } vendors)`
        );
      }
    } catch (error) {
      console.error("Error upserting vendors:", error);
      throw new AppError("Failed to upsert vendors", 500);
    }
  }
}

module.exports = new ZenithService();
