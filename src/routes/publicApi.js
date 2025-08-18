const express = require("express");
const router = express.Router();
const publicApiController = require("../controllers/publicApiController");
// POST /api/public/game/launch - Get branded game launch URL
router.post("/game/launch", publicApiController.launchGame);

// GET /api/public/games - List all available games
router.get("/games", publicApiController.listGames);

// GET /api/public/vendors - List all vendors/providers
router.get("/vendors", publicApiController.listVendors);

module.exports = router;
