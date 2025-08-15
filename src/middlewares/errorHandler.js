// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Always log error details on the server for debugging
  console.error(err);

  // Never expose stack trace or sensitive info to the client
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message:
      statusCode === 500
        ? "Internal Server Error"
        : err.message || "An error occurred",
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
