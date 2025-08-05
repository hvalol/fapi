const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * ZenithGame Model
 * Represents a game in the Zenith integration
 */
const ZenithGame = sequelize.define(
  "ZenithGame",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    gameCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "game_code",
    },
    gameName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "game_name",
    },
    categoryCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "category_code",
      comment: "Single category code for the game",
    },
    imageSquare: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "image_square",
      comment: "URL to square thumbnail image",
    },
    imageLandscape: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "image_landscape",
      comment: "URL to landscape thumbnail image",
    },
    languageCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "language_code",
      comment: "Comma-separated list of supported language codes",
    },
    platformCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "platform_code",
      comment: "Comma-separated list of supported platform codes",
    },
    currencyCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "currency_code",
      comment: "Comma-separated list of supported currency codes",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Indicates if game is available in the system",
    },
    is_disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Indicates if game is temporarily disabled",
    },
    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "vendor_id",
      comment: "Foreign key to ZenithVendor",
    },
  },
  {
    timestamps: true,
    tableName: "zenith_games",
    underscored: true,
  }
);

module.exports = ZenithGame;
