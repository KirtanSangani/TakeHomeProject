# Travel Journal API

A REST API for a travel journal application that allows users to record trips and places they visit, with weather integration and data aggregation features.

## Features

- **CRUD Operations**: Create, read, update, and delete travel records
- **Filtering & Search**: Filter travels by country, category, rating, date range, and search text
- **Weather Integration**: Automatic weather data enrichment using the free Open-Meteo API
- **Data Aggregation**: Statistics by country and top destinations endpoints
- **Input Validation**: Comprehensive validation with clear error messages
- **Web Frontend**: Simple, modern UI for interacting with the API

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Validation**: express-validator
- **HTTP Client**: Axios (for weather API)
- **Storage**: In-memory (no external database required)
- **Weather API**: Open-Meteo (free, no API key required)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TakeHomeProject
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000` to access the web frontend.

### Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Health Check

```http
GET /api/health
```

Returns the API status.

**Response:**
```json
{
  "status": "ok",
  "message": "Travel Journal API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Travel Records

#### Create a Travel Record

```http
POST /api/travels
```

**Request Body:**
```json
{
  "title": "Trip to Paris",
  "destination": "Paris",
  "country": "France",
  "visitDate": "2024-03-15",
  "rating": 5,
  "category": "city",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "notes": "Amazing architecture and food!"
}
```

**Required Fields:**
- `title` (string, max 200 chars)
- `destination` (string, max 200 chars)
- `country` (string, max 100 chars)
- `visitDate` (string, YYYY-MM-DD format)
- `rating` (integer, 1-5)

**Optional Fields:**
- `category` (string): city, beach, mountain, nature, historical, adventure, cultural, food, other
- `latitude` (number, -90 to 90)
- `longitude` (number, -180 to 180)
- `notes` (string, max 5000 chars)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Trip to Paris",
    "destination": "Paris",
    "country": "France",
    "visitDate": "2024-03-15",
    "rating": 5,
    "category": "city",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "notes": "Amazing architecture and food!",
    "weather": {
      "temperature": 12.5,
      "temperatureUnit": "°C",
      "condition": "Partly cloudy"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### List All Travel Records

```http
GET /api/travels
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `country` | string | Filter by country name |
| `category` | string | Filter by category |
| `minRating` | integer | Minimum rating (1-5) |
| `maxRating` | integer | Maximum rating (1-5) |
| `startDate` | string | Filter visits after this date (YYYY-MM-DD) |
| `endDate` | string | Filter visits before this date (YYYY-MM-DD) |
| `search` | string | Search in title and notes |

**Example:**
```http
GET /api/travels?country=France&minRating=4&category=city
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Trip to Paris",
      "destination": "Paris",
      "country": "France",
      ...
    }
  ]
}
```

---

#### Get a Single Travel Record

```http
GET /api/travels/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Trip to Paris",
    ...
  }
}
```

---

#### Update a Travel Record

```http
PUT /api/travels/:id
```

**Request Body:** (only include fields to update)
```json
{
  "rating": 4,
  "notes": "Updated notes after second visit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Trip to Paris",
    "rating": 4,
    "notes": "Updated notes after second visit",
    "updatedAt": "2024-01-16T12:00:00.000Z",
    ...
  }
}
```

---

#### Delete a Travel Record

```http
DELETE /api/travels/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Travel record deleted successfully"
}
```

---

### Statistics Endpoints

#### Average Ratings by Country

```http
GET /api/travels/stats/by-country
```

Returns aggregated statistics grouped by country.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "country": "France",
      "averageRating": 4.5,
      "visitCount": 4,
      "destinations": ["Paris", "Lyon", "Nice"]
    },
    {
      "country": "Japan",
      "averageRating": 5,
      "visitCount": 2,
      "destinations": ["Tokyo", "Kyoto"]
    }
  ]
}
```

---

#### Top Destinations

```http
GET /api/travels/stats/top-destinations
```

Returns top-rated travel destinations.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Maximum number of results |

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Trip to Tokyo",
      "destination": "Tokyo",
      "country": "Japan",
      "rating": 5,
      "visitDate": "2024-04-10",
      "category": "city"
    }
  ]
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `BAD_REQUEST` | 400 | Malformed request |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Server error |

### Validation Error Example

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "rating",
        "message": "Rating must be an integer between 1 and 5",
        "value": 10
      }
    ]
  }
}
```

---

## Weather Integration

The API integrates with [Open-Meteo](https://open-meteo.com/), a free weather API that requires no API key.

### How it Works

1. When creating or updating a travel record with latitude/longitude coordinates, the API automatically fetches weather data.
2. For past dates, historical weather data is retrieved.
3. For current/future dates, current weather conditions are fetched.
4. Weather data is stored with the travel record.

### Weather Data Structure

```json
{
  "weather": {
    "temperature": 18.5,
    "temperatureUnit": "°C",
    "windSpeed": 12.3,
    "windSpeedUnit": "km/h",
    "condition": "Partly cloudy",
    "weatherCode": 2,
    "isDay": true
  }
}
```

### Design Decisions

- Weather fetching is **optional** - records can be created without coordinates
- Weather API failures are **graceful** - they don't prevent record creation
- Weather is **cached** with the record to avoid repeated API calls

---

## Project Structure

```
TakeHomeProject/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── routes/
│   │   │   └── travels.js        # Travel routes
│   │   ├── controllers/
│   │   │   └── travelController.js
│   │   ├── services/
│   │   │   └── weatherService.js # Open-Meteo integration
│   │   ├── store/
│   │   │   └── memoryStore.js    # In-memory data store
│   │   ├── middleware/
│   │   │   ├── validator.js      # Input validation
│   │   │   └── errorHandler.js   # Error handling
│   │   └── utils/
│   │       └── errors.js         # Custom error classes
│   └── package.json
├── frontend/
│   ├── index.html                # Main HTML page
│   ├── styles.css                # CSS styles
│   └── app.js                    # Frontend JavaScript
└── README.md
```

---

## Design Decisions

### Architecture

- **Separation of Concerns**: Routes, controllers, services, and data store are separated into distinct modules
- **Async Handler**: All async route handlers are wrapped to catch errors and forward them to the error handler
- **Singleton Store**: The in-memory store is exported as a singleton for simplicity

### API Design

- **RESTful Conventions**: Standard HTTP methods (GET, POST, PUT, DELETE) with intuitive resource paths
- **Consistent Responses**: All responses include a `success` boolean and either `data` or `error`
- **Filter-Friendly**: Multiple query parameters for flexible filtering

### Validation

- **express-validator**: Industry-standard validation library
- **Detailed Errors**: Validation errors include the field name, message, and invalid value
- **Strict Date Format**: Dates must be in ISO 8601 format (YYYY-MM-DD)

### Weather Integration

- **Open-Meteo**: Chosen for being free and requiring no API key
- **Graceful Degradation**: Weather fetch failures don't affect core functionality
- **Historical Data**: Supports fetching weather for past dates via the archive API

---

## Sample cURL Commands

### Create a travel record
```bash
curl -X POST http://localhost:3000/api/travels \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekend in Paris",
    "destination": "Paris",
    "country": "France",
    "visitDate": "2024-03-15",
    "rating": 5,
    "category": "city",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "notes": "Beautiful city!"
  }'
```

### List all travels
```bash
curl http://localhost:3000/api/travels
```

### Filter by country and rating
```bash
curl "http://localhost:3000/api/travels?country=France&minRating=4"
```

### Update a travel record
```bash
curl -X PUT http://localhost:3000/api/travels/<id> \
  -H "Content-Type: application/json" \
  -d '{"rating": 4}'
```

### Delete a travel record
```bash
curl -X DELETE http://localhost:3000/api/travels/<id>
```

### Get statistics by country
```bash
curl http://localhost:3000/api/travels/stats/by-country
```

---

## Future Improvements

- **Database Persistence**: Add PostgreSQL or MongoDB for data persistence
- **Image Upload**: Support for uploading trip photos
- **Authentication**: User accounts and JWT-based authentication
- **Pagination**: Add pagination for large result sets
- **Rate Limiting**: Protect against abuse
- **API Versioning**: Version the API for backwards compatibility

---

## License

MIT
