/**
 * In-Memory Data Store
 * 
 * This file provides data storage using JavaScript's Map data structure.
 * A Map is like an object but with better performance for frequent additions/deletions.
 * 
 * IMPORTANT: Data is stored in memory (RAM), so it's lost when the server restarts.
 * In a production app, you'd use a database like PostgreSQL or MongoDB.
 * 
 * This store follows the "Repository Pattern" - it abstracts data access
 * so the rest of the app doesn't need to know HOW data is stored.
 */

/**
 * MemoryStore class - handles all data operations for travel records
 * 
 * We use a class to encapsulate the data and methods together.
 * This provides organization and allows for easy testing.
 */
class MemoryStore {
  /**
   * Constructor - called when creating a new MemoryStore instance
   * Initializes an empty Map to store travel records
   */
  constructor() {
    // Map is a JavaScript collection that stores key-value pairs
    // Key: travel record ID (string)
    // Value: travel record object
    // Maps are better than plain objects for dynamic keys and have O(1) lookups
    this.travels = new Map();
  }

  /**
   * Create a new travel record
   * 
   * @param {Object} travel - The travel record to create (must have an id)
   * @returns {Object} The created travel record
   */
  create(travel) {
    // Store the travel record with its ID as the key
    // Map.set(key, value) adds or updates an entry
    this.travels.set(travel.id, travel);
    
    // Return the travel record (useful for chaining or confirmation)
    return travel;
  }

  /**
   * Get all travel records with optional filtering
   * 
   * This method supports multiple filter criteria that can be combined.
   * Filters are applied sequentially (AND logic - all conditions must match).
   * 
   * @param {Object} filters - Optional filter criteria
   * @param {string} filters.country - Filter by country name
   * @param {string} filters.category - Filter by category
   * @param {number} filters.minRating - Minimum rating (inclusive)
   * @param {number} filters.maxRating - Maximum rating (inclusive)
   * @param {string} filters.startDate - Filter visits on or after this date
   * @param {string} filters.endDate - Filter visits on or before this date
   * @param {string} filters.search - Search text in title and notes
   * @returns {Array} Filtered array of travel records
   */
  findAll(filters = {}) {
    // Convert Map values to an array so we can filter them
    // Map.values() returns an iterator, Array.from() converts it to an array
    let results = Array.from(this.travels.values());

    // Apply country filter if provided
    // Uses case-insensitive comparison (toLowerCase on both sides)
    if (filters.country) {
      results = results.filter(
        (t) => t.country.toLowerCase() === filters.country.toLowerCase()
      );
    }

    // Apply category filter if provided
    if (filters.category) {
      results = results.filter(
        (t) => t.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Apply minimum rating filter if provided
    // filters.minRating !== undefined handles the case where minRating is 0
    if (filters.minRating !== undefined) {
      results = results.filter((t) => t.rating >= filters.minRating);
    }

    // Apply maximum rating filter if provided
    if (filters.maxRating !== undefined) {
      results = results.filter((t) => t.rating <= filters.maxRating);
    }

    // Apply start date filter if provided
    // String comparison works for ISO dates (YYYY-MM-DD) because they sort lexicographically
    if (filters.startDate) {
      results = results.filter((t) => t.visitDate >= filters.startDate);
    }

    // Apply end date filter if provided
    if (filters.endDate) {
      results = results.filter((t) => t.visitDate <= filters.endDate);
    }

    // Apply search filter if provided
    // Searches in both title and notes fields (case-insensitive)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          // Check if title contains search text
          t.title.toLowerCase().includes(searchLower) ||
          // Check if notes exist AND contain search text
          (t.notes && t.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sort results by visit date, most recent first
    // new Date() converts strings to Date objects for comparison
    // b - a gives descending order (newest first)
    results.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

    return results;
  }

  /**
   * Find a single travel record by its ID
   * 
   * @param {string} id - The unique identifier of the travel record
   * @returns {Object|null} The travel record, or null if not found
   */
  findById(id) {
    // Map.get(key) returns the value or undefined if not found
    // We use || null to convert undefined to null (clearer API contract)
    return this.travels.get(id) || null;
  }

  /**
   * Update an existing travel record
   * 
   * Merges the updates with existing data, preserving unmodified fields.
   * Automatically updates the 'updatedAt' timestamp.
   * Protected fields (id, createdAt) cannot be changed.
   * 
   * @param {string} id - The ID of the record to update
   * @param {Object} updates - Object containing the fields to update
   * @returns {Object|null} The updated record, or null if not found
   */
  update(id, updates) {
    // Get the existing record
    const existing = this.travels.get(id);
    
    // If record doesn't exist, return null
    if (!existing) {
      return null;
    }

    // Create updated record using object spread operator
    // Order matters: later properties override earlier ones
    const updated = {
      ...existing,                          // Start with all existing fields
      ...updates,                           // Override with provided updates
      id: existing.id,                      // PROTECT: Always keep original ID
      createdAt: existing.createdAt,        // PROTECT: Never change creation time
      updatedAt: new Date().toISOString(),  // Always update the timestamp
    };

    // Save the updated record
    this.travels.set(id, updated);
    
    return updated;
  }

  /**
   * Delete a travel record
   * 
   * @param {string} id - The ID of the record to delete
   * @returns {boolean} True if deleted, false if record didn't exist
   */
  delete(id) {
    // Map.delete(key) returns true if element existed and was deleted
    return this.travels.delete(id);
  }

  /**
   * Get aggregated statistics grouped by country
   * 
   * Calculates:
   * - Average rating per country
   * - Number of visits per country
   * - List of unique destinations per country
   * 
   * @returns {Array} Array of country statistics, sorted by average rating (descending)
   */
  getStatsByCountry() {
    // Object to accumulate stats for each country
    const countryStats = {};

    // Iterate over all travel records
    for (const travel of this.travels.values()) {
      const country = travel.country;
      
      // Initialize stats for this country if we haven't seen it before
      if (!countryStats[country]) {
        countryStats[country] = {
          country,                // Country name
          totalRating: 0,         // Sum of all ratings (for calculating average)
          count: 0,               // Number of visits
          visits: [],             // Array of destination names
        };
      }
      
      // Add this travel's data to the country's stats
      countryStats[country].totalRating += travel.rating;
      countryStats[country].count += 1;
      countryStats[country].visits.push(travel.destination);
    }

    // Transform the stats object into the final format
    return Object.values(countryStats)
      .map((stat) => ({
        country: stat.country,
        // Calculate average and round to 1 decimal place
        // Math.round(x * 10) / 10 gives one decimal place precision
        averageRating: Math.round((stat.totalRating / stat.count) * 10) / 10,
        visitCount: stat.count,
        // Remove duplicate destinations using Set
        // [...new Set(array)] is a common pattern to get unique values
        destinations: [...new Set(stat.visits)],
      }))
      // Sort by average rating, highest first
      .sort((a, b) => b.averageRating - a.averageRating);
  }

  /**
   * Get top-rated destinations
   * 
   * Returns the highest-rated travel records, sorted by rating then date.
   * 
   * @param {number} limit - Maximum number of results to return (default: 10)
   * @returns {Array} Array of top destinations with selected fields
   */
  getTopDestinations(limit = 10) {
    return Array.from(this.travels.values())
      // Sort by rating (descending), then by visit date (most recent first) as tiebreaker
      .sort((a, b) => b.rating - a.rating || new Date(b.visitDate) - new Date(a.visitDate))
      // Take only the top 'limit' results
      .slice(0, limit)
      // Return only selected fields (not the full record)
      .map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        country: t.country,
        rating: t.rating,
        visitDate: t.visitDate,
        category: t.category,
      }));
  }

  /**
   * Clear all records from the store
   * Useful for testing or resetting the application
   */
  clear() {
    this.travels.clear();
  }

  /**
   * Get the total count of records in the store
   * 
   * @returns {number} Total number of travel records
   */
  count() {
    // Map.size returns the number of entries
    return this.travels.size;
  }
}

// ============ SINGLETON PATTERN ============
// Create a single instance of the store and export it
// This ensures all parts of the app share the same data store
// If we exported the class, each import would create a new store with no data!

const store = new MemoryStore();

module.exports = store;
