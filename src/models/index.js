// src/models/index.js
const sequelize = require("../config/database");
const User = require("./User");
const Client = require("./Client");

// Define associations
Client.hasMany(User, { foreignKey: "client_id" });
User.belongsTo(Client, { foreignKey: "client_id" });

// Add additional models and associations here

module.exports = {
  sequelize,
  User,
  Client,
};
