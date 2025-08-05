const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * ZenithVendor Model
 * Represents a game vendor in the Zenith integration
 */
const ZenithVendor = sequelize.define(
  "ZenithVendor",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    categoryCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Comma-separated list of category codes",
    },
    currencyCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Comma-separated list of supported currency codes",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment:
        "Indicates if vendor is permanently supported (false means vendor is no longer supported)",
    },
    is_disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        "Indicates if vendor is temporarily disabled (can be re-enabled)",
    },
  },
  {
    timestamps: true,
    tableName: "zenith_vendors",
    underscored: true,
  }
);

module.exports = ZenithVendor;
