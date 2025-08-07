"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Log current state for verification
      const platformClientExists = await queryInterface.sequelize.query(
        `SELECT id FROM clients WHERE id = 1`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (platformClientExists.length === 0) {
        console.log("No platform client (ID: 1) found - skipping migration");
        await transaction.commit();
        return;
      }

      // Remove in correct order to respect foreign key constraints
      await queryInterface.sequelize.query(
        `DELETE FROM agent_settings WHERE agent_id IN (SELECT id FROM agents WHERE client_id = 1)`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM agent_profiles WHERE agent_id IN (SELECT id FROM agents WHERE client_id = 1)`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM agents WHERE client_id = 1`,
        { transaction }
      );

      await queryInterface.sequelize.query(`DELETE FROM clients WHERE id = 1`, {
        transaction,
      });

      await transaction.commit();
      console.log("Successfully removed platform client references");
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Migration failed: ${error.message}`);
    }
  },

  down: async () => {
    console.log("This migration cannot be reverted as it removes data");
  },
};
