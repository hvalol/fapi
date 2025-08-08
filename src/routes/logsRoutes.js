const express = require("express");
const { query, param } = require("express-validator");
const logsController = require("../controllers/logsController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { authenticate } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get admin logs (Admin only)
router.get(
  "/admin",
  [
    authorize("Admin"),
    query("from_date").optional().isISO8601().toDate(),
    query("to_date").optional().isISO8601().toDate(),
    query("action_type")
      .optional()
      .isIn(["AUTHENTICATION", "UPDATE", "ACCESS"])
      .withMessage("Invalid action type"),
    query("admin_id").optional().isInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    validateRequest,
  ],
  logsController.getAdminLogs
);

// Get client logs (Admin or Client Admin)
router.get(
  "/client/:clientId",
  [
    param("clientId").isInt().withMessage("Client ID must be an integer"),
    query("from_date").optional().isISO8601().toDate(),
    query("to_date").optional().isISO8601().toDate(),
    query("action_type")
      .optional()
      .isIn(["AUTHENTICATION", "UPDATE", "ACCESS"])
      .withMessage("Invalid action type"),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
    validateRequest,
  ],
  logsController.getClientLogs
);

// Manual archival triggers (Admin only)
router.post(
  "/admin/archive",
  [
    authenticate,
    authorize("Admin"),
    query("days").optional().isInt({ min: 1 }).toInt(),
    query("batchSize").optional().isInt({ min: 100, max: 5000 }).toInt(),
    validateRequest,
  ],
  logsController.triggerAdminLogsArchival
);

router.post(
  "/client/archive",
  [
    authenticate,
    authorize("Admin"),
    query("days").optional().isInt({ min: 1 }).toInt(),
    query("batchSize").optional().isInt({ min: 100, max: 5000 }).toInt(),
    validateRequest,
  ],
  logsController.triggerClientLogsArchival
);

module.exports = router;
