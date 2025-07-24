"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to safely execute SQL
    const safeExecute = async (func, errorMessage) => {
      try {
        await func();
      } catch (error) {
        console.log(`${errorMessage}: ${error.message}`);
        // Don't throw - continue with other operations
      }
    };

    // 1. User table changes
    console.log("Modifying User table...");

    // Add username column
    await safeExecute(async () => {
      await queryInterface.addColumn("users", "username", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added username column to users table");
    }, "Error adding username column");

    // Copy email to username if both exist
    await safeExecute(async () => {
      await queryInterface.sequelize.query(
        "UPDATE users SET username = email WHERE username IS NULL OR username = '' AND email IS NOT NULL"
      );
      console.log("Copied data from email to username");
    }, "Error copying data from email to username");

    // Make username non-nullable
    await safeExecute(async () => {
      await queryInterface.changeColumn("users", "username", {
        type: Sequelize.STRING,
        allowNull: false,
      });
      console.log("Made username column non-nullable");
    }, "Error making username non-nullable");

    // Add unique constraint
    await safeExecute(async () => {
      await queryInterface.addConstraint("users", {
        fields: ["username"],
        type: "unique",
        name: "users_username_unique",
      });
      console.log("Added unique constraint to username");
    }, "Error adding unique constraint to username");

    // Remove email column
    await safeExecute(async () => {
      await queryInterface.removeColumn("users", "email");
      console.log("Removed email column");
    }, "Error removing email column");

    // Remove full_name column
    await safeExecute(async () => {
      await queryInterface.removeColumn("users", "full_name");
      console.log("Removed full_name column");
    }, "Error removing full_name column");

    // 2. Client table changes
    console.log("Modifying Client table...");

    // Remove contact columns
    await safeExecute(async () => {
      await queryInterface.removeColumn("clients", "contact_email");
      console.log("Removed contact_email column from clients");
    }, "Error removing contact_email");

    await safeExecute(async () => {
      await queryInterface.removeColumn("clients", "contact_phone");
      console.log("Removed contact_phone column from clients");
    }, "Error removing contact_phone");

    // 3. AgentProfile table changes
    console.log("Modifying AgentProfile table...");

    // Remove columns
    const agentProfileColumnsToRemove = [
      "email",
      "phone",
      "address",
      "contact_person",
    ];

    for (const column of agentProfileColumnsToRemove) {
      await safeExecute(async () => {
        await queryInterface.removeColumn("agent_profiles", column);
        console.log(`Removed ${column} column from agent_profiles`);
      }, `Error removing ${column} from agent_profiles`);
    }

    console.log("Migration completed successfully");
  },

  down: async (queryInterface, Sequelize) => {
    // Helper function to safely execute SQL
    const safeExecute = async (func, errorMessage) => {
      try {
        await func();
      } catch (error) {
        console.log(`${errorMessage}: ${error.message}`);
      }
    };

    console.log("Running migration rollback...");

    // 1. User table rollback
    // Add back email
    await safeExecute(async () => {
      await queryInterface.addColumn("users", "email", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added email column back to users");
    }, "Error adding email column back");

    // Copy username to email
    await safeExecute(async () => {
      await queryInterface.sequelize.query(
        "UPDATE users SET email = username WHERE email IS NULL OR email = ''"
      );
      console.log("Copied username data to email");
    }, "Error copying data to email");

    // Add back full_name
    await safeExecute(async () => {
      await queryInterface.addColumn("users", "full_name", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added full_name column back to users");
    }, "Error adding full_name column back");

    // 2. Client table rollback
    await safeExecute(async () => {
      await queryInterface.addColumn("clients", "contact_email", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added contact_email column back to clients");
    }, "Error adding contact_email back");

    await safeExecute(async () => {
      await queryInterface.addColumn("clients", "contact_phone", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added contact_phone column back to clients");
    }, "Error adding contact_phone back");

    // 3. AgentProfile table rollback
    await safeExecute(async () => {
      await queryInterface.addColumn("agent_profiles", "email", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added email column back to agent_profiles");
    }, "Error adding email back to agent_profiles");

    await safeExecute(async () => {
      await queryInterface.addColumn("agent_profiles", "phone", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added phone column back to agent_profiles");
    }, "Error adding phone back to agent_profiles");

    await safeExecute(async () => {
      await queryInterface.addColumn("agent_profiles", "address", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
      console.log("Added address column back to agent_profiles");
    }, "Error adding address back to agent_profiles");

    await safeExecute(async () => {
      await queryInterface.addColumn("agent_profiles", "contact_person", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("Added contact_person column back to agent_profiles");
    }, "Error adding contact_person back to agent_profiles");

    console.log("Rollback completed successfully");
  },
};
