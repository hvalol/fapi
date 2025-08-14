const zenithService = require("../services/zenithService");
const { AppError } = require("../middlewares/errorHandler");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * ZenithController
 * Handles HTTP requests for Zenith vendor operations
 */
class ZenithController {
  /**
   * Get all vendors, filtered by agent's allowed_providers if agentId is provided.
   * For admin: can get all agent settings. For agent/clientadmin: only own settings.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllVendors(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        type: req.query.type,
        status: req.query.status,
      };
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      let agentId = null;
      let isAdmin = false;

      // If admin, can get all settings
      if (req.user && req.user.role === "Admin") {
        isAdmin = true;
        if (req.query.agentId) {
          agentId = parseInt(req.query.agentId);
          if (isNaN(agentId)) {
            return next(new AppError("Invalid agent ID", 400));
          }
        }
      } else {
        // For Agent/ClientAdmin/SubAgent, use their own agent_id
        if (req.user && req.query.agentId) {
          agentId = req.query.agentId;
        }
      }

      const { vendors, total } = await zenithService.getAllVendors(
        filters,
        page,
        limit,
        agentId,
        isAdmin
      );

      res.json({
        status: "success",
        data: {
          vendors,
          total,
          page,
          limit,
          count: vendors.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getVendorById(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendor = await zenithService.getVendorById(id);

      res.json({
        status: "success",
        data: {
          vendor,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new vendor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createVendor(req, res, next) {
    try {
      const vendorData = {
        name: req.body.name,
        code: req.body.code,
        categoryCode: req.body.categoryCode,
        currencyCode: req.body.currencyCode,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      };

      const vendor = await zenithService.createVendor(vendorData);

      res.status(201).json({
        status: "success",
        data: {
          vendor,
          message: "Vendor created successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing vendor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateVendor(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendorData = {};

      // Only include fields that are provided in the request
      if (req.body.name !== undefined) vendorData.name = req.body.name;
      if (req.body.code !== undefined) vendorData.code = req.body.code;
      if (req.body.categoryCode !== undefined)
        vendorData.categoryCode = req.body.categoryCode;
      if (req.body.currencyCode !== undefined)
        vendorData.currencyCode = req.body.currencyCode;
      if (req.body.is_active !== undefined)
        vendorData.is_active = req.body.is_active;

      const vendor = await zenithService.updateVendor(id, vendorData);

      res.json({
        status: "success",
        data: {
          vendor,
          message: "Vendor updated successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a vendor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteVendor(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      await zenithService.deleteVendor(id);

      res.json({
        status: "success",
        data: {
          message: "Vendor deleted successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable a vendor temporarily
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async disableVendor(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendor = await zenithService.toggleVendorDisabled(id, true);

      res.json({
        status: "success",
        data: {
          vendor,
          message: "Vendor temporarily disabled successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable a previously disabled vendor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async enableVendor(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid vendor ID", 400));
      }

      const vendor = await zenithService.toggleVendorDisabled(id, false);

      res.json({
        status: "success",
        data: {
          vendor,
          message: "Vendor enabled successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle the disabled state of a vendor for an agent (per-agent setting).
   * For admin: can set for any agent. For agent/clientadmin: only own agent.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async toggleVendorDisabled(req, res, next) {
    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        return next(new AppError("Invalid vendor ID", 400));
      }
      if (typeof req.body.disabled !== "boolean") {
        return next(new AppError("disabled field must be a boolean", 400));
      }

      let agentId = null;
      let isAdmin = false;

      if (req.user && req.user.role === "Admin") {
        isAdmin = true;
        agentId = req.body.agentId || req.query.agentId;
        if (!agentId) {
          return next(new AppError("agentId is required for admin", 400));
        }
      } else {
        if (req.user && req.body.agentId) {
          agentId = req.body.agentId;
        } else {
          return next(new AppError("You do not have permission", 403));
        }
      }

      const updatedSetting = await zenithService.toggleAgentVendorDisabled(
        agentId,
        vendorId,
        req.body.disabled
      );

      res.json({
        status: "success",
        data: {
          agentVendorSetting: updatedSetting,
          message: req.body.disabled
            ? "Vendor disabled for agent"
            : "Vendor enabled for agent",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  //   zenith Games
  /**
   * Get all games, including agent-specific disable settings.
   * For admin: can get all agent settings. For agent/clientadmin: only own settings.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllGames(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        categoryCode: req.query.categoryCode,
        provider: req.query.provider,
        status: req.query.status,
      };

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      let agentId = null;
      let isAdmin = false;

      if (req.user && req.user.role === "Admin") {
        isAdmin = true;
        if (req.query.agentId) {
          agentId = parseInt(req.query.agentId);
          if (isNaN(agentId)) {
            return next(new AppError("Invalid agent ID", 400));
          }
        }
      } else {
        if (req.user && req.query.agentId) {
          agentId = req.query.agentId;
        }
      }

      const { games, total } = await zenithService.getAllGames(
        filters,
        page,
        limit,
        agentId,
        isAdmin
      );

      res.json({
        status: "success",
        data: {
          games,
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get game by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getGameById(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      const game = await zenithService.getGameById(id);

      res.json({
        status: "success",
        data: {
          game,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createGame(req, res, next) {
    try {
      const gameData = {
        gameCode: req.body.gameCode,
        gameName: req.body.gameName,
        categoryCode: req.body.categoryCode,
        imageSquare: req.body.imageSquare,
        imageLandscape: req.body.imageLandscape,
        languageCode: req.body.languageCode,
        platformCode: req.body.platformCode,
        currencyCode: req.body.currencyCode,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
        is_disabled:
          req.body.is_disabled !== undefined ? req.body.is_disabled : false,
        vendorId: req.body.vendorId || null,
      };

      const game = await zenithService.createGame(gameData);

      res.status(201).json({
        status: "success",
        data: {
          game,
          message: "Game created successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateGame(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      const gameData = {};

      // Only include fields that are provided in the request
      if (req.body.gameCode !== undefined)
        gameData.gameCode = req.body.gameCode;
      if (req.body.gameName !== undefined)
        gameData.gameName = req.body.gameName;
      if (req.body.categoryCode !== undefined)
        gameData.categoryCode = req.body.categoryCode;
      if (req.body.imageSquare !== undefined)
        gameData.imageSquare = req.body.imageSquare;
      if (req.body.imageLandscape !== undefined)
        gameData.imageLandscape = req.body.imageLandscape;
      if (req.body.languageCode !== undefined)
        gameData.languageCode = req.body.languageCode;
      if (req.body.platformCode !== undefined)
        gameData.platformCode = req.body.platformCode;
      if (req.body.currencyCode !== undefined)
        gameData.currencyCode = req.body.currencyCode;
      if (req.body.is_active !== undefined)
        gameData.is_active = req.body.is_active;
      if (req.body.vendorId !== undefined)
        gameData.vendorId = req.body.vendorId;

      // Don't allow is_disabled to be updated here - it should be updated via the toggle endpoints

      const game = await zenithService.updateGame(id, gameData);

      res.json({
        status: "success",
        data: {
          game,
          message: "Game updated successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteGame(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      await zenithService.deleteGame(id);

      res.json({
        status: "success",
        data: {
          message: "Game deleted successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable a game temporarily
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async disableGame(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      const game = await zenithService.toggleGameDisabled(id, true);

      res.json({
        status: "success",
        data: {
          game,
          message: "Game temporarily disabled successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable a previously disabled game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async enableGame(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      const game = await zenithService.toggleGameDisabled(id, false);

      res.json({
        status: "success",
        data: {
          game,
          message: "Game enabled successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle the disabled state of a game for an agent (per-agent setting).
   * For admin: can set for any agent. For agent/clientadmin: only own agent.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async toggleGameDisabled(req, res, next) {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return next(new AppError("Invalid game ID", 400));
      }
      if (typeof req.body.disabled !== "boolean") {
        return next(new AppError("disabled field must be a boolean", 400));
      }

      let agentId = null;
      let isAdmin = false;

      console.log("body", req.body);
      console.log("user", req.user);
      if (req.user && req.user.role === "Admin") {
        isAdmin = true;
        agentId = req.body.agentId || req.query.agentId;
        if (!agentId) {
          return next(new AppError("agentId is required for admin", 400));
        }
      } else {
        if (req.user && req.body.agentId) {
          agentId = req.body.agentId;
        } else {
          return next(new AppError("You do not have permission", 403));
        }
      }

      const updatedSetting = await zenithService.toggleAgentGameDisabled(
        agentId,
        gameId,
        req.body.disabled
      );

      res.json({
        status: "success",
        data: {
          agentGameSetting: updatedSetting,
          message: req.body.disabled
            ? "Game disabled for agent"
            : "Game enabled for agent",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncGamesApi(req, res, next) {
    try {
      const apiSecret = process.env.API_SECRET;
      const apiKey = process.env.API_KEY;

      // 1. Get all vendors
      console.log("[syncGamesApi] Fetching all vendors...");
      const { vendors } = await zenithService.getAllVendors();
      console.log(`[syncGamesApi] Found ${vendors.length} vendors.`);

      let allGames = [];

      // 2. For each vendor
      for (const vendor of vendors) {
        let pageNo = 1;
        let totalPages = 1;
        console.log(
          `[syncGamesApi] Syncing games for vendor: ${vendor.code} (ID: ${vendor.id})`
        );

        do {
          const traceId = uuidv4();
          const data = {
            traceId,
            vendorCode: vendor.code,
            pageNo,
          };
          const jsonBody = JSON.stringify(data);

          // Generate signature
          const signature = crypto
            .createHmac("sha256", apiSecret)
            .update(jsonBody)
            .digest("hex");

          console.log(
            `[syncGamesApi] Requesting page ${pageNo} for vendor ${vendor.code}...`
          );
          // Call Zenith API
          const response = await axios.post(
            "https://stg.gasea168.com/game/list",
            data,
            {
              headers: {
                "Content-Type": "application/json",
                "x-signature": signature,
                "x-api-key": apiKey,
                traceId,
              },
            }
          );

          const respData = response.data.data;
          if (!respData || !respData.games) {
            console.log(
              `[syncGamesApi] No games found for vendor ${vendor.code} on page ${pageNo}.`
            );
            break;
          }

          // 3. Map games using headers
          const headers = respData.headers;
          let gamesThisPage = 0;
          for (const gameArr of respData.games) {
            const gameObj = {};
            for (const [key, idx] of Object.entries(headers)) {
              gameObj[key] = gameArr[idx];
            }
            gameObj.vendorId = vendor.id;
            allGames.push(gameObj);
            gamesThisPage++;
          }
          console.log(
            `[syncGamesApi] Fetched ${gamesThisPage} games for vendor ${vendor.code} on page ${pageNo}.`
          );

          // 4. Upsert into zenithGames model (bulk after all pages)
          pageNo++;
          totalPages = respData.totalPages;
        } while (pageNo <= totalPages);
      }

      // Bulk upsert after all vendors/pages
      if (allGames.length > 0) {
        console.log(
          `[syncGamesApi] Upserting ${allGames.length} games into database...`
        );
        await zenithService.upsertGame(allGames);
        console.log("[syncGamesApi] Upsert complete.");
      } else {
        console.log("[syncGamesApi] No games to upsert.");
      }

      res.json({
        status: "success",
        count: allGames.length,
        message: "Games synced successfully",
      });
    } catch (error) {
      console.error("[syncGamesApi] Error:", error);
      next(error);
    }
  }

  /**
   * Sync vendors from external Zenith API and upsert into local database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async syncVendorsApi(req, res, next) {
    try {
      const apiSecret = process.env.apiSecret;
      const apiKey = process.env.apiKey;

      const traceId = uuidv4();
      const data = { traceId };
      const jsonBody = JSON.stringify(data);

      // Generate signature
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(jsonBody)
        .digest("hex");

      // Call Zenith vendor API
      const response = await axios.post(
        "https://stg.gasea168.com/vendor/list",
        data,
        {
          headers: {
            "Content-Type": "application/json",
            "x-signature": signature,
            "x-api-key": apiKey,
            traceId,
          },
        }
      );

      const respData = response.data.data;
      if (!Array.isArray(respData)) {
        return res.status(500).json({
          status: "error",
          message: "Invalid vendor data received from Zenith API",
        });
      }

      // Map and upsert vendors
      const vendorsToUpsert = respData.map((vendor) => ({
        name: vendor.name,
        code: vendor.code,
        categoryCode: vendor.categoryCode,
        currencyCode: vendor.currencyCode,
        is_active: true, // default to active
      }));

      if (vendorsToUpsert.length > 0) {
        await zenithService.upsertVendors(vendorsToUpsert);
      }

      res.json({
        status: "success",
        count: vendorsToUpsert.length,
        message: "Vendors synced successfully",
      });
    } catch (error) {
      console.error("[syncVendorsApi] Error:", error);
      next(error);
    }
  }

  /* *********** admin ************ */

  /**
   * Get allowed vendors for a specific agent, including per-agent disable state.
   * Only for admin.
   */
  async getAgentAllowedVendors(req, res, next) {
    try {
      if (!req.user || req.user.role !== "Admin") {
        return next(new AppError("Forbidden", 403));
      }
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) {
        return next(new AppError("Invalid agent ID", 400));
      }
      // Get allowed vendors for agent (from AgentSettings.allowed_providers)
      const { vendors } = await zenithService.getAllVendors(
        {},
        1,
        1000,
        agentId,
        false // not admin, so only allowed vendors
      );
      res.json({
        status: "success",
        data: { vendors },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set vendor enable/disable for a specific agent (admin only)
   */
  async setAgentVendorDisabled(req, res, next) {
    try {
      if (!req.user || req.user.role !== "Admin") {
        return next(new AppError("Forbidden", 403));
      }
      const agentId = parseInt(req.params.agentId);
      const vendorId = parseInt(req.params.vendorId);
      const { disabled } = req.body;
      if (isNaN(agentId) || isNaN(vendorId)) {
        return next(new AppError("Invalid agent or vendor ID", 400));
      }
      if (typeof disabled !== "boolean") {
        return next(new AppError("disabled must be boolean", 400));
      }
      const setting = await zenithService.toggleAgentVendorDisabled(
        agentId,
        vendorId,
        disabled
      );
      res.json({
        status: "success",
        data: {
          agentVendorSetting: setting,
          message: disabled
            ? "Vendor disabled for agent"
            : "Vendor enabled for agent",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GAMES

  async getAllAgentGames(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        categoryCode: req.query.categoryCode,
        provider: req.query.provider,
        status: req.query.status,
      };

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      let agentId = null;
      let isAdmin = false;

      if (req.user && req.user.role === "Admin") {
        isAdmin = true;
        if (req.query.agentId) {
          agentId = parseInt(req.query.agentId);
          if (isNaN(agentId)) {
            return next(new AppError("Invalid agent ID", 400));
          }
        }
      } else {
        if (req.user && req.query.agentId) {
          agentId = req.query.agentId;
        }
      }

      const { games, total } = await zenithService.getAllGames(
        filters,
        page,
        limit,
        agentId,
        false
      );

      res.json({
        status: "success",
        data: {
          games,
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ZenithController();
