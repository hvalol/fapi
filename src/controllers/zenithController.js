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
   * Get all vendors
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
      const { vendors, total } = await zenithService.getAllVendors(
        filters,
        page,
        limit
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
   * Toggle the disabled state of a vendor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
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

  //   zenith Games
  /**
   * Get all games with optional filtering
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

      const { games, total } = await zenithService.getAllGames(
        filters,
        page,
        limit
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
   * Toggle the disabled state of a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async toggleGameDisabled(req, res, next) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return next(new AppError("Invalid game ID", 400));
      }

      if (typeof req.body.disabled !== "boolean") {
        return next(new AppError("disabled field must be a boolean", 400));
      }

      const game = await zenithService.toggleGameDisabled(
        id,
        req.body.disabled
      );

      const message = req.body.disabled
        ? "Game temporarily disabled successfully"
        : "Game enabled successfully";

      res.json({
        status: "success",
        data: {
          game,
          message,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncGamesApi(req, res, next) {
    try {
      const apiSecret =
        process.env.apiSecret ||
        "2981bb3859732a61cc18c3da21b0b380a8ed88ed02607fd1fff4405e217677c3";
      const apiKey =
        process.env.apiKey ||
        "b4b517b8ae043835f67f8a0fc6c251a10d983345a3539b3fb736c80399a9502e";

      // 1. Get all vendors
      console.log("[syncGamesApi] Fetching all vendors...");
      const vendors = await zenithService.getAllVendors();
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
      const apiSecret =
        process.env.apiSecret ||
        "2981bb3859732a61cc18c3da21b0b380a8ed88ed02607fd1fff4405e217677c3";
      const apiKey =
        process.env.apiKey ||
        "b4b517b8ae043835f67f8a0fc6c251a10d983345a3539b3fb736c80399a9502e";

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
}

module.exports = new ZenithController();
