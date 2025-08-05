const zenithService = require("../services/zenithService");
const { AppError } = require("../middlewares/errorHandler");

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
      const vendors = await zenithService.getAllVendors();

      res.json({
        status: "success",
        data: {
          vendors,
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

      const vendor = await zenithService.toggleVendorDisabled(
        id,
        req.body.disabled
      );

      const message = req.body.disabled
        ? "Vendor temporarily disabled successfully"
        : "Vendor enabled successfully";

      res.json({
        status: "success",
        data: {
          vendor,
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
      // Extract filter parameters from query string
      const filters = {};

      if (req.query.categoryCode) {
        filters.categoryCode = req.query.categoryCode;
      }

      if (req.query.vendorId) {
        const vendorId = parseInt(req.query.vendorId);
        if (!isNaN(vendorId)) {
          filters.vendorId = vendorId;
        }
      }

      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === "true";
      }

      if (req.query.isDisabled !== undefined) {
        filters.isDisabled = req.query.isDisabled === "true";
      }

      const games = await zenithService.getAllGames(filters);

      res.json({
        status: "success",
        data: {
          games,
          count: games.length,
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
}

module.exports = new ZenithController();
