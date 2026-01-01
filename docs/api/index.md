---
layout: default
title: API Reference
nav_order: 5
---

# API Reference

Complete API documentation for Dashpub endpoints.

## Base URL

All API endpoints are prefixed with `/api`:

```
http://localhost:3000/api
```

## Authentication

Most endpoints are public. Some endpoints require authentication if `JWT_REQUIRED=true`:

```bash
# Include JWT token in cookie or header
Cookie: jwt_token=your-jwt-token
```

## Dashboard Endpoints

### Get All Dashboards

```http
GET /api/dashboards
```

Returns a list of all available dashboards.

**Response:**
```json
{
  "dashboards": [
    {
      "id": "dashboard-id",
      "name": "Dashboard Name",
      "description": "Dashboard description",
      "path": "/api/dashboards/dashboard-id/definition",
      "url": "/dashboard/dashboard-id",
      "tags": ["tag1", "tag2"]
    }
  ],
  "metadata": {
    "total": 1,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### Get Dashboard Definition

```http
GET /api/dashboards/:id/definition
```

Returns the complete dashboard definition JSON.

**Parameters:**
- `id` (path) - Dashboard ID

**Response:**
```json
{
  "id": "dashboard-id",
  "title": "Dashboard Title",
  "layout": { ... },
  "dataSources": { ... },
  "visualizations": [ ... ],
  "screenshotUrl": "/screenshots/dashboard-id.png",
  "screenshotHash": "abc123..."
}
```

### Get Dashboard Manifest

```http
GET /api/dashboards/manifest
```

Returns enhanced manifest with screenshot URLs and metadata.

**Response:**
```json
{
  "dashboards": {
    "dashboard-id": {
      "title": "Dashboard Title",
      "description": "Description",
      "tags": ["tag1"],
      "screenshotUrl": "/screenshots/dashboard-id.png",
      "screenshotHash": "abc123..."
    }
  },
  "metadata": {
    "total": 1,
    "baseUrl": "http://localhost",
    "screenshotBaseUrl": ""
  }
}
```

## Configuration Endpoint

### Get Configuration

```http
GET /api/config
```

Returns current application configuration.

**Response:**
```json
{
  "title": "My Dashboards",
  "theme": "light",
  "footer": "Hosted Splunk Dashboards",
  "screenshots": {
    "enabled": false,
    "baseUrl": "",
    "dir": "screenshots",
    "ext": "png"
  },
  "breadcrumbs": {
    "enabled": true,
    "showBackButton": true
  },
  "tabRotation": {
    "interval": 15000,
    "enabled": true
  },
  "baseUrl": "http://localhost",
  "jwtRequired": false
}
```

## Data Source Endpoints

### Get Data Source Data

```http
GET /api/data/:dsid
```

Fetches data for a specific data source.

**Parameters:**
- `dsid` (path) - Data source ID

**Query Parameters:**
- `refresh` (optional) - Force refresh cache

**Response:**
```json
{
  "fields": ["field1", "field2"],
  "columns": [
    ["value1", "value2"],
    ["value3", "value4"]
  ],
  "meta": {
    "sid": "search-job-id",
    "status": "done",
    "totalCount": 2
  }
}
```

## Health & Status

### Health Check

```http
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Server Status

```http
GET /api/status
```

Returns detailed server status and metrics.

**Response:**
```json
{
  "status": "running",
  "uptime": 3600,
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  },
  "cache": {
    "entries": 156,
    "hitRate": 0.87
  }
}
```

### Test Splunk Connection

```http
GET /api/splunk/test
```

Tests connection to Splunk instance.

**Response:**
```json
{
  "connected": true,
  "user": "admin",
  "url": "https://splunk-instance:8089"
}
```

## Cache Management

### Get Cache Statistics

```http
GET /api/cache/stats
```

Returns cache statistics (public endpoint).

**Response:**
```json
{
  "totalEntries": 156,
  "memoryUsage": "45.2 MB",
  "hitRate": 0.87,
  "missRate": 0.13,
  "evictions": 23
}
```

### Clear Cache

```http
DELETE /api/cache/clear
```

Clears all cache entries (requires `CACHE_MANAGEMENT_KEY`).

**Headers:**
```
x-cache-key: your-cache-management-key
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
- `429` - Too Many Requests (rate limited)

## Rate Limiting

API endpoints are rate-limited by default:
- **Window**: 15 minutes
- **Max Requests**: 1000 per IP
- **Response**: 429 status code when exceeded

Configure via environment variables:
```bash
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000
```

## Examples

### Fetch Dashboard List

```bash
curl http://localhost:3000/api/dashboards
```

### Get Dashboard Definition

```bash
curl http://localhost:3000/api/dashboards/my-dashboard/definition
```

### Get Configuration

```bash
curl http://localhost:3000/api/config | jq .
```

### Test Splunk Connection

```bash
curl http://localhost:3000/api/splunk/test
```

## Related Documentation

- [Configuration Guide](../configuration/)
- [Developer Guide](../development/)
- [Dashboard System](../features/dashboards/)

