/**
 * Input Validation Middleware
 * 
 * This file defines validation rules for API requests using express-validator.
 * Validation happens BEFORE the request reaches the controller, ensuring
 * that controllers only receive valid, sanitized data.
 * 
 * Benefits of validation middleware:
 * - Keeps controllers clean (no validation code in business logic)
 * - Consistent error responses across all endpoints
 * - Prevents bad data from entering the system
 * - Protects against injection attacks
 * 
 * express-validator documentation: https://express-validator.github.io/
 */

// Import validation functions from express-validator
const { 
  body,               // Validates fields in request body (POST, PUT)
  param,              // Validates URL parameters (like :id)
  query,              // Validates query string parameters (?key=value)
  validationResult    // Collects validation errors
} = require('express-validator');

// Import our custom ValidationError class
const { ValidationError } = require('../utils/errors');

// ============ VALID CATEGORIES ============
// Define the allowed categories for travel records
// This array is used for validation and can be exported for use elsewhere
const VALID_CATEGORIES = [
  'city',        // Urban destinations
  'beach',       // Coastal/ocean destinations
  'mountain',    // Mountain/hiking destinations
  'nature',      // Parks, forests, nature reserves
  'historical',  // Historical sites, museums
  'adventure',   // Adventure activities (diving, climbing, etc.)
  'cultural',    // Cultural experiences, festivals
  'food',        // Food/culinary focused trips
  'other'        // Default catch-all category
];

/**
 * Middleware to check validation results
 * 
 * This middleware runs AFTER all validation rules.
 * It checks if any validation errors occurred and throws a ValidationError if so.
 * The error is then caught by our global error handler.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validate = (req, res, next) => {
  // Collect all validation errors from the request
  const errors = validationResult(req);
  
  // If there are validation errors, throw our custom ValidationError
  if (!errors.isEmpty()) {
    // Transform errors into a cleaner format
    // Original format: { type, value, msg, path, location }
    // Our format: { field, message, value }
    const details = errors.array().map((err) => ({
      field: err.path,      // The field that failed validation
      message: err.msg,     // The error message
      value: err.value,     // The invalid value (for debugging)
    }));
    
    // Throw validation error - this will be caught by errorHandler middleware
    throw new ValidationError('Invalid input', details);
  }
  
  // No errors - continue to the next middleware/controller
  next();
};

/**
 * Validation rules for creating a travel record (POST /api/travels)
 * 
 * This is an array of middleware functions that run in order.
 * Each body() call returns a validation chain that can be customized.
 * The final 'validate' middleware checks all the results.
 */
const createTravelValidation = [
  // TITLE - Required, trimmed, max 200 chars
  body('title')
    .trim()                                              // Remove leading/trailing whitespace
    .notEmpty()                                          // Must not be empty after trimming
    .withMessage('Title is required')                    // Custom error message
    .isLength({ max: 200 })                              // Maximum length check
    .withMessage('Title must be at most 200 characters'),

  // DESTINATION - Required, trimmed, max 200 chars
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination is required')
    .isLength({ max: 200 })
    .withMessage('Destination must be at most 200 characters'),

  // COUNTRY - Required, trimmed, max 100 chars
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .withMessage('Country must be at most 100 characters'),

  // VISIT DATE - Required, must be valid ISO 8601 date
  body('visitDate')
    .notEmpty()
    .withMessage('Visit date is required')
    // Check if it's a valid date in ISO format
    // strict: true requires exact ISO format
    // strictSeparator: true requires 'T' between date and time
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Visit date must be a valid date (YYYY-MM-DD)')
    // Custom validation to ensure date-only format
    .custom((value) => {
      // Extract just the date part (before 'T' if present)
      const dateOnly = value.split('T')[0];
      // Check it's exactly 10 characters (YYYY-MM-DD)
      return dateOnly.length === 10;
    })
    .withMessage('Visit date must be in YYYY-MM-DD format'),

  // RATING - Required, must be integer 1-5
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    // isInt checks for integer with min/max constraints
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  // CATEGORY - Optional, must be one of valid categories
  body('category')
    .optional()                                          // Field is not required
    .trim()
    .toLowerCase()                                       // Normalize to lowercase
    .isIn(VALID_CATEGORIES)                              // Must be in allowed list
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  // LATITUDE - Optional, must be valid coordinate
  body('latitude')
    .optional()
    // isFloat checks for decimal number with min/max
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  // LONGITUDE - Optional, must be valid coordinate
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  // NOTES - Optional, max 5000 chars
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notes must be at most 5000 characters'),

  // Run validation check as the last step
  validate,
];

/**
 * Validation rules for updating a travel record (PUT /api/travels/:id)
 * 
 * Similar to create, but all fields are optional (partial updates allowed).
 * Also validates the :id URL parameter.
 */
const updateTravelValidation = [
  // ID - Must be a valid UUID format
  param('id')
    .isUUID()
    .withMessage('Invalid travel record ID'),

  // All body fields are optional for updates
  // notEmpty() is used with optional() to prevent empty strings
  
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title must be at most 200 characters'),

  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Destination must be at most 200 characters'),

  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Country must be at most 100 characters'),

  body('visitDate')
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Visit date must be a valid date (YYYY-MM-DD)'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('category')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notes must be at most 5000 characters'),

  // Run validation check
  validate,
];

/**
 * Validation for ID parameter only
 * Used for GET /:id and DELETE /:id endpoints
 */
const idParamValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid travel record ID'),
  validate,
];

/**
 * Validation for query parameters when listing travels
 * All parameters are optional filters
 */
const listTravelsValidation = [
  // Country filter - just check length
  query('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country filter must be at most 100 characters'),

  // Category filter - must be valid category
  query('category')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  // Rating filters - must be valid rating values
  query('minRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Minimum rating must be between 1 and 5'),

  query('maxRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Maximum rating must be between 1 and 5'),

  // Date filters - must be valid dates
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),

  // Search filter - just check length
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query must be at most 200 characters'),

  // Run validation check
  validate,
];

// Export validation arrays and constants
module.exports = {
  createTravelValidation,   // For POST /api/travels
  updateTravelValidation,   // For PUT /api/travels/:id
  idParamValidation,        // For GET/DELETE /api/travels/:id
  listTravelsValidation,    // For GET /api/travels
  VALID_CATEGORIES,         // Export for use in other files
};
