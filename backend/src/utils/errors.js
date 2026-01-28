/**
 * Custom Error Classes
 * 
 * This file defines custom error classes for different types of API errors.
 * Custom errors allow us to:
 * - Include specific HTTP status codes with each error type
 * - Add error codes for programmatic handling by clients
 * - Provide consistent error response formatting
 * - Differentiate between error types in our error handler
 * 
 * All custom errors extend the base ApiError class, which extends Node's Error.
 */

/**
 * Base API Error Class
 * 
 * All custom errors extend this class. It adds:
 * - statusCode: The HTTP status code to return (default: 500)
 * - code: A machine-readable error code (e.g., "NOT_FOUND")
 * - toJSON(): Method to format the error for API responses
 * 
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Create an ApiError
   * 
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Machine-readable error code (default: 'INTERNAL_ERROR')
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    // Call parent Error constructor with the message
    // This sets this.message
    super(message);
    
    // Set the error name to the class name (useful for instanceof checks)
    this.name = this.constructor.name;
    
    // HTTP status code to use in the response
    this.statusCode = statusCode;
    
    // Machine-readable error code for client applications
    // Clients can use this to show localized messages or take specific actions
    this.code = code;
    
    // Capture the stack trace, excluding the constructor call
    // This makes debugging easier by showing where the error was created
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API response
   * 
   * @returns {Object} Formatted error object
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

/**
 * Validation Error - HTTP 400 Bad Request
 * 
 * Used when request data fails validation (invalid fields, missing required data, etc.)
 * Includes an array of field-level error details.
 * 
 * @extends ApiError
 */
class ValidationError extends ApiError {
  /**
   * Create a ValidationError
   * 
   * @param {string} message - Overall error message (default: 'Validation failed')
   * @param {Array} details - Array of field-level errors
   *   Each detail object should have: { field, message, value }
   */
  constructor(message = 'Validation failed', details = []) {
    // Call parent constructor with 400 status and VALIDATION_ERROR code
    super(message, 400, 'VALIDATION_ERROR');
    
    // Store the field-level error details
    this.details = details;
  }

  /**
   * Override toJSON to include validation details
   * 
   * @returns {Object} Formatted error with details array
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        // Include field-level details so clients know exactly what's wrong
        details: this.details,
      },
    };
  }
}

/**
 * Not Found Error - HTTP 404
 * 
 * Used when a requested resource doesn't exist.
 * 
 * @extends ApiError
 */
class NotFoundError extends ApiError {
  /**
   * Create a NotFoundError
   * 
   * @param {string} resource - Name of the resource that wasn't found
   *   Used to create message like "Travel record not found"
   */
  constructor(resource = 'Resource') {
    // Create message from resource name
    super(`${resource} not found`, 404, 'NOT_FOUND');
    
    // Store resource name for potential use
    this.resource = resource;
  }
}

/**
 * Conflict Error - HTTP 409
 * 
 * Used when the request conflicts with current state.
 * Example: Trying to create a resource that already exists.
 * 
 * @extends ApiError
 */
class ConflictError extends ApiError {
  /**
   * Create a ConflictError
   * 
   * @param {string} message - Error message (default: 'Resource already exists')
   */
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Bad Request Error - HTTP 400
 * 
 * Generic bad request error for issues that aren't validation errors.
 * Example: Request is valid JSON but doesn't make logical sense.
 * 
 * @extends ApiError
 */
class BadRequestError extends ApiError {
  /**
   * Create a BadRequestError
   * 
   * @param {string} message - Error message (default: 'Bad request')
   */
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

// Export all error classes
module.exports = {
  ApiError,          // Base class (can be extended for new error types)
  ValidationError,   // 400 - Invalid input data
  NotFoundError,     // 404 - Resource not found
  ConflictError,     // 409 - Resource conflict
  BadRequestError,   // 400 - Bad request (non-validation)
};
