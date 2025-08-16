const { hashPassword } = require("../utils/authUtils");
const { sequelize, User } = require("../models");
const seedZenithVendors = require("./zenithVendorSeed");
const seedZenithGames = require("./zenithGameSeed");
const seedTransactions = require("./transactionsSeed");
async function seedAdminUser() {
  const adminUsername = "admin";
  const adminPassword = "admin123"; // Change this in production!
  const adminRole = "Admin";

  // Check if admin user exists
  let admin = await User.findOne({ where: { username: adminUsername } });
  if (!admin) {
    const hashedPassword = hashPassword(adminPassword);

    admin = await User.create({
      username: adminUsername,
      password: hashedPassword,
      role: adminRole,
      status: "active",
    });
    console.log("Admin user created.");
  } else {
    console.log("Admin user already exists.");
  }
}

async function runAllSeeders() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    await seedAdminUser();
    await seedZenithVendors();
    // await seedZenithGames();
    await seedTransactions();

    console.log("All seeds completed.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllSeeders();
}
