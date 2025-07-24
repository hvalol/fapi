const migrationManager = require("../config/migration-manager");

async function run() {
  try {
    console.log("Starting migration process...");

    if (process.argv.includes("--rollback")) {
      console.log("Running rollback...");
      await migrationManager.rollbackMigration();
    } else {
      console.log("Running migrations...");
      await migrationManager.runMigrations();
    }

    console.log("Migration process completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Catch unhandled errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

run();
