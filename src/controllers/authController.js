// src/controllers/authController.js
const authService = require("../services/authService");
const { AppError } = require("../middlewares/errorHandler");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new AppError("Please provide username and password", 400));
    }

    const result = await authService.login(username, password);

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      status: "success",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    // Log error details for internal debugging
    console.error("Login error:", error);

    // Send only generic error message to client
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("An error occurred during login", 500));
    }
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.userId) {
      await authService.logout(req.userId);
    }

    // Clear refresh token cookie
    res.cookie("refreshToken", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(new AppError("An error occurred during logout", 500));
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      status: "success",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("An error occurred during token refresh", 500));
    }
  }
};

exports.validateToken = async (req, res) => {
  // User is already attached by auth middleware
  res.json({
    status: "success",
    data: {
      user: req.user,
    },
  });
};
