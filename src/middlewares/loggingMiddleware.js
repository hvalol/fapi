const LoggingService = require("../services/loggingService");
const LogFormatter = require("../utils/logFormatter");

const determineActionType = (req) => {
  // Authentication routes
  if (req.path === "/login" || req.path === "/logout") {
    return "AUTHENTICATION";
  }

  // Skip logging routes
  if (req.baseUrl.includes("/logs")) {
    return null;
  }

  // Update operations
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return "UPDATE";
  }

  // Access operations (GET requests)
  if (req.method === "GET") {
    return "ACCESS";
  }

  return "ACCESS"; // Default fallback
};

const getIpAddress = (req) => {
  // Check X-Forwarded-For header first (for proxied requests)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // Get first IP in case of multiple proxies
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    // Find first IPv4 address
    const ipv4 = ips.find((ip) => ip.includes("."));
    if (ipv4) return ipv4;
  }

  // Check real IP header (common in nginx)
  const realIp = req.headers["x-real-ip"];
  if (realIp && realIp.includes(".")) return realIp;

  // Fall back to socket address
  const socketAddress = req.socket.remoteAddress;
  if (socketAddress) {
    // Handle localhost IPv4
    if (socketAddress === "::1" || socketAddress === "::ffff:127.0.0.1") {
      return "127.0.0.1";
    }
    // Convert IPv6 format of IPv4 address
    if (socketAddress.startsWith("::ffff:")) {
      return socketAddress.substring(7);
    }
    // Return if it's already IPv4
    if (socketAddress.includes(".")) {
      return socketAddress;
    }
  }

  return "0.0.0.0"; // fallback
};

const loggingMiddleware = () => async (req, res, next) => {
  const originalSend = res.send;
  const ip_address = getIpAddress(req);

  res.send = function (data) {
    console.log("--- Logging Middleware Debug ---");
    console.log("Request path:", req.path);
    console.log("Request method:", req.method);
    console.log("Request baseUrl:", req.baseUrl);

    let parsedData;
    try {
      parsedData = JSON.parse(data);
      console.log("Parsed response data:", parsedData);
    } catch (e) {
      parsedData = data;
      console.log("Raw response data:", data);
    }

    const user = parsedData?.data?.user || req.user;
    const user_id = user?.id;
    const client_id = user?.client_id;
    const action_type = determineActionType(req);

    console.log("User details:", { user_id, client_id, action_type });

    const fullPath = `${req.method}_${req.baseUrl}${req.path}`;
    console.log("Constructed action path:", fullPath);

    const logData = {
      user_id,
      client_id,
      action: fullPath, // Changed to include baseUrl
      action_type,
      details: {
        method: req.method,
        path: req.path,
        body: req.body,
        statusCode: res.statusCode,
      },
      ip_address,
      // always remember this part
      target_type: req.baseUrl
        .split("/")
        .filter((part) => part && part !== "api" && part !== "v1")
        .shift()
        ?.toLowerCase(),
      target_id: user_id,
    };

    console.log("Log data before formatting:", logData);

    // Format message
    logData.details.formattedMessage = LogFormatter.formatLogMessage(
      logData.action,
      { ...req.body, ...parsedData?.data },
      logData.target_type
    );

    console.log("Formatted message:", logData.details.formattedMessage);

    if (client_id) {
      LoggingService.logClientAction(logData);
    } else if (
      user?.role === "Admin" ||
      parsedData?.data?.user?.role === "Admin"
    ) {
      LoggingService.logAdminAction(logData);
    }

    originalSend.apply(res, arguments);
  };

  next();
};

module.exports = loggingMiddleware;
