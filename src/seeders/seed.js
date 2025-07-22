// src/seeders/seed.js
const { User, Client } = require("../models");
const { hashPassword } = require("../utils/authUtils");

const seedDatabase = async () => {
  try {
    // Create default client
    const client = await Client.create({
      name: "Demo Casino",
      status: "active",
      contact_email: "contact@democasino.com",
    });

    // Create admin user
    await User.create({
      email: "admin@casinoaggregator.com",
      password: hashPassword("Admin123!"),
      full_name: "System Administrator",
      role: "Admin",
      status: "active",
    });

    // Create client admin user
    await User.create({
      email: "client@democasino.com",
      password: hashPassword("Client123!"),
      full_name: "Demo Client Admin",
      role: "ClientAdmin",
      status: "active",
      client_id: client.id,
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
  }
};

// Run seeder if called directly
if (require.main === module) {
  const { sequelize } = require("../models");

  sequelize
    .sync({ force: true })
    .then(() => {
      console.log("Database synced");
      return seedDatabase();
    })
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
