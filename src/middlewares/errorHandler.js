// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log error for debugging in development
  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
