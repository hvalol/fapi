// src/middlewares/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Always log error details on the server for debugging
  console.error(err);

  // Never expose stack trace or sensitive info to the client
  let message = "Internal Server Error";
  if (statusCode !== 500 && err.message) {
    message = err.message;
  }

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

module.exports = { errorHandler, AppError };
