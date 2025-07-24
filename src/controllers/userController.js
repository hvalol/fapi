// src/controllers/userController.js
const userService = require("../services/userService");
const { AppError } = require("../middlewares/errorHandler");

exports.getAllUsers = async (req, res, next) => {
  try {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      client_id: req.query.client_id,
    };

    const users = await userService.getAllUsers(filters);

    res.json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    res.json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const userData = {
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      status: req.body.status,
      client_id: req.body.client_id,
    };

    const user = await userService.createUser(userData);

    res.status(201).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const userData = {
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      status: req.body.status,
      client_id: req.body.client_id,
    };

    const user = await userService.updateUser(req.params.id, userData);

    res.json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);

    res.json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(
        new AppError("Current password and new password are required", 400)
      );
    }

    await userService.changePassword(req.userId, currentPassword, newPassword);

    res.json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};
