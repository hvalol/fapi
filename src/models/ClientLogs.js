const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class ClientLogs extends Model {}

ClientLogs.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Clients",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action_type: {
      type: DataTypes.ENUM("AUTHENTICATION", "UPDATE", "ACCESS"),
      allowNull: false,
      validate: {
        isIn: {
          args: [["AUTHENTICATION", "UPDATE", "ACCESS"]],
          msg: "Invalid action type",
        },
      },
      comment:
        "AUTHENTICATION: login/logout, UPDATE: create/update/delete, ACCESS: page views",
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidJSON(value) {
          if (value && typeof value === "string") {
            try {
              JSON.parse(value);
            } catch (e) {
              throw new Error("Invalid JSON format for details");
            }
          }
        },
      },
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIP: {
          args: [4],
          msg: "Invalid IP address format",
        },
      },
    },
    target_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "ClientLogs",
    tableName: "client_logs",
    timestamps: false,
    hooks: {
      beforeValidate: (log) => {
        if (log.action_type) {
          log.action_type = log.action_type.toUpperCase();
        }
        if (log.details && typeof log.details === "object") {
          log.details = JSON.stringify(log.details);
        }
      },
    },
  }
);

module.exports = ClientLogs;
