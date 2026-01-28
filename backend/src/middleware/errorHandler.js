/**
 * Error Handling Middleware
 * This file provides centralized error handling for the entire application.
 * Instead of handling errors in each route, all errors flow here for
 * consistent formatting and logging.
 */

// Import our custom ApiError base class
const { ApiError } = require('../utils/errors');

/**
 * Global Error Handler Middleware
 * 
 * Express recognizes this as an error handler because it has 4 parameters.
 * When any middleware or route calls next(error) or throws an error,
 * Express skips to this handler.
 * 
 * @param {Error} err - The error that was thrown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (required for error handlers even if unused)
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  // In production, you'd use a proper logging service like Winston or Pino
  console.error('Error:', err.message);
  
  // In development, also log the stack trace for debugging
  // Stack trace shows where the error originated
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // ============ Handle Known API Errors ============
  // If this is one of our custom error types (ValidationError, NotFoundError, etc.)
  // we can use its built-in toJSON method for formatting
  if (err instanceof ApiError) {
    // ApiError has statusCode and toJSON() method
    return res.status(err.statusCode).json(err.toJSON());
  }

  // ============ Handle JSON Parsing Errors ============
  // When a client sends invalid JSON, Express throws a SyntaxError
  // We catch it here to return a friendly error message
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    });
  }

  // ============ Handle Unexpected Errors ============
  // For any other error types (database errors, network errors, bugs, etc.)
  
  // Use the error's status code if it has one, otherwise default to 500
  const statusCode = err.statusCode || 500;
  
  // In production, hide internal error details from users
  // Exposing internal errors can be a security risk
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'  // Generic message for production
      : err.message;                    // Actual message for development

  // Send the error response
  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};

/**
 * 404 Handler for Undefined Routes
 * 
 * This middleware handles requests to routes that don't exist.
 * It should be mounted AFTER all valid routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  // Return a helpful 404 error with the attempted route
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      // Include the method and path so the client knows what failed
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Async Handler Wrapper
 * 
 * This utility wraps async route handlers to catch any errors they throw.
 * Without this, async errors would be unhandled and crash the server.
 * 
 * How it works:
 * 1. Takes an async function as input
 * 2. Returns a new function that wraps the original
 * 3. The wrapper catches any rejected promises and passes them to next()
 * 4. Express's error handler then receives the error
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation(); // If this throws, it's caught!
 *   res.json(data);
 * }));
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function that catches errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  // Promise.resolve() handles both sync and async functions
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Export all middleware functions
module.exports = {
  errorHandler,      // Global error handler (mount last)
  notFoundHandler,   // 404 handler for undefined routes
  asyncHandler,      // Wrapper for async route handlers
};
