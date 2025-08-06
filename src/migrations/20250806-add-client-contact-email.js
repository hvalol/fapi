"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Use raw query instead of Sequelize methods
      await queryInterface.sequelize.query(
        "ALTER TABLE clients ADD COLUMN contact_email VARCHAR(255);"
      );
      console.log("Added contact_email column to clients table");
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding contact_email:", error.message);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE clients DROP COLUMN contact_email;"
      );
      console.log("Removed contact_email column from clients table");
      return Promise.resolve();
    } catch (error) {
      console.error("Error removing contact_email:", error.message);
      return Promise.reject(error);
    }
  },
};
