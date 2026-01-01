---
layout: default
title: Configuration
nav_order: 3
---

# Configuration Guide

Complete reference for all configuration options in Dashpub.

## Environment Variables

All configuration is done through environment variables. Create a `.env` file in the `app/` directory or set them in your deployment environment.

## Core Application Settings

### Server Configuration

```bash
# Server port (default: 3000)
PORT=3000

# Node environment
NODE_ENV=production  # or 'development'
```

### Splunk Connection

```bash
# Splunk REST API URL (Required)
SPLUNKD_URL=https://your-splunk-instance:8089

# Authentication - Use either username/password OR token
SPLUNKD_USER=admin
SPLUNKD_PASSWORD=your_password

# OR use token authentication
SPLUNKD_TOKEN=your_api_token

# Splunk UI Port (for fetching static assets)
SPLUNKD_UI_PORT=8000  # Default: 8000

# Splunk UI Locale (for static asset URLs)
SPLUNKD_LOCALE=en-US  # Default: en-US
```

## Dashboard Configuration

### Display Settings

```bash
# Dashboard title (shown on homepage)
NEXT_PUBLIC_DASHPUBTITLE=My Dashboards

# Theme (light or dark)
NEXT_PUBLIC_HOMETHEME=light

# Footer text
NEXT_PUBLIC_DASHPUBFOOTER=Hosted Splunk Dashboards

# Hosted by information
NEXT_PUBLIC_DASHPUBHOSTEDBY=Your Company
NEXT_PUBLIC_DASHPUBHOSTEDURL=https://yourcompany.com

# Repository link
NEXT_PUBLIC_DASHPUBREPO=https://github.com/yourusername/dashpub
```

### Screenshot Configuration

```bash
# Enable screenshots for dashboard thumbnails
NEXT_PUBLIC_DASHPUBSCREENSHOTS=false

# Base URL where screenshots are hosted (optional)
# Leave empty to use relative paths
NEXT_PUBLIC_BASE_SCREENSHOT_URL=

# Screenshot directory name
NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=screenshots

# Screenshot file extension
NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=png
```

### Breadcrumb Navigation

```bash
# Enable breadcrumb navigation (default: true)
NEXT_PUBLIC_DASHPUBBREADCRUMBS=true

# Show back button in breadcrumbs (default: true)
NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON=true
```

### Tab Rotation

```bash
# Rotation interval in milliseconds (default: 15000)
REACT_APP_TAB_ROTATION_INTERVAL=15000

# Enable/disable tab rotation (default: true)
REACT_APP_TAB_ROTATION_ENABLED=true
```

## Performance & Caching

```bash
# Cache cleanup interval (seconds)
CACHE_CLEANUP_INTERVAL=300

# Rate limiting window (minutes)
RATE_LIMIT_WINDOW=15

# Maximum requests per window
RATE_LIMIT_MAX_REQUESTS=1000

# Maximum retry attempts
MAX_RETRIES=3

# Search job delay (milliseconds)
SEARCH_JOB_DELAY_MS=250

# Minimum refresh time (seconds)
MIN_REFRESH_TIME=60
```

## Authentication & Security

### JWT Authentication

```bash
# Require JWT authentication
JWT_REQUIRED=false

# JWT secret key (change in production!)
JWT_SECRET=your-secret-key-change-in-production

# JWT expiry time
JWT_EXPIRES_IN=24h

# JWT username and password
JWT_USERNAME=admin
JWT_PASSWORD=your_password

# API key header name
API_KEY_HEADER=X-API-Key
```

## Logging & Monitoring

### File Logging

```bash
# Log file max size
LOG_MAX_SIZE=10m

# Maximum number of log files
LOG_MAX_FILES=5

# Log directory
LOG_DIR=./logs

# Log retention (days)
LOG_RETENTION_DAYS=30
```

### Splunk HEC (HTTP Event Collector)

```bash
# Enable HEC logging
SPLUNK_HEC_ENABLED=false

# HEC endpoint URL
SPLUNK_HEC_URL=https://your-splunk-instance:8088/services/collector

# HEC token
SPLUNK_HEC_TOKEN=your-hec-token-here

# HEC index
SPLUNK_HEC_INDEX=main

# HEC source
SPLUNK_HEC_SOURCE=dashpub

# HEC sourcetype
SPLUNK_HEC_SOURCETYPE=dashpub:app:logs

# HEC host
SPLUNK_HEC_HOST=your-hostname

# Batch configuration
SPLUNK_HEC_BATCH_SIZE=100
SPLUNK_HEC_BATCH_TIMEOUT=5000
SPLUNK_HEC_MAX_RETRIES=3
SPLUNK_HEC_RETRY_DELAY=1000
```

## Docker Variables

When using Docker, you can use `DASHPUB_*` prefix instead of `NEXT_PUBLIC_*`:

```bash
# These are automatically mapped to NEXT_PUBLIC_* for local development
DASHPUB_TITLE=My Dashboards
DASHPUB_SCREENSHOTS=false
DASHPUB_BREADCRUMBS=true
DASHPUB_BREADCRUMBS_BACK_BUTTON=true
```

## Configuration Priority

Environment variables are loaded in this order:

1. System environment variables
2. `.env` file in `app/` directory
3. `.env` file in project root
4. Default values

## Runtime Configuration

Some settings can be changed at runtime via the `/api/config` endpoint:

```bash
curl http://localhost:3000/api/config
```

This returns the current configuration including:
- Dashboard display settings
- Screenshot configuration
- Breadcrumb settings
- Tab rotation settings

## Best Practices

1. **Never commit `.env` files** - Add `.env` to `.gitignore`
2. **Use strong secrets** - Generate random strings for JWT_SECRET
3. **Use environment-specific configs** - Different `.env` files for dev/staging/prod
4. **Document your config** - Keep a `.env.example` file with all variables
5. **Validate on startup** - Check that required variables are set

## Example Configuration Files

### Development (.env.development)

```bash
NODE_ENV=development
PORT=3000
SPLUNKD_URL=http://localhost:8089
SPLUNKD_USER=admin
SPLUNKD_PASSWORD=changeme
NEXT_PUBLIC_DASHPUBTITLE=Development Dashboards
NEXT_PUBLIC_DASHPUBSCREENSHOTS=false
```

### Production (.env.production)

```bash
NODE_ENV=production
PORT=3000
SPLUNKD_URL=https://splunk.production.com:8089
SPLUNKD_TOKEN=secure-token-here
NEXT_PUBLIC_DASHPUBTITLE=Production Dashboards
NEXT_PUBLIC_DASHPUBSCREENSHOTS=true
NEXT_PUBLIC_BASE_SCREENSHOT_URL=https://cdn.example.com
JWT_REQUIRED=true
JWT_SECRET=very-secure-random-string
```

## Next Steps

- [Learn about features](features/)
- [Set up deployment](deployment/)
- [Configure dashboards](features/dashboards/)

