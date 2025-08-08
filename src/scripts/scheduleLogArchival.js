const cron = require("node-cron");
const LogArchivalService = require("../services/logArchivalService");
const loggingConfig = require("../config/logging");
const environment = process.env.NODE_ENV || "development";

class LogArchivalScheduler {
  static async handleArchival() {
    const startTime = Date.now();

    try {
      const results = await Promise.all([
        LogArchivalService.archiveAdminLogs(
          loggingConfig.archival.retentionDays.admin,
          loggingConfig.archival.batchSize
        ),
        LogArchivalService.archiveClientLogs(
          loggingConfig.archival.retentionDays.client,
          loggingConfig.archival.batchSize
        ),
      ]);

      const duration = Date.now() - startTime;

      if (loggingConfig.archival.verbose) {
        console.log({
          environment,
          duration,
          adminLogsArchived: results[0].archived,
          clientLogsArchived: results[1].archived,
        });
      }

      // Production monitoring
      if (
        environment === "production" &&
        loggingConfig.archival.alerts.enabled
      ) {
        await this.checkThresholds(results);
      }
    } catch (error) {
      console.error(`[${environment.toUpperCase()}] Archival Error:`, error);
      if (environment === "production") {
        await this.sendAlert(error);
      }
    }
  }

  static async checkThresholds(results) {
    // Implement threshold checking and alerting
  }

  static async sendAlert(error) {
    // Implement alert sending
  }

  static initialize() {
    if (loggingConfig.archival.enabled) {
      cron.schedule(loggingConfig.archival.schedule, () =>
        this.handleArchival()
      );
      console.log(
        `[${environment.toUpperCase()}] Log archival scheduler initialized`
      );
    }
  }
}

module.exports = LogArchivalScheduler;
