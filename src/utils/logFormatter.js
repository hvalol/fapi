class LogFormatter {
  static formatLogMessage(action, details, targetType) {
    console.log("\n=== LogFormatter Debug ===");
    console.log("Input:", { action, details, targetType });

    try {
      const [method, path] = action.split("_");
      console.log("Parsed action:", { method, path });

      // Common property getters with consistent naming
      const getName = (obj) => obj?.name || "Unknown";
      const getUsername = (obj) => obj?.username || "Unknown User";
      const getAmount = (obj) => obj?.amount || "0";

      // Authentication actions
      if (path.includes("/auth")) {
        console.log("Auth path detected:", path);
        if (path.includes("/login")) {
          const msg = `User ${getUsername(details)} logged in`;
          console.log("Login message:", msg);
          return msg;
        }
        if (path.includes("/logout")) {
          const msg = `User ${getUsername(details)} logged out`;
          console.log("Logout message:", msg);
          return msg;
        }
        return action;
      }

      // User actions
      if (path.includes("/users")) {
        console.log("Users path detected:", { path, method });
        const username = getUsername(details);
        switch (method) {
          case "POST":
            return `Created new user: ${username}`;
          case "PUT":
            return `Updated user: ${username}`;
          case "DELETE":
            return `Deleted user: ${username}`;
          case "GET":
            return `Accessed user details: ${username}`;
          default:
            return action;
        }
      }

      // Client actions
      if (path.includes("/clients")) {
        console.log("Clients path detected:", { path, method });
        const clientName = getName(details);
        switch (method) {
          case "POST":
            return `Created new client: ${clientName}`;
          case "PUT":
            return `Updated client: ${clientName}`;
          case "DELETE":
            return `Deactivated client: ${clientName}`;
          case "GET":
            return `Accessed client details: ${clientName}`;
          default:
            return action;
        }
      }

      // Agent actions
      if (path.includes("/agents")) {
        console.log("Agents path detected:", { path, method });
        const agentName = getName(details);

        if (path.includes("/commissions")) {
          return `Updated commissions for agent: ${agentName}`;
        }
        if (path.includes("/regenerate-credentials")) {
          return `Regenerated API credentials for agent: ${agentName}`;
        }
        if (path.includes("/deactivate")) {
          return `Deactivated agent: ${agentName}`;
        }

        switch (method) {
          case "POST":
            return `Created new agent: ${agentName}`;
          case "PUT":
            return `Updated agent: ${agentName}`;
          case "GET":
            return `Accessed agent details: ${agentName}`;
          default:
            return action;
        }
      }

      // Zenith vendor actions
      if (path.includes("/zenith/vendors")) {
        console.log("Zenith vendors path detected:", { path, method });
        const vendorName = details?.vendor?.name || getName(details);

        if (path.includes("/toggle-disabled")) {
          return details.disabled
            ? `Disabled vendor: ${vendorName}`
            : `Enabled vendor: ${vendorName}`;
        }

        switch (method) {
          case "POST":
            return `Created new vendor: ${vendorName}`;
          case "PUT":
            return `Updated vendor: ${vendorName}`;
          case "DELETE":
            return `Deleted vendor: ${vendorName}`;
          case "GET":
            return `Accessed vendor details: ${vendorName}`;
          default:
            return action;
        }
      }

      // Zenith game actions
      if (path.includes("/zenith") && !path.includes("/vendors")) {
        console.log("Zenith games path detected:", { path, method });
        const gameName = details?.game?.name || getName(details);

        if (path.includes("/toggle-disabled")) {
          return details.disabled
            ? `Disabled game: ${gameName}`
            : `Enabled game: ${gameName}`;
        }

        switch (method) {
          case "POST":
            return `Created new game: ${gameName}`;
          case "PUT":
            return `Updated game: ${gameName}`;
          case "DELETE":
            return `Deleted game: ${gameName}`;
          case "GET":
            return `Accessed game details: ${gameName}`;
          default:
            return action;
        }
      }

      // Billing actions
      if (path.includes("/client-billing")) {
        console.log("Billing path detected:", { path, method });

        if (path.includes("/charges")) {
          const amount = getAmount(details);
          const type = details?.type || "unknown";
          return `Added ${type} charge of $${amount}`;
        }
        if (path.includes("/payments")) {
          const amount = getAmount(details);
          return `Recorded payment of $${amount}`;
        }
        if (path.includes("/billings")) {
          const period = details?.month || "unknown period";
          return `Created billing record for ${period}`;
        }
        return "Accessed billing information";
      }

      // Dashboard access
      if (path.includes("/dashboard")) {
        console.log("Dashboard path detected:", { path, method });
        const section = path.split("/").pop();
        return `Accessed dashboard ${section} section`;
      }

      // Default fallback
      console.log("No specific path matched, using default fallback");
      const defaultMsg = `${method} ${targetType || path}`;
      console.log("Default fallback message:", defaultMsg);
      return defaultMsg;
    } catch (error) {
      console.error("LogFormatter Error:", error);
      console.error("Input that caused error:", {
        action,
        details,
        targetType,
      });
      return action || "Unknown action";
    }
  }
}

module.exports = LogFormatter;
