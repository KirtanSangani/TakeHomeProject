/**
 * Travel Journal API - Express Server Entry Point
 * 
 * This is the main file that starts our web server.
 * It configures Express, sets up middleware, and defines routes.
 */

// Import the Express framework - this is the foundation of our web server
// Express makes it easy to create HTTP endpoints and handle requests
const express = require('express');

// Import CORS (Cross-Origin Resource Sharing) middleware
// This allows our frontend (running on one port) to make requests to our API (on another port)
// Without CORS, browsers would block requests between different origins for security
const cors = require('cors');

// Import Node.js built-in 'path' module
// This helps us work with file and directory paths in a cross-platform way
const path = require('path');

// Import our custom travel routes - these define all the /api/travels endpoints
const travelRoutes = require('./routes/travels');

// Import our custom error handling middleware
// errorHandler: catches errors and returns consistent JSON error responses
// notFoundHandler: returns 404 for routes that don't exist
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Create an Express application instance
// This 'app' object is our web server - we configure it and add routes to it
const app = express();

// Configuration - set the port and host for our server
// process.env.PORT allows us to override the port via environment variables
// The || operator provides a default value (3000) if no environment variable is set
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware are functions that run on every request before reaching route handlers
// They can modify the request/response, end the request, or pass to the next middleware
// Enable CORS for all routes
// This adds headers like 'Access-Control-Allow-Origin' to responses
app.use(cors());

// Parse JSON request bodies
// When a client sends JSON data (like {"title": "Paris Trip"}), 
// this middleware parses it and makes it available as req.body
app.use(express.json());

// Parse URL-encoded form data (like title=Paris+Trip&rating=5)
// 'extended: true' allows for rich objects and arrays to be encoded
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from the frontend directory
// path.join creates the correct path: backend/src/../../frontend = frontend/
// When someone requests /styles.css, Express looks for frontend/styles.css
app.use(express.static(path.join(__dirname, '../../frontend')));

// Mount the travel routes at /api/travels
// All routes defined in travelRoutes will be prefixed with /api/travels
// Example: if travelRoutes has GET '/', it becomes GET /api/travels
app.use('/api/travels', travelRoutes);

// Health check endpoint - useful for monitoring if the server is running
// Returns a simple JSON response confirming the API is operational
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',                           // Simple status indicator
    message: 'Travel Journal API is running', // Human-readable message
    timestamp: new Date().toISOString(),    // Current time in ISO format
  });
});

// Serve the frontend's index.html for the root URL (http://localhost:3000/)
// This allows users to access the web interface directly
app.get('/', (req, res) => {
  // sendFile sends a file as the HTTP response
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404 handler for API routes that don't exist
// The wildcard (*) catches any /api/* route that wasn't matched above
app.use('/api/*', notFoundHandler);

// Global error handler
// Express recognizes this as an error handler because it has 4 parameters (err, req, res, next)
// Any errors thrown or passed to next(error) will be caught here
app.use(errorHandler);

// Start listening for HTTP requests on the specified port
// The callback function runs once the server is ready
app.listen(PORT, () => {
  // Log a nice startup message showing available endpoints
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Travel Journal API                                       ║
║                                                            ║
║   Server running at: http://${HOST}:${PORT}                ║
║   API Base URL:      http://${HOST}:${PORT}/api            ║
║   Health Check:      http://${HOST}:${PORT}/api/health     ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET    /api/travels          List all travels          ║
║   - POST   /api/travels          Create a travel           ║
║   - GET    /api/travels/:id      Get a travel by ID        ║
║   - PUT    /api/travels/:id      Update a travel           ║
║   - DELETE /api/travels/:id      Delete a travel           ║
║   - GET    /api/travels/stats/by-country                   ║
║   - GET    /api/travels/stats/top-destinations             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Export the app for testing purposes
// This allows other files to import and test the Express app
module.exports = app;
