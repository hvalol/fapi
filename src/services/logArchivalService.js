const {
  sequelize,
  AdminLogs,
  ClientLogs,
  AdminLogsArchive,
  ClientLogsArchive,
} = require("../models");
const { Op } = require("sequelize");
const { AppError } = require("../middlewares/errorHandler");

class LogArchivalService {
  static async archiveAdminLogs(daysToKeep = 30, batchSize = 1000) {
    const transaction = await sequelize.transaction();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let totalArchived = 0;
      let continuing = true;

      while (continuing) {
        const oldLogs = await AdminLogs.findAll({
          where: {
            created_at: {
              [Op.lt]: cutoffDate,
            },
          },
          limit: batchSize,
          transaction,
        });

        if (oldLogs.length === 0) {
          continuing = false;
          continue;
        }

        // Create archive records using the model
        await AdminLogsArchive.bulkCreate(
          oldLogs.map((log) => ({
            ...log.toJSON(),
            archived_at: new Date(),
          })),
          { transaction }
        );

        // Delete archived logs
        await AdminLogs.destroy({
          where: {
            id: oldLogs.map((log) => log.id),
          },
          transaction,
        });

        totalArchived += oldLogs.length;
      }

      await transaction.commit();
      return { archived: totalArchived };
    } catch (error) {
      await transaction.rollback();
      throw new AppError(`Error archiving admin logs: ${error.message}`, 500);
    }
  }

  static async archiveClientLogs(daysToKeep = 30, batchSize = 1000) {
    const transaction = await sequelize.transaction();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let totalArchived = 0;
      let continuing = true;

      while (continuing) {
        const oldLogs = await ClientLogs.findAll({
          where: {
            created_at: {
              [Op.lt]: cutoffDate,
            },
          },
          limit: batchSize,
          transaction,
        });

        if (oldLogs.length === 0) {
          continuing = false;
          continue;
        }

        // Create archive records using the model
        await ClientLogsArchive.bulkCreate(
          oldLogs.map((log) => ({
            ...log.toJSON(),
            archived_at: new Date(),
          })),
          { transaction }
        );

        // Delete archived logs
        await ClientLogs.destroy({
          where: {
            id: oldLogs.map((log) => log.id),
          },
          transaction,
        });

        totalArchived += oldLogs.length;
      }

      await transaction.commit();
      return { archived: totalArchived };
    } catch (error) {
      await transaction.rollback();
      throw new AppError(`Error archiving client logs: ${error.message}`, 500);
    }
  }
}

module.exports = LogArchivalService;
