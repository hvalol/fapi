// src/server.js
require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 5000;

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Sync models with database (only in development)
    if (process.env.NODE_ENV === "development") {
      // For development only - don't use force: true in production
      await sequelize.sync({ alter: true });
      console.log("Database synchronized");
    }
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
};

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
});
