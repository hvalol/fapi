// src/controllers/authController.js
const { User } = require("../models");
const { generateToken, verifyPassword } = require("../utils/authUtils");
const { AppError } = require("../middlewares/errorHandler");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Verify password
    const passwordIsValid = verifyPassword(password, user.password);

    if (!passwordIsValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Check if user is active
    if (user.status !== "active") {
      return next(new AppError("Your account is not active", 403));
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Return user data and token
    res.json({
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.validateToken = async (req, res) => {
  // User data is already attached to req by auth middleware
  res.json({
    status: "success",
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};
