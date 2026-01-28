/**
 * Travel Record Routes
 * 
 * This file defines all the URL endpoints (routes) for travel records.
 * Routes map HTTP methods (GET, POST, PUT, DELETE) to controller functions.
 * 
 * Think of routes as the "receptionist" - they receive requests and 
 * direct them to the right handler (controller) after validation.
 */

// Import Express framework
const express = require('express');

// Create a new Router instance
// A Router is like a mini-application that can have its own routes
// We'll mount this router at /api/travels in index.js
const router = express.Router();

// Import the controller that contains the business logic for each endpoint
// Controllers do the actual work - routes just direct traffic to them
const travelController = require('../controllers/travelController');

// Import the asyncHandler utility
// This wraps async functions to automatically catch errors and pass them to Express
// Without this, we'd need try/catch in every async route handler
const { asyncHandler } = require('../middleware/errorHandler');

// Import validation middleware
// These validate request data BEFORE it reaches the controller
// If validation fails, an error is thrown and the controller never runs
const {
  createTravelValidation,  // Validates POST request body
  updateTravelValidation,  // Validates PUT request body and :id param
  idParamValidation,       // Validates just the :id URL parameter
  listTravelsValidation,   // Validates query parameters for filtering
} = require('../middleware/validator');

// ============ STATISTICS ROUTES ============
// IMPORTANT: These must be defined BEFORE the /:id route!
// Otherwise, Express would match "stats" as an :id parameter

/**
 * @route   GET /api/travels/stats/by-country
 * @desc    Get average ratings and visit counts grouped by country
 * @access  Public (no authentication required)
 * 
 * Example response:
 * { data: [{ country: "France", averageRating: 4.5, visitCount: 3 }] }
 */
router.get('/stats/by-country', asyncHandler(travelController.getStatsByCountry));

/**
 * @route   GET /api/travels/stats/top-destinations
 * @desc    Get the highest-rated travel destinations
 * @access  Public
 * @query   limit - Maximum number of results (default: 10)
 * 
 * Example: GET /api/travels/stats/top-destinations?limit=5
 */
router.get('/stats/top-destinations', asyncHandler(travelController.getTopDestinations));

// ============ CRUD ROUTES ============
// CRUD = Create, Read, Update, Delete - the four basic operations

/**
 * @route   POST /api/travels
 * @desc    Create a new travel record
 * @access  Public
 * 
 * The request flows through:
 * 1. createTravelValidation - validates the request body
 * 2. asyncHandler - wraps the controller to catch errors
 * 3. travelController.createTravel - does the actual creation
 * 
 * Example request body:
 * { "title": "Paris Trip", "destination": "Paris", "country": "France", 
 *   "visitDate": "2024-03-15", "rating": 5 }
 */
router.post('/', createTravelValidation, asyncHandler(travelController.createTravel));

/**
 * @route   GET /api/travels
 * @desc    Get all travel records with optional filtering
 * @access  Public
 * 
 * Query parameters (all optional):
 * - country: Filter by country name
 * - category: Filter by category (city, beach, mountain, etc.)
 * - minRating: Minimum rating (1-5)
 * - maxRating: Maximum rating (1-5)
 * - startDate: Filter visits after this date
 * - endDate: Filter visits before this date
 * - search: Search in title and notes
 * 
 * Example: GET /api/travels?country=France&minRating=4
 */
router.get('/', listTravelsValidation, asyncHandler(travelController.getAllTravels));

/**
 * @route   GET /api/travels/:id
 * @desc    Get a single travel record by its unique ID
 * @access  Public
 * 
 * :id is a URL parameter - Express extracts it and puts it in req.params.id
 * The ID must be a valid UUID format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * 
 * Example: GET /api/travels/550e8400-e29b-41d4-a716-446655440000
 */
router.get('/:id', idParamValidation, asyncHandler(travelController.getTravelById));

/**
 * @route   PUT /api/travels/:id
 * @desc    Update an existing travel record (partial updates allowed)
 * @access  Public
 * 
 * PUT is used for updates. You only need to send the fields you want to change.
 * The ID in the URL specifies which record to update.
 * 
 * Example: PUT /api/travels/550e8400-... with body { "rating": 4 }
 */
router.put('/:id', updateTravelValidation, asyncHandler(travelController.updateTravel));

/**
 * @route   DELETE /api/travels/:id
 * @desc    Delete a travel record permanently
 * @access  Public
 * 
 * Example: DELETE /api/travels/550e8400-e29b-41d4-a716-446655440000
 * Returns success message if deleted, 404 if not found
 */
router.delete('/:id', idParamValidation, asyncHandler(travelController.deleteTravel));

// Export the router so it can be mounted in index.js
module.exports = router;
