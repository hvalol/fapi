const express = require("express");
const { body, param, query } = require("express-validator");
const zenithController = require("../controllers/zenithController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const loggingMiddleware = require("../middlewares/loggingMiddleware");

const router = express.Router();

// All zenith routes require authentication
router.use(authenticate);

// ------- SYNC VENDORS AND GAMES ------- //
// SYNC vendor
router.get("/syncVendors", zenithController.syncVendorsApi);

// Sync Games
router.get("/syncGames", zenithController.syncGamesApi);

/*
 *
 * ZENITH VENDOR
 *
 */
// Get all vendors
router.get("/vendors", zenithController.getAllVendors);

// get all vendors without filter
router.get("/vendors/all", zenithController.getAllVendorsNoAgent);

// Get vendor by ID
router.get(
  "/vendors/:id",
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.getVendorById
);

// Create a new vendor
router.post(
  "/vendors",
  [
    loggingMiddleware(),
    body("name")
      .notEmpty()
      .withMessage("Vendor name is required")
      .isLength({ max: 100 })
      .withMessage("Vendor name cannot exceed 100 characters"),
    body("code")
      .notEmpty()
      .withMessage("Vendor code is required")
      .isLength({ max: 50 })
      .withMessage("Vendor code cannot exceed 50 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Vendor code can only contain alphanumeric characters, underscores, and hyphens"
      ),
    body("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string"),
    body("currencyCode")
      .optional()
      .isString()
      .withMessage("Currency code must be a string"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean value"),
    validateRequest,
  ],
  zenithController.createVendor
);

// Update an existing vendor
router.put(
  "/vendors/:id",
  authorize("Admin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    body("name")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Vendor name cannot exceed 100 characters"),
    body("code")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Vendor code cannot exceed 50 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Vendor code can only contain alphanumeric characters, underscores, and hyphens"
      ),
    body("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string"),
    body("currencyCode")
      .optional()
      .isString()
      .withMessage("Currency code must be a string"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean value"),
    validateRequest,
  ],
  zenithController.updateVendor
);

// Delete a vendor
router.delete(
  "/vendors/:id",
  authorize("Admin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.deleteVendor
);

// Toggle vendor disabled state (generic endpoint)
router.patch(
  "/vendors/:id/toggle-disabled",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    body("disabled")
      .isBoolean()
      .withMessage("disabled field must be a boolean value"),
    validateRequest,
  ],
  zenithController.toggleVendorDisabled
);

// Disable a vendor
router.post(
  "/vendors/:id/disable",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.disableVendor
);

// Enable a vendor
router.post(
  "/vendors/:id/enable",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.enableVendor
);

/**
 *
 * ZENITH GAME
 *
 */
// Get all games with optional filtering
router.get(
  "/",
  [
    query("vendorId")
      .optional()
      .isInt()
      .withMessage("Vendor ID must be an integer"),
    query("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string"),
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    query("isDisabled")
      .optional()
      .isBoolean()
      .withMessage("isDisabled must be a boolean"),
    validateRequest,
  ],
  zenithController.getAllGames
);

// Get game by ID
router.get(
  "/:id",
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    validateRequest,
  ],
  zenithController.getGameById
);

// Create a new game
router.post(
  "/",
  authorize("Admin"),
  loggingMiddleware(),
  [
    body("gameCode")
      .notEmpty()
      .withMessage("Game code is required")
      .isLength({ max: 100 })
      .withMessage("Game code cannot exceed 100 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Game code can only contain alphanumeric characters, underscores, and hyphens"
      ),
    body("gameName")
      .notEmpty()
      .withMessage("Game name is required")
      .isLength({ max: 255 })
      .withMessage("Game name cannot exceed 255 characters"),
    body("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string")
      .isLength({ max: 50 })
      .withMessage("Category code cannot exceed 50 characters"),
    body("imageSquare")
      .optional()
      .isURL()
      .withMessage("Image square must be a valid URL")
      .isLength({ max: 255 })
      .withMessage("Image square URL cannot exceed 255 characters"),
    body("imageLandscape")
      .optional()
      .isURL()
      .withMessage("Image landscape must be a valid URL")
      .isLength({ max: 255 })
      .withMessage("Image landscape URL cannot exceed 255 characters"),
    body("languageCode")
      .optional()
      .isString()
      .withMessage("Language code must be a string")
      .isLength({ max: 255 })
      .withMessage("Language code cannot exceed 255 characters"),
    body("platformCode")
      .optional()
      .isString()
      .withMessage("Platform code must be a string")
      .isLength({ max: 255 })
      .withMessage("Platform code cannot exceed 255 characters"),
    body("currencyCode")
      .optional()
      .isString()
      .withMessage("Currency code must be a string")
      .isLength({ max: 255 })
      .withMessage("Currency code cannot exceed 255 characters"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean value"),
    body("is_disabled")
      .optional()
      .isBoolean()
      .withMessage("is_disabled must be a boolean value"),
    body("vendorId")
      .optional()
      .isInt()
      .withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.createGame
);

// Update an existing game
router.put(
  "/:id",
  authorize("Admin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    body("gameCode")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Game code cannot exceed 100 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Game code can only contain alphanumeric characters, underscores, and hyphens"
      ),
    body("gameName")
      .optional()
      .isLength({ max: 255 })
      .withMessage("Game name cannot exceed 255 characters"),
    body("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string")
      .isLength({ max: 50 })
      .withMessage("Category code cannot exceed 50 characters"),
    body("imageSquare")
      .optional()
      .isURL()
      .withMessage("Image square must be a valid URL")
      .isLength({ max: 255 })
      .withMessage("Image square URL cannot exceed 255 characters"),
    body("imageLandscape")
      .optional()
      .isURL()
      .withMessage("Image landscape must be a valid URL")
      .isLength({ max: 255 })
      .withMessage("Image landscape URL cannot exceed 255 characters"),
    body("languageCode")
      .optional()
      .isString()
      .withMessage("Language code must be a string")
      .isLength({ max: 255 })
      .withMessage("Language code cannot exceed 255 characters"),
    body("platformCode")
      .optional()
      .isString()
      .withMessage("Platform code must be a string")
      .isLength({ max: 255 })
      .withMessage("Platform code cannot exceed 255 characters"),
    body("currencyCode")
      .optional()
      .isString()
      .withMessage("Currency code must be a string")
      .isLength({ max: 255 })
      .withMessage("Currency code cannot exceed 255 characters"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean value"),
    body("vendorId")
      .optional()
      .isInt()
      .withMessage("Vendor ID must be an integer"),
    validateRequest,
  ],
  zenithController.updateGame
);

// Delete a game
router.delete(
  "/:id",
  authorize("Admin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    validateRequest,
  ],
  zenithController.deleteGame
);

// Toggle game disabled state (generic endpoint)
router.patch(
  "/:id/toggle-disabled",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    body("disabled")
      .isBoolean()
      .withMessage("disabled field must be a boolean value"),
    validateRequest,
  ],
  zenithController.toggleGameDisabled
);

// Disable a game
router.post(
  "/:id/disable",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    validateRequest,
  ],
  zenithController.disableGame
);

// Enable a game
router.post(
  "/:id/enable",
  authorize("Admin", "ClientAdmin"),
  loggingMiddleware(),
  [
    param("id").isInt().withMessage("Game ID must be an integer"),
    validateRequest,
  ],
  zenithController.enableGame
);

/* ********** ADMIN ********** */

// Get allowed vendors for a specific agent (admin only)
router.get(
  "/agents/:agentId/vendors",
  authorize("Admin"),
  [
    param("agentId").isInt().withMessage("Agent ID must be an integer"),
    validateRequest,
  ],
  zenithController.getAgentAllowedVendors
);

// Set vendor enable/disable for agent (admin only)
router.patch(
  "/agents/:agentId/vendors/:vendorId/toggle-disabled",
  authorize("Admin"),
  [
    param("agentId").isInt().withMessage("Agent ID must be an integer"),
    param("vendorId").isInt().withMessage("Vendor ID must be an integer"),
    body("disabled").isBoolean().withMessage("disabled must be boolean"),
    validateRequest,
  ],
  zenithController.setAgentVendorDisabled
);

// GAMES

// Get games for a specific agent (admin only)
router.get(
  "/agent/games",
  authorize("Admin"),
  [
    query("vendorId")
      .optional()
      .isInt()
      .withMessage("Vendor ID must be an integer"),
    query("categoryCode")
      .optional()
      .isString()
      .withMessage("Category code must be a string"),
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    query("isDisabled")
      .optional()
      .isBoolean()
      .withMessage("isDisabled must be a boolean"),
    validateRequest,
  ],
  zenithController.getAllAgentGames
);

module.exports = router;
