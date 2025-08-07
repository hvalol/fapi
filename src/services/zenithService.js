const { ZenithVendor, ZenithGame } = require("../models");
const { AppError } = require("../middlewares/errorHandler");

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
   * Get all vendors with formatted category and currency codes
   * @returns {Array} Array of vendor objects
   */
  async getAllVendors() {
    try {
      const vendors = await ZenithVendor.findAll();
      return this.formatVendorData(vendors);
    } catch (error) {
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
   * Toggle the disabled state of a vendor
   * @param {number} id - Vendor ID
   * @param {boolean} disabledState - New disabled state
   * @returns {Object} Updated vendor
   */
  async toggleVendorDisabled(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      if (typeof req.body.disabled !== "boolean") {
        return next(new AppError("disabled field must be a boolean", 400));
      }

      // Get the vendor first to check client_id if user is ClientAdmin
      const vendor = await zenithService.getVendorById(id);

      // If user is ClientAdmin, check if vendor belongs to their client
      if (req.user.role === "ClientAdmin") {
        // TODO: Implement checking of vendor is enabled by admin for this client
      }

      const updatedVendor = await zenithService.toggleVendorDisabled(
        id,
        req.body.disabled
      );

      const message = req.body.disabled
        ? "Vendor temporarily disabled successfully"
        : "Vendor enabled successfully";

      res.json({
        status: "success",
        data: {
          vendor: updatedVendor,
          message,
        },
      });
    } catch (error) {
      next(error);
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
   * @param {Object} filters - Optional filters for the query
   * @returns {Array} Array of game objects
   */
  async getAllGames(filters = {}) {
    try {
      // Build query options
      const queryOptions = {
        include: [
          {
            model: ZenithVendor,
            as: "vendor",
            attributes: ["id", "name", "code"],
          },
        ],
      };

      // Add filters if provided
      if (Object.keys(filters).length > 0) {
        queryOptions.where = {};

        if (filters.categoryCode) {
          queryOptions.where.categoryCode = filters.categoryCode;
        }

        if (filters.vendorId) {
          queryOptions.where.vendorId = filters.vendorId;
        }

        if (filters.isActive !== undefined) {
          queryOptions.where.is_active = filters.isActive;
        }

        if (filters.isDisabled !== undefined) {
          queryOptions.where.is_disabled = filters.isDisabled;
        }
      }

      const games = await ZenithGame.findAll(queryOptions);
      return this.formatGameData(games);
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
}

module.exports = new ZenithService();
