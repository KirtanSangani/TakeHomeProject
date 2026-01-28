/**
 * Travel Journal Frontend Application
 * 
 * This JavaScript file handles all the interactive functionality of the web page:
 * - Loading and displaying travel records from the API
 * - Creating, editing, and deleting records
 * - Filtering and searching
 * - Displaying statistics
 * 
 * It communicates with the backend API using the Fetch API.
 */

// ============ CONFIGURATION ============

// Base URL for our API endpoints
// Since frontend is served from same origin, we just use the path
// If API was on different server, we'd use full URL like 'http://api.example.com/travels'
const API_BASE = '/api/travels';

// ============ DOM ELEMENTS ============

// Cache DOM element references for performance
// Instead of calling document.getElementById() every time, we store references
// This is a common pattern for frequently accessed elements
const elements = {
  // Form elements
  form: document.getElementById('travel-form'),           // The add/edit form
  formTitle: document.getElementById('form-title'),       // "Add New Trip" / "Edit Trip"
  submitBtn: document.getElementById('submit-btn'),       // Submit button
  cancelBtn: document.getElementById('cancel-btn'),       // Cancel edit button
  travelId: document.getElementById('travel-id'),         // Hidden ID field for edits
  
  // List and display elements
  travelsList: document.getElementById('travels-list'),   // Container for travel cards
  emptyState: document.getElementById('empty-state'),     // "No trips" message
  
  // Filter elements
  searchInput: document.getElementById('search-input'),   // Search text input
  filterCountry: document.getElementById('filter-country'), // Country dropdown
  filterCategory: document.getElementById('filter-category'), // Category dropdown
  filterRating: document.getElementById('filter-rating'), // Rating dropdown
  
  // Stats elements
  totalTrips: document.getElementById('total-trips'),     // Total trips count
  countriesVisited: document.getElementById('countries-visited'), // Unique countries
  avgRating: document.getElementById('avg-rating'),       // Average rating
  countryStats: document.getElementById('country-stats'), // Country stats container
  
  // Toast notification
  toast: document.getElementById('toast'),                // Toast popup element
};

// ============ APPLICATION STATE ============

// Store loaded travels in memory for quick access
// This avoids re-fetching when we just need to reference the data
let travels = [];

// Track whether we're editing an existing record or creating new
let isEditing = false;

// ============ INITIALIZATION ============

// Wait for the DOM to be fully loaded before running our code
// DOMContentLoaded fires when HTML is parsed (doesn't wait for images)
document.addEventListener('DOMContentLoaded', () => {
  // Load initial data from the API
  loadTravels();      // Load all travel records
  loadCountryStats(); // Load aggregated stats
  
  // Set up event listeners for user interactions
  setupEventListeners();
});

// ============ EVENT LISTENERS ============

/**
 * Set up all event listeners for user interactions
 * Centralizing this makes it easy to see all the user interactions
 */
function setupEventListeners() {
  // Form submission - handles both create and update
  elements.form.addEventListener('submit', handleFormSubmit);
  
  // Cancel button - resets form when editing
  elements.cancelBtn.addEventListener('click', resetForm);
  
  // Search input - debounced to avoid too many API calls
  // debounce waits 300ms after user stops typing before calling handleFilter
  elements.searchInput.addEventListener('input', debounce(handleFilter, 300));
  
  // Filter dropdowns - immediate filtering when selection changes
  elements.filterCountry.addEventListener('change', handleFilter);
  elements.filterCategory.addEventListener('change', handleFilter);
  elements.filterRating.addEventListener('change', handleFilter);
}

// ============ API FUNCTIONS ============

/**
 * Generic API request function
 * 
 * Wraps fetch() with:
 * - Default headers (Content-Type: application/json)
 * - Automatic JSON parsing
 * - Error handling with toast notifications
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Object} Parsed JSON response
 * @throws {Error} If request fails or returns error
 */
async function apiRequest(url, options = {}) {
  try {
    // Make the HTTP request using fetch()
    const response = await fetch(url, {
      headers: {
        // Tell server we're sending JSON
        'Content-Type': 'application/json',
        // Spread any additional headers from options
        ...options.headers,
      },
      // Spread the rest of the options (method, body, etc.)
      ...options,
    });
    
    // Parse JSON response
    // Even error responses should be JSON with our API
    const data = await response.json();
    
    // Check if response indicates an error (status 400, 404, 500, etc.)
    // response.ok is true for status 200-299
    if (!response.ok) {
      // Throw error with message from API or default message
      throw new Error(data.error?.message || 'An error occurred');
    }
    
    // Return successful response data
    return data;
  } catch (error) {
    // Show error toast to user
    showToast(error.message, 'error');
    // Re-throw so calling code knows the request failed
    throw error;
  }
}

/**
 * Load all travel records from API with current filters
 * Called on page load and when filters change
 */
async function loadTravels() {
  try {
    // Build query string from current filter values
    const params = new URLSearchParams();
    
    // Get current filter values
    const search = elements.searchInput.value.trim();
    const country = elements.filterCountry.value;
    const category = elements.filterCategory.value;
    const minRating = elements.filterRating.value;
    
    // Only add params that have values
    // URLSearchParams handles encoding special characters
    if (search) params.append('search', search);
    if (country) params.append('country', country);
    if (category) params.append('category', category);
    if (minRating) params.append('minRating', minRating);
    
    // Build URL with query string
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
    
    // Fetch travels from API
    const result = await apiRequest(url);
    
    // Store in local state
    travels = result.data;
    
    // Update the UI
    renderTravels();        // Display travel cards
    updateStats();          // Update summary stats
    updateCountryFilter();  // Update country dropdown options
  } catch (error) {
    // Error already shown via toast in apiRequest
    console.error('Failed to load travels:', error);
  }
}

/**
 * Load country statistics from the aggregation endpoint
 */
async function loadCountryStats() {
  try {
    const result = await apiRequest(`${API_BASE}/stats/by-country`);
    renderCountryStats(result.data);
  } catch (error) {
    console.error('Failed to load country stats:', error);
  }
}

/**
 * Create a new travel record
 * 
 * @param {Object} data - Travel record data
 * @returns {Object} Created travel record
 */
async function createTravel(data) {
  const result = await apiRequest(API_BASE, {
    method: 'POST',              // HTTP POST for creating
    body: JSON.stringify(data),  // Convert object to JSON string
  });
  
  // Show success notification
  showToast('Trip added successfully!', 'success');
  return result.data;
}

/**
 * Update an existing travel record
 * 
 * @param {string} id - ID of record to update
 * @param {Object} data - Fields to update
 * @returns {Object} Updated travel record
 */
async function updateTravel(id, data) {
  const result = await apiRequest(`${API_BASE}/${id}`, {
    method: 'PUT',               // HTTP PUT for updating
    body: JSON.stringify(data),
  });
  
  showToast('Trip updated successfully!', 'success');
  return result.data;
}

/**
 * Delete a travel record
 * 
 * @param {string} id - ID of record to delete
 */
async function deleteTravel(id) {
  await apiRequest(`${API_BASE}/${id}`, {
    method: 'DELETE',            // HTTP DELETE for removing
  });
  
  showToast('Trip deleted successfully!', 'success');
}

// ============ FORM HANDLING ============

/**
 * Handle form submission for create/update
 * 
 * @param {Event} e - Submit event
 */
async function handleFormSubmit(e) {
  // Prevent default form submission (which would reload the page)
  e.preventDefault();
  
  // Create FormData object from the form
  // FormData makes it easy to get all form values
  const formData = new FormData(e.target);
  
  // Build data object from form values
  // formData.get('fieldName') returns the value of that field
  const data = {
    title: formData.get('title'),
    destination: formData.get('destination'),
    country: formData.get('country'),
    visitDate: formData.get('visitDate'),
    rating: parseInt(formData.get('rating'), 10),  // Convert to number
    category: formData.get('category'),
    notes: formData.get('notes'),
  };
  
  // Add coordinates if provided (they're optional)
  const latitude = formData.get('latitude');
  const longitude = formData.get('longitude');
  if (latitude) data.latitude = parseFloat(latitude);
  if (longitude) data.longitude = parseFloat(longitude);
  
  try {
    // Either update existing or create new based on isEditing flag
    if (isEditing) {
      const id = elements.travelId.value;
      await updateTravel(id, data);
    } else {
      await createTravel(data);
    }
    
    // Reset form and reload data
    resetForm();
    loadTravels();
    loadCountryStats();
  } catch (error) {
    // Error handling is done in apiRequest, but we catch here
    // to prevent the form from being reset on error
    console.error('Form submission failed:', error);
  }
}

/**
 * Enter edit mode for a travel record
 * Populates form with existing data
 * 
 * @param {string} id - ID of record to edit
 */
function editTravel(id) {
  // Find the travel record in our local state
  const travel = travels.find(t => t.id === id);
  if (!travel) return;
  
  // Set editing state
  isEditing = true;
  
  // Store the ID in hidden field
  elements.travelId.value = travel.id;
  
  // Update form title and button text
  elements.formTitle.textContent = 'Edit Trip';
  elements.submitBtn.textContent = 'Update Trip';
  
  // Show cancel button
  elements.cancelBtn.style.display = 'inline-block';
  
  // Populate all form fields with existing values
  document.getElementById('title').value = travel.title;
  document.getElementById('destination').value = travel.destination;
  document.getElementById('country').value = travel.country;
  document.getElementById('visitDate').value = travel.visitDate;
  document.getElementById('rating').value = travel.rating;
  document.getElementById('category').value = travel.category || 'other';
  document.getElementById('latitude').value = travel.latitude || '';
  document.getElementById('longitude').value = travel.longitude || '';
  document.getElementById('notes').value = travel.notes || '';
  
  // Scroll form into view so user can see it
  elements.form.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Confirm and delete a travel record
 * Shows confirmation dialog before deleting
 * 
 * @param {string} id - ID of record to delete
 */
async function confirmDelete(id) {
  // Show browser's native confirm dialog
  // Returns true if user clicks OK, false if Cancel
  if (!confirm('Are you sure you want to delete this trip?')) return;
  
  try {
    await deleteTravel(id);
    // Reload data after successful delete
    loadTravels();
    loadCountryStats();
  } catch (error) {
    console.error('Delete failed:', error);
  }
}

/**
 * Reset form to initial "Add" state
 * Called after submission or when canceling edit
 */
function resetForm() {
  // Clear editing state
  isEditing = false;
  
  // Reset all form fields
  elements.form.reset();
  
  // Clear hidden ID field
  elements.travelId.value = '';
  
  // Reset UI to "Add" mode
  elements.formTitle.textContent = 'Add New Trip';
  elements.submitBtn.textContent = 'Add Trip';
  elements.cancelBtn.style.display = 'none';
}

/**
 * Handle filter changes
 * Called when any filter input/select changes
 */
function handleFilter() {
  // Simply reload travels - the API call includes current filter values
  loadTravels();
}

// ============ RENDERING FUNCTIONS ============

/**
 * Render travel cards in the list
 * Creates HTML for each travel record and inserts into DOM
 */
function renderTravels() {
  // Show empty state if no travels
  if (travels.length === 0) {
    elements.travelsList.innerHTML = '';
    elements.emptyState.style.display = 'block';
    return;
  }
  
  // Hide empty state when we have data
  elements.emptyState.style.display = 'none';
  
  // Generate HTML for all travel cards and insert
  // .map() transforms each travel object into HTML string
  // .join('') combines all strings into one
  elements.travelsList.innerHTML = travels.map(travel => createTravelCard(travel)).join('');
}

/**
 * Create HTML for a single travel card
 * 
 * @param {Object} travel - Travel record object
 * @returns {string} HTML string for the card
 */
function createTravelCard(travel) {
  // Generate star rating display
  // '⭐'.repeat(5) creates "⭐⭐⭐⭐⭐" for rating 5
  const stars = '⭐'.repeat(travel.rating);
  
  // Generate weather HTML if weather data exists
  // Ternary operator: condition ? valueIfTrue : valueIfFalse
  const weatherHtml = travel.weather ? `
    <div class="travel-card-weather">
      <span class="weather-temp">${travel.weather.temperature}${travel.weather.temperatureUnit || '°C'}</span>
      <span> - ${travel.weather.condition}</span>
    </div>
  ` : '';
  
  // Return the complete card HTML
  // Template literals (``) allow multi-line strings and ${} interpolation
  // escapeHtml() prevents XSS attacks by encoding special characters
  return `
    <div class="travel-card">
      <div class="travel-card-header">
        <h3 class="travel-card-title">${escapeHtml(travel.title)}</h3>
        <div class="travel-card-location">
          📍 ${escapeHtml(travel.destination)}, ${escapeHtml(travel.country)}
        </div>
      </div>
      <div class="travel-card-body">
        <div class="travel-card-meta">
          <span class="meta-item">
            <span class="rating-stars">${stars}</span>
          </span>
          <span class="meta-item">
            📅 ${formatDate(travel.visitDate)}
          </span>
          <span class="category-badge">${travel.category || 'other'}</span>
        </div>
        ${travel.notes ? `<p class="travel-card-notes">${escapeHtml(travel.notes)}</p>` : ''}
        ${weatherHtml}
        <div class="travel-card-actions">
          <!-- onclick calls our global functions with the travel ID -->
          <button class="btn btn-secondary btn-sm" onclick="editTravel('${travel.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${travel.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render country statistics cards
 * 
 * @param {Array} stats - Array of country stat objects
 */
function renderCountryStats(stats) {
  // Handle empty state
  if (stats.length === 0) {
    elements.countryStats.innerHTML = '<p>No statistics available yet.</p>';
    return;
  }
  
  // Generate HTML for each country stat card
  elements.countryStats.innerHTML = stats.map(stat => `
    <div class="country-stat-card">
      <div class="country-stat-name">🌍 ${escapeHtml(stat.country)}</div>
      <div class="country-stat-details">
        <p>⭐ Average Rating: ${stat.averageRating}/5</p>
        <p>🎯 Visits: ${stat.visitCount}</p>
        <!-- Show first 3 destinations, add "..." if more -->
        <p>📍 Places: ${stat.destinations.slice(0, 3).join(', ')}${stat.destinations.length > 3 ? '...' : ''}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Update the summary statistics at the top of the page
 */
function updateStats() {
  // Update total trips count
  elements.totalTrips.textContent = travels.length;
  
  // Calculate unique countries using Set
  // Set automatically removes duplicates
  const countries = new Set(travels.map(t => t.country));
  elements.countriesVisited.textContent = countries.size;
  
  // Calculate average rating
  if (travels.length > 0) {
    // .reduce() sums up all ratings
    const avgRating = travels.reduce((sum, t) => sum + t.rating, 0) / travels.length;
    // .toFixed(1) rounds to 1 decimal place and returns string
    elements.avgRating.textContent = avgRating.toFixed(1);
  } else {
    elements.avgRating.textContent = '-';
  }
}

/**
 * Update the country filter dropdown with current countries
 * Dynamically populates options based on existing travel records
 */
function updateCountryFilter() {
  // Get unique countries, sorted alphabetically
  const countries = [...new Set(travels.map(t => t.country))].sort();
  
  // Remember current selection
  const currentValue = elements.filterCountry.value;
  
  // Rebuild options HTML
  // First option is "All Countries" (empty value)
  elements.filterCountry.innerHTML = '<option value="">All Countries</option>' +
    countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  
  // Restore selection if it still exists
  elements.filterCountry.value = currentValue;
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format a date string for display
 * Converts "2024-03-15" to "Mar 15, 2024"
 * 
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
  // Create Date object from string
  const date = new Date(dateStr);
  
  // Use Intl.DateTimeFormat via toLocaleDateString for localized formatting
  return date.toLocaleDateString('en-US', {
    year: 'numeric',   // "2024"
    month: 'short',    // "Mar"
    day: 'numeric',    // "15"
  });
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * XSS (Cross-Site Scripting) attacks happen when user input containing
 * HTML/JavaScript is inserted directly into the page. By escaping
 * special characters, we ensure they're displayed as text, not executed.
 * 
 * @param {string} text - Raw text that may contain HTML
 * @returns {string} Safe text with HTML entities escaped
 */
function escapeHtml(text) {
  // Create a temporary div element
  const div = document.createElement('div');
  // Set its text content (browser automatically escapes HTML)
  div.textContent = text;
  // Read back as innerHTML (now escaped)
  return div.innerHTML;
}

/**
 * Debounce function - delays execution until user stops triggering
 * 
 * This is crucial for search inputs to avoid making an API call
 * on every keystroke. Instead, it waits for user to pause typing.
 * 
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  // Store timeout ID so we can cancel it
  let timeoutId;
  
  // Return a new function that wraps the original
  return function (...args) {
    // Cancel any pending execution
    clearTimeout(timeoutId);
    
    // Schedule new execution after delay
    // If user triggers again before delay, this is cleared and rescheduled
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Show a toast notification
 * 
 * Toasts are small popups that appear briefly to confirm actions.
 * They auto-dismiss after 3 seconds.
 * 
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info' (affects color)
 */
function showToast(message, type = 'info') {
  // Set the message text
  elements.toast.textContent = message;
  
  // Set classes for styling and visibility
  // 'show' class triggers CSS animation to slide in
  elements.toast.className = `toast ${type} show`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    // Remove 'show' class to trigger slide-out animation
    elements.toast.className = 'toast';
  }, 3000);
}
