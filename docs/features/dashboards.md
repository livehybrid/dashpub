---
layout: default
title: Dashboard System
parent: Features
nav_order: 1
---

# Dashboard System

Dashpub provides a comprehensive dashboard management system for publishing and displaying Splunk dashboards.

## Overview

The dashboard system allows you to:
- **Publish dashboards** from Splunk Enterprise/Cloud
- **Display dashboards** with real-time data
- **Organize dashboards** with tags and metadata
- **Generate screenshots** for thumbnails and previews
- **Navigate easily** with breadcrumb navigation

## Dashboard Structure

### Directory Structure

```
src/
├── _dashboards.json              # Dashboard metadata
├── dashboards/
│   ├── dashboard-id/
│   │   └── definition.json      # Dashboard definition
│   └── another-dashboard/
│       └── definition.json
```

### Dashboard Manifest

The `_dashboards.json` file contains metadata for all dashboards:

```json
{
  "dashboard-id": {
    "title": "Dashboard Title",
    "description": "Dashboard description",
    "tags": ["tag1", "tag2"],
    "theme": "light"
  }
}
```

## Creating Dashboards

### Using the CLI Tool

The easiest way to create dashboards is using the CLI:

```bash
node cli/cli.js init
```

This will:
1. Connect to your Splunk instance
2. Discover available dashboards
3. Generate dashboard definitions
4. Create the manifest file

### Manual Creation

1. Create a directory for your dashboard:
   ```bash
   mkdir -p src/dashboards/my-dashboard
   ```

2. Create the definition file:
   ```bash
   touch src/dashboards/my-dashboard/definition.json
   ```

3. Add dashboard definition (export from Splunk or create manually)

4. Update `_dashboards.json` with metadata

## Dashboard Definition Format

Dashboards use the Splunk Dashboard Studio JSON format:

```json
{
  "id": "dashboard-id",
  "title": "Dashboard Title",
  "description": "Dashboard description",
  "layout": {
    "type": "grid",
    "rows": 2,
    "columns": 3
  },
  "dataSources": {
    "dsid1": {
      "type": "splunk",
      "query": "index=main | stats count()",
      "refreshInterval": 30
    }
  },
  "visualizations": [
    {
      "id": "viz1",
      "type": "splunk.line",
      "dataSource": "dsid1"
    }
  ]
}
```

## Features

### On-Demand Data

Dashboards fetch data on-demand when loaded:
- No scheduled exports required
- Real-time data access
- Intelligent caching reduces Splunk load

### Metadata

Each dashboard can have:
- **Title** - Display name
- **Description** - Detailed description
- **Tags** - For organization and filtering
- **Theme** - Light or dark theme
- **Screenshot** - Thumbnail image

### Responsive Design

Dashboards automatically adapt to:
- Desktop screens
- Tablets
- Mobile devices
- Different screen orientations

## Screenshot Generation

Dashboards can have screenshots for:
- Homepage thumbnails
- Social media previews (Open Graph)
- Dashboard previews

See [Screenshot Configuration](../configuration/#screenshot-configuration) for details.

## Navigation

### Breadcrumb Navigation

Dashboard pages include breadcrumb navigation:
- Shows: Home → Dashboard Name
- Optional back button
- Configurable via environment variables

See [Breadcrumb Navigation](breadcrumbs/) for details.

## API Endpoints

### Get Dashboard List

```bash
GET /api/dashboards
```

Returns list of all dashboards with metadata.

### Get Dashboard Definition

```bash
GET /api/dashboards/:id/definition
```

Returns the full dashboard definition JSON.

### Get Dashboard Manifest

```bash
GET /api/dashboards/manifest
```

Returns enhanced manifest with screenshot URLs and hashes.

## Best Practices

1. **Use descriptive IDs** - Dashboard IDs should be URL-friendly
2. **Add metadata** - Include titles, descriptions, and tags
3. **Organize with tags** - Use tags to group related dashboards
4. **Optimize queries** - Use efficient Splunk queries
5. **Set refresh intervals** - Configure appropriate refresh times

## Related Documentation

- [Configuration Guide](../configuration/)
- [Screenshots](screenshots/)
- [Breadcrumb Navigation](breadcrumbs/)
- [API Reference](../api/)

