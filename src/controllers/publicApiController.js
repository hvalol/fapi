const crypto = require("crypto");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const authenticateAgent = require("../utils/authenticateAgent");
// POST /api/v1/public/game/launch - Get branded game launch URL
exports.launchGame = async (req, res, next) => {
  try {
    // Authenticate agent
    const agentSettings = await authenticateAgent(req);
    if (!agentSettings)
      return res
        .status(401)
        .json({ success: false, message: "Invalid API credentials" });

    // Only require these fields from client
    const { username, gameCode, currency, lobbyUrl, ipAddress } = req.body;
    const requiredFields = [
      "username",
      "gameCode",
      "currency",
      "lobbyUrl",
      "ipAddress",
    ];
    const missing = requiredFields.filter((f) => !req.body[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Generate traceId internally
    const traceId = uuidv4();
    // Set defaults for Zenith
    const data = {
      username,
      traceId,
      gameCode,
      language: "en",
      platform: "web",
      currency,
      lobbyUrl,
      ipAddress,
    };

    const apiSecret = process.env.apiSecret || process.env.API_SECRET;
    const apiKey = process.env.apiKey || process.env.API_KEY;
    const jsonBody = JSON.stringify(data);
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(jsonBody)
      .digest("hex");
    const response = await axios.post(
      "https://stg.gasea168.com/game/url",
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
    // Debug log for upstream response
    console.debug(
      "[Zenith Game Launch] Upstream response:",
      JSON.stringify(response.data, null, 2)
    );
    const zenithUrl = response.data?.data?.gameUrl;
    if (!zenithUrl) {
      return res
        .status(500)
        .json({ success: false, message: "No gameUrl returned from upstream" });
    }
    const brandedUrl = `${
      //process.env.BRANDED_LAUNCH_URL ||
      "localhost:3000/launch.html"
    }?url=${encodeURIComponent(zenithUrl)}`;
    res.json({ success: true, url: brandedUrl });
  } catch (error) {
    next(error);
  }
};

// List all available games for agent
exports.listGames = async (req, res, next) => {
  try {
    const agentSettings = await authenticateAgent(req);
    if (!agentSettings)
      return res
        .status(401)
        .json({ success: false, message: "Invalid API credentials" });
    const agentId = agentSettings.agent_id;

    // Get allowed providers (vendor codes)
    const allowedProviders = agentSettings.allowed_providers || [];

    // Get disabled games for this agent
    const disabledGameSettings = await AgentGameSetting.findAll({
      where: { agent_id: agentId, is_disabled: true },
    });
    const disabledGameIds = disabledGameSettings.map((s) => s.game_id);

    // Get all vendors and build a map of vendor_id to vendor_code
    const vendors = await ZenithVendor.findAll();
    const vendorIdToCode = {};
    vendors.forEach((v) => {
      vendorIdToCode[v.id] = v.code;
    });

    // Get all games, filter by allowed provider codes and not disabled
    const games = await ZenithGame.findAll({ where: {} });
    const filteredGames = games.filter(
      (game) =>
        allowedProviders.includes(vendorIdToCode[game.vendor_id]) &&
        !disabledGameIds.includes(game.id)
    );
    res.json({ success: true, games: filteredGames });
  } catch (error) {
    next(error);
  }
};

// List all vendors/providers for agent
exports.listVendors = async (req, res, next) => {
  try {
    const agentSettings = await authenticateAgent(req);
    if (!agentSettings)
      return res
        .status(401)
        .json({ success: false, message: "Invalid API credentials" });
    const agentId = agentSettings.agent_id;

    // Get allowed providers (vendor codes)
    const allowedProviders = agentSettings.allowed_providers || [];

    // Get disabled vendors for this agent
    const disabledVendorSettings = await AgentVendorSetting.findAll({
      where: { agent_id: agentId, is_disabled: true },
    });
    const disabledVendorIds = disabledVendorSettings.map((s) => s.vendor_id);

    // Get all vendors, filter by allowed and not disabled
    const vendors = await ZenithVendor.findAll({ where: {} });
    const filteredVendors = vendors.filter(
      (vendor) =>
        allowedProviders.includes(vendor.code) &&
        !disabledVendorIds.includes(vendor.id)
    );
    res.json({ success: true, vendors: filteredVendors });
  } catch (error) {
    next(error);
  }
};
