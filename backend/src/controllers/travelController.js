/**
 * Travel Record Controller
 * Controllers contain the "business logic" - the actual code that processes requests.
*/

// Import UUID generator
const { v4: uuidv4 } = require('uuid');

// Import our in-memory data store
// This is where all travel records are stored (in a JavaScript Map)
const store = require('../store/memoryStore');

// Import the weather service for fetching weather data
const weatherService = require('../services/weatherService');

// Import custom error class for 404 Not Found errors
const { NotFoundError } = require('../utils/errors');

/**
 * Create a new travel record
 * 
 * @route POST /api/travels
 * @param {Object} req - Express request object containing the travel data in req.body
 * @param {Object} res - Express response object used to send the response
*/

async function createTravel(req, res) {
  // Destructure fields from the request body
  const {
    title,                    //Name of the trip
    destination,              //Place visited
    country,                  //Country name
    latitude,                 //GPS latitude
    longitude,                //GPS longitude
    visitDate,                //Date of visit
    rating,                   //Rating 1-5
    category = 'other',       //Type of destination
    notes = '',               //User's notes
  } = req.body;

  // Get current timestamp
  const now = new Date().toISOString();

  // Initialize weather as null
  let weather = null;
  
  // If the user provided coordinates, fetch weather data from the API
  if (latitude !== undefined && longitude !== undefined) {
    // await pauses execution until the weather API responds
    // This is an async operation that may take a few seconds
    weather = await weatherService.getWeatherForTravel(latitude, longitude, visitDate);
  }

  // Create the travel record object with all fields
  const travel = {
    id: uuidv4(),                        //A unique ID for this record
    title,                               
    destination,
    country,
    latitude: latitude || null,          // Store null if not provided (|| null handles undefined)
    longitude: longitude || null,
    visitDate,
    rating: parseInt(rating, 10),        // Convert to integer (parseInt with base 10)
    category: category.toLowerCase(),    // Normalize category to lowercase
    notes,
    weather,                             // Weather data (or null if not fetched)
    createdAt: now,                      // Timestamp when record was created
    updatedAt: now,                      // Same as createdAt for new records
  };

  // Save the travel record to our in-memory store
  const created = store.create(travel);

  // Send HTTP 201 (Created) response with the new travel record
  res.status(201).json({
    success: true,    // Indicates the operation succeeded
    data: created,    // The created travel record with its generated ID
  });
}

/**
 * Get all travel records with optional filtering
 * @route GET /api/travels
 * @param {Object} req - Request with optional query parameters for filtering
 * @param {Object} res - Response object
 */

function getAllTravels(req, res) {
  // Extract filter parameters from the query string
  const {
    country,      // Country name
    category,     // Category
    minRating,    // Minimum rating threshold
    maxRating,    // Maximum rating threshold
    startDate,    // Filter visits on or after this date
    endDate,      // Filter visits on or before this date
    search,       // Search text in title and notes
  } = req.query;

  // Build a filters object with only the parameters that were provided
  // We check each one because query params are strings or undefined
  const filters = {};

  // Only add filters that were actually provided in the request
  if (country) filters.country = country;
  if (category) filters.category = category;
  if (minRating) filters.minRating = parseInt(minRating, 10);  // Convert string to number
  if (maxRating) filters.maxRating = parseInt(maxRating, 10);
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (search) filters.search = search;

  // Query the store with our filters
  const travels = store.findAll(filters);

  // Send HTTP 200 (OK) response with the results
  res.json({
    success: true,
    count: travels.length,  // Count
    data: travels,          // Array of travel records
  });
}

/**
 * Get a single travel record by ID
 * @route GET /api/travels/:id
 * @param {Object} req - Request with id in req.params
 * @param {Object} res - Response object
 */

function getTravelById(req, res) {
  // Extract the ID from URL parameters
  const { id } = req.params;
  
  // Look up the record in our store
  const travel = store.findById(id);

  // If no record found, throw a 404 error
  if (!travel) {
    throw new NotFoundError('Travel record');
  }

  // Send the found travel record
  res.json({
    success: true,
    data: travel,
  });
}

/**
 * Update an existing travel record
 * 
 * @route PUT /api/travels/:id
 * @param {Object} req - Request with id in params and update data in body
 * @param {Object} res - Response object
 */
async function updateTravel(req, res) {
  // Get the ID of the record to update
  const { id } = req.params;
  
  // First, check if the record exists
  const existing = store.findById(id);

  if (!existing) {
    throw new NotFoundError('Travel record');
  }

  // Build an updates object with only the fields that were sent
  // This allows partial updates (you don't need to send all fields)
  const updates = {};
  
  // List of fields that are allowed to be updated
  // We explicitly list them for security - prevents updating internal fields like 'id' or 'createdAt'
  const allowedFields = [
    'title',
    'destination',
    'country',
    'latitude',
    'longitude',
    'visitDate',
    'rating',
    'category',
    'notes',
  ];

  // Loop through allowed fields and add any that were provided in the request
  for (const field of allowedFields) {
    // Check if the field exists in the request body (could be any value including 0 or '')
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Special handling for rating - ensure it's an integer
  if (updates.rating !== undefined) {
    updates.rating = parseInt(updates.rating, 10);
  }

  // Special handling for category - normalize to lowercase
  if (updates.category) {
    updates.category = updates.category.toLowerCase();
  }

  // Determine the final coordinates and date (updated or existing values)
  const newLat = updates.latitude !== undefined ? updates.latitude : existing.latitude;
  const newLon = updates.longitude !== undefined ? updates.longitude : existing.longitude;
  const newDate = updates.visitDate || existing.visitDate;

  // Check if any location-related fields changed
  const coordsChanged =
    updates.latitude !== undefined ||
    updates.longitude !== undefined ||
    updates.visitDate !== undefined;

  // If coordinates changed and we have valid coordinates, refetch weather
  if (coordsChanged && newLat && newLon) {
    updates.weather = await weatherService.getWeatherForTravel(newLat, newLon, newDate);
  }

  // Apply the updates to the record in the store
  const updated = store.update(id, updates);

  // Return the updated record
  res.json({
    success: true,
    data: updated,
  });
}

/**
 * Delete a travel record
 * @route DELETE /api/travels/:id
 * @param {Object} req - Request with id in params
 * @param {Object} res - Response object
 */

function deleteTravel(req, res) {
  const { id } = req.params;
  
  // Check if the record exists before trying to delete
  const existing = store.findById(id);

  if (!existing) {
    throw new NotFoundError('Travel record');
  }

  // Delete the record from the store
  store.delete(id);

  // Return success message
  res.json({
    success: true,
    message: 'Travel record deleted successfully',
  });
}

/**
 * Get stats grouped by country
 * @route GET /api/travels/stats/by-country
 * @desc Returns aggregated data: average rating, visit count, and destinations per country
 */
function getStatsByCountry(req, res) {
  // The store handles the aggregation logic
  const stats = store.getStatsByCountry();

  res.json({
    success: true,
    count: stats.length,  // Number of unique countries
    data: stats,          // Array of country statistics
  });
}

/**
 * Get top rated destinations
 * @route GET /api/travels/stats/top-destinations
 * @query limit - Maximum number of results (default: 10)
 */
function getTopDestinations(req, res) {
  // Parse the limit from query params, default to 10
  const limit = parseInt(req.query.limit, 10) || 10;
  
  // Get top destinations from store (sorted by rating descending)
  const topDestinations = store.getTopDestinations(limit);

  res.json({
    success: true,
    count: topDestinations.length,
    data: topDestinations,
  });
}

// Export all controller functions so they can be used in routes
module.exports = {
  createTravel,
  getAllTravels,
  getTravelById,
  updateTravel,
  deleteTravel,
  getStatsByCountry,
  getTopDestinations,
};
