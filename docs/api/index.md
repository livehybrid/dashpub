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
GET /api/dashboards/:slug/definition
```

Returns the dashboard's generated `definition.json`. `GET /api/dashboards/:id` returns
the same document.

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

Data source ids are generated at build time from the search, its time range and any
post-process. See [Data Sources](../features/data-sources/) for the supported types and
how reports and chained searches are resolved.

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

`/health` also reports server uptime and memory, the Splunk URL and app in use, the
number of loaded data sources, the current cache size and rate limiting state. There is
no separate status, Splunk-test or cache-management endpoint; the cache has no manual
flush and expires entries on its own TTL.

## Export Endpoints

### Export Data Source Results

```http
GET /api/export/:dsid/:format
```

Exports a data source's results. `format` must be `csv` or `json`. Optional
`parameters` query string is merged into the search's query parameters.

## Logging Endpoints

Available when Splunk HEC logging is enabled (`SPLUNK_HEC_ENABLED=true`).

```http
GET  /api/logs/hec/status
POST /api/logs/hec/test
POST /api/logs/hec/flush
```

`status` returns the HEC client state, `test` checks connectivity, and `flush` sends
the current batch immediately.

## Authentication Endpoints

Available when `JWT_REQUIRED=true`; `/api/login` returns 400 otherwise.

```http
POST /api/login
GET  /api/auth/verify
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
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
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

### Check Health and Splunk Connectivity

```bash
curl http://localhost:3000/health | jq .services
```

## Related Documentation

- [Configuration Guide](../configuration/)
- [Data Sources](../features/data-sources/)
- [Developer Guide](../development/)
- [Dashboard System](../features/dashboards/)

