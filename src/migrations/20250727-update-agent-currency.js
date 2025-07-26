// src/migrations/20250727-update-agent-currency.js

const { Sequelize } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const safeExecute = async (callback, errorMessage) => {
      try {
        await callback();
      } catch (error) {
        console.error(`${errorMessage}: ${error.message}`);
      }
    };

    console.log("Starting currency field update migration...");

    // First, add the new currencies column
    await safeExecute(async () => {
      await queryInterface.addColumn("agents", "currencies", {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify(["USD"]),
      });
      console.log("Added currencies column to agents table");
    }, "Error adding currencies column");

    // Next, add the default_currency column
    await safeExecute(async () => {
      await queryInterface.addColumn("agents", "default_currency", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "USD",
      });
      console.log("Added default_currency column to agents table");
    }, "Error adding default_currency column");

    // Update the new columns based on the existing currency column
    await safeExecute(async () => {
      await queryInterface.sequelize.query(`
        UPDATE agents 
        SET currencies = JSON_ARRAY(currency), 
            default_currency = currency
      `);
      console.log(
        "Updated currencies and default_currency columns with existing currency values"
      );
    }, "Error updating with existing currency values");

    console.log("Migration completed successfully!");
  },

  down: async (queryInterface, Sequelize) => {
    const safeExecute = async (callback, errorMessage) => {
      try {
        await callback();
      } catch (error) {
        console.error(`${errorMessage}: ${error.message}`);
      }
    };

    console.log("Starting currency field rollback...");

    // Update the currency column from default_currency (if needed)
    await safeExecute(async () => {
      await queryInterface.sequelize.query(`
        UPDATE agents 
        SET currency = default_currency
        WHERE currency != default_currency
      `);
      console.log("Restored currency column from default_currency");
    }, "Error restoring currency column");

    // Remove the new columns
    await safeExecute(async () => {
      await queryInterface.removeColumn("agents", "currencies");
      console.log("Removed currencies column from agents table");
    }, "Error removing currencies column");

    await safeExecute(async () => {
      await queryInterface.removeColumn("agents", "default_currency");
      console.log("Removed default_currency column from agents table");
    }, "Error removing default_currency column");

    console.log("Rollback completed successfully!");
  },
};
