const fs = require("fs").promises;
const path = require("path");
const sequelize = require("./database");

class MigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, "../migrations");
    this.migrationTableName = "migration_meta";
  }

  async init() {
    // Create migrations table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationTableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    try {
      // Use direct query with no processing
      const result = await sequelize.query(
        `SELECT migration_name FROM ${this.migrationTableName} ORDER BY id ASC`
      );

      // Handle different return formats based on dialect
      let rows;
      if (Array.isArray(result) && result.length > 0) {
        rows = result[0]; // For most dialects including MySQL/MariaDB
      } else if (result && result.rows) {
        rows = result.rows; // For PostgreSQL
      } else {
        rows = []; // Fallback
      }

      // Convert to simple array of names
      return rows.map((row) => row.migration_name || row.MIGRATION_NAME);
    } catch (error) {
      console.error("Error getting executed migrations:", error);
      return []; // Return empty array on error
    }
  }

  async markMigrationAsExecuted(migrationName) {
    await sequelize.query(
      `INSERT INTO ${this.migrationTableName} (migration_name) VALUES (?)`,
      {
        replacements: [migrationName],
      }
    );
  }

  async removeMigrationRecord(migrationName) {
    await sequelize.query(
      `DELETE FROM ${this.migrationTableName} WHERE migration_name = ?`,
      {
        replacements: [migrationName],
      }
    );
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter((file) => file.endsWith(".js") && !file.startsWith("index"))
        .sort(); // Sort to ensure migrations run in order
    } catch (error) {
      console.error("Error reading migration files:", error);
      return [];
    }
  }

  async runMigrations() {
    try {
      // Initialize
      await this.init();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      console.log("Executed migrations:", executedMigrations);

      // Get available migration files
      const migrationFiles = await this.getMigrationFiles();
      console.log("Available migration files:", migrationFiles);

      // Filter migrations that haven't been executed yet
      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file)
      );

      console.log(
        `Found ${pendingMigrations.length} pending migrations to run...`
      );

      // Run each pending migration
      for (const migrationFile of pendingMigrations) {
        console.log(`Running migration: ${migrationFile}`);

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
          // Import migration file
          const migration = require(path.join(
            this.migrationsDir,
            migrationFile
          ));

          // Run up method
          await migration.up(
            sequelize.getQueryInterface(),
            sequelize.Sequelize
          );

          // Mark as executed
          await this.markMigrationAsExecuted(migrationFile);

          // Commit transaction
          await transaction.commit();

          console.log(`Migration ${migrationFile} completed successfully.`);
        } catch (error) {
          // Roll back transaction on error
          await transaction.rollback();
          console.error(`Migration ${migrationFile} failed:`, error.message);
          throw error; // Rethrow to stop migration process
        }
      }

      console.log("All migrations completed successfully.");
    } catch (error) {
      console.error("Migration process failed:", error.message);
      throw error;
    }
  }

  async rollbackMigration(specificMigration = null) {
    try {
      await this.init();
      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        console.log("No migrations to roll back.");
        return;
      }

      // If specific migration is provided, roll back just that one
      // Otherwise, roll back the most recent migration
      const migrationToRollback =
        specificMigration || executedMigrations[executedMigrations.length - 1];

      if (!migrationToRollback) {
        console.log("No migration found to roll back.");
        return;
      }

      try {
        console.log(`Rolling back migration: ${migrationToRollback}`);
        const migrationPath = path.join(
          this.migrationsDir,
          migrationToRollback
        );
        const migration = require(migrationPath);

        await sequelize.transaction(async (transaction) => {
          await migration.down(sequelize.getQueryInterface(), sequelize, {
            transaction,
          });
          await this.removeMigrationRecord(migrationToRollback);
        });

        console.log(`Rolled back migration: ${migrationToRollback}`);
      } catch (error) {
        console.error(
          `Error rolling back migration ${migrationToRollback}:`,
          error
        );
        throw error;
      }
    } catch (error) {
      console.error("Rollback error:", error);
      throw error;
    }
  }
}

module.exports = new MigrationManager();
