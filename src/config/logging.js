const environment = process.env.NODE_ENV || "development";

const baseConfig = {
  development: {
    archival: {
      schedule: "0 2 * * *", // 2 AM daily
      retentionDays: {
        admin: 7, // Keep only 7 days in dev
        client: 7,
      },
      batchSize: 500,
      enabled: false, // Disabled by default in dev
      verbose: true, // More logging in dev
    },
  },
  staging: {
    archival: {
      schedule: "0 2 * * *",
      retentionDays: {
        admin: 14, // Keep 14 days in staging
        client: 14,
      },
      batchSize: 1000,
      enabled: true,
      verbose: true,
    },
  },
  production: {
    archival: {
      schedule: process.env.LOG_ARCHIVAL_SCHEDULE || "0 2 * * *",
      retentionDays: {
        admin: parseInt(process.env.ADMIN_LOG_RETENTION_DAYS, 10) || 30,
        client: parseInt(process.env.CLIENT_LOG_RETENTION_DAYS, 10) || 30,
      },
      batchSize: parseInt(process.env.LOG_ARCHIVAL_BATCH_SIZE, 10) || 1000,
      enabled: process.env.LOG_ARCHIVAL_ENABLED !== "false",
      verbose: false, // Minimal logging in production
      alerts: {
        enabled: true,
        errorThreshold: 100, // Alert if more than 100 errors
        slackWebhook: process.env.LOG_ALERT_SLACK_WEBHOOK,
        email: process.env.LOG_ALERT_EMAIL,
      },
    },
  },
};

module.exports = baseConfig[environment];
