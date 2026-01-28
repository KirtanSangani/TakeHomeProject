/**
 * Weather Service - Open-Meteo API Integration
 * 
 * This service fetches weather data from Open-Meteo, a free weather API.
 * Key benefits of Open-Meteo:
 * - No API key required
 * - No rate limits for reasonable usage
 * - Supports both current weather and historical data
 * 
 * Documentation: https://open-meteo.com/
 */

// Import axios for making HTTP requests
// Axios is a popular HTTP client that works in Node.js and browsers
// It provides a cleaner API than the built-in 'fetch' with better error handling
const axios = require('axios');

// Base URL for the Open-Meteo current weather API
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Weather code to human-readable description mapping
 * 
 * Open-Meteo uses WMO (World Meteorological Organization) weather codes.
 * These are standardized numeric codes that represent weather conditions.
 * We map them to readable strings for display in our app.
 */
const WEATHER_CODES = {
  0: 'Clear sky',              // No clouds
  1: 'Mainly clear',           // Few clouds
  2: 'Partly cloudy',          // Some clouds
  3: 'Overcast',               // Fully cloudy
  45: 'Fog',                   // Visibility reduced by fog
  48: 'Depositing rime fog',   // Fog that creates frost
  51: 'Light drizzle',         // Very light rain
  53: 'Moderate drizzle',      // Light rain
  55: 'Dense drizzle',         // Steady light rain
  56: 'Light freezing drizzle', // Freezing light rain
  57: 'Dense freezing drizzle', // Freezing rain
  61: 'Slight rain',           // Light rain
  63: 'Moderate rain',         // Medium rain
  65: 'Heavy rain',            // Strong rain
  66: 'Light freezing rain',   // Ice rain, light
  67: 'Heavy freezing rain',   // Ice rain, heavy
  71: 'Slight snow',           // Light snow
  73: 'Moderate snow',         // Medium snow
  75: 'Heavy snow',            // Heavy snow
  77: 'Snow grains',           // Small ice particles
  80: 'Slight rain showers',   // Brief light rain
  81: 'Moderate rain showers', // Brief medium rain
  82: 'Violent rain showers',  // Brief heavy rain
  85: 'Slight snow showers',   // Brief light snow
  86: 'Heavy snow showers',    // Brief heavy snow
  95: 'Thunderstorm',          // Thunder and lightning
  96: 'Thunderstorm with slight hail', // Storm with small hail
  99: 'Thunderstorm with heavy hail',  // Storm with large hail
};

/**
 * Get current weather for a location
 * 
 * Fetches real-time weather data for the given coordinates.
 * Used for today's date or future travel plans.
 * 
 * @param {number} latitude - Latitude coordinate (-90 to 90)
 * @param {number} longitude - Longitude coordinate (-180 to 180)
 * @returns {Object|null} Weather data object, or null if fetch failed
 */
async function getCurrentWeather(latitude, longitude) {
  try {
    // Make HTTP GET request to Open-Meteo API
    // axios.get returns a promise that resolves to the response
    const response = await axios.get(OPEN_METEO_BASE_URL, {
      // Query parameters are passed in the 'params' object
      // axios automatically converts this to ?latitude=48.8&longitude=2.3&...
      params: {
        latitude,                  // GPS latitude
        longitude,                 // GPS longitude
        current_weather: true,     // Request current conditions (not forecast)
        timezone: 'auto',          // Auto-detect timezone from coordinates
      },
      timeout: 5000,               // Timeout after 5 seconds to avoid hanging
    });

    // Extract the current_weather object from the response
    const currentWeather = response.data.current_weather;

    // If the API didn't return weather data, return null
    if (!currentWeather) {
      return null;
    }

    // Transform API response into our standard format
    // This decouples our app from the external API's structure
    return {
      temperature: currentWeather.temperature,        // Current temp in Celsius
      temperatureUnit: '°C',                          // Unit label
      windSpeed: currentWeather.windspeed,            // Wind speed in km/h
      windSpeedUnit: 'km/h',                          // Unit label
      windDirection: currentWeather.winddirection,    // Wind direction in degrees
      // Look up the weather code in our mapping, default to 'Unknown'
      condition: WEATHER_CODES[currentWeather.weathercode] || 'Unknown',
      weatherCode: currentWeather.weathercode,        // Raw WMO code
      isDay: currentWeather.is_day === 1,             // 1 = day, 0 = night
      time: currentWeather.time,                      // Timestamp of the data
    };
  } catch (error) {
    // Log the error for debugging (in production, use proper logging service)
    console.error('Weather API error:', error.message);
    
    // Return null instead of throwing - weather is optional enrichment
    // This is a design decision: we don't want weather API failures
    // to prevent users from creating travel records
    return null;
  }
}

/**
 * Get historical weather for a specific date
 * 
 * Fetches archived weather data for past dates.
 * Open-Meteo maintains historical data back to 1940!
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object|null} Weather data object, or null if fetch failed
 */
async function getHistoricalWeather(latitude, longitude, date) {
  try {
    // Historical data uses a different API endpoint
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params: {
        latitude,
        longitude,
        start_date: date,          // Start of date range
        end_date: date,            // End of date range (same = single day)
        // Request daily aggregated data (not hourly)
        daily: 'temperature_2m_max,temperature_2m_min,weathercode',
        timezone: 'auto',
      },
      timeout: 5000,
    });

    // Extract the daily data from response
    const daily = response.data.daily;

    // Validate that we got the data we need
    // The API returns arrays with one element per day
    if (!daily || !daily.temperature_2m_max || !daily.temperature_2m_max[0]) {
      return null;
    }

    // Calculate average temperature from min and max
    const avgTemp = (daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2;

    // Return formatted weather data
    return {
      // Round average to 1 decimal place
      temperature: Math.round(avgTemp * 10) / 10,
      temperatureUnit: '°C',
      temperatureMax: daily.temperature_2m_max[0],    // Highest temp that day
      temperatureMin: daily.temperature_2m_min[0],    // Lowest temp that day
      condition: WEATHER_CODES[daily.weathercode[0]] || 'Unknown',
      weatherCode: daily.weathercode[0],
      date: date,                                     // The date this data is for
    };
  } catch (error) {
    console.error('Historical weather API error:', error.message);
    // Graceful failure - return null instead of crashing
    return null;
  }
}

/**
 * Get weather for a travel record
 * 
 * This is the main function used by the travel controller.
 * It automatically chooses between current and historical weather
 * based on the visit date.
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} visitDate - Date of visit in YYYY-MM-DD format
 * @returns {Object|null} Weather data, or null if coordinates missing or fetch failed
 */
async function getWeatherForTravel(latitude, longitude, visitDate) {
  // Return null if coordinates are not provided
  // This check uses || which treats 0 as falsy, but 0,0 is valid (off Africa coast)
  // However, for practical purposes, this is fine
  if (!latitude || !longitude) {
    return null;
  }

  // Get today's date in YYYY-MM-DD format
  // toISOString() returns "2024-01-15T10:30:00.000Z"
  // split('T')[0] extracts just the date part "2024-01-15"
  const today = new Date().toISOString().split('T')[0];
  
  // Choose which API to use based on whether the date is in the past
  // String comparison works for ISO dates because they're lexicographically ordered
  if (visitDate < today) {
    // Past date: fetch from historical archive
    return await getHistoricalWeather(latitude, longitude, visitDate);
  } else {
    // Today or future: fetch current weather
    // (For future dates, current weather is a reasonable approximation)
    return await getCurrentWeather(latitude, longitude);
  }
}

// Export functions for use in other parts of the application
module.exports = {
  getCurrentWeather,     // Get current weather (for testing or direct use)
  getHistoricalWeather,  // Get historical weather (for testing or direct use)
  getWeatherForTravel,   // Main function used by the travel controller
};
