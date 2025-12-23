---
layout: default
title: Screenshot Generation
parent: Features
nav_order: 4
---

# Screenshot Generation

Dashpub supports automated screenshot generation for dashboard thumbnails and social media previews.

## Overview

Screenshots provide:
- **Homepage thumbnails** - Visual previews on the dashboard list
- **Social media previews** - Open Graph images for sharing
- **Dashboard previews** - Quick visual reference

## Configuration

### Enable Screenshots

```bash
NEXT_PUBLIC_DASHPUBSCREENSHOTS=true
```

### Screenshot Storage

#### Relative Paths (Default)

When `NEXT_PUBLIC_BASE_SCREENSHOT_URL` is empty, screenshots use relative paths:

```bash
NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=screenshots
NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=png
```

Screenshots are stored as:
- `screenshots/home.png` - Homepage screenshot
- `screenshots/dashboard-id.png` - Dashboard screenshots

#### Absolute URLs

For CDN or external hosting:

```bash
NEXT_PUBLIC_BASE_SCREENSHOT_URL=https://cdn.example.com
NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=screenshots
NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=png
```

Screenshots use hash-based filenames for consistency:
- `https://cdn.example.com/screenshots/abc123...png`

## Screenshot Generation

Screenshots are generated using external tools (e.g., dashpub-plus or Playwright). The application expects screenshots to be placed in the configured directory.

### Filename Convention

- **Homepage**: `home.{ext}`
- **Dashboards** (relative paths): `{dashboard-id}.{ext}`
- **Dashboards** (absolute URLs): `{hash}.{ext}`

## Usage

### In Dashboard Definitions

Screenshots are automatically included in dashboard definitions:

```json
{
  "id": "dashboard-id",
  "title": "Dashboard Title",
  "screenshotUrl": "/screenshots/dashboard-id.png"
}
```

### API Response

The `/api/dashboards/manifest` endpoint includes screenshot URLs:

```json
{
  "dashboards": {
    "dashboard-id": {
      "screenshotUrl": "/screenshots/dashboard-id.png",
      "screenshotHash": "abc123..."
    }
  }
}
```

## Open Graph Integration

Screenshots are automatically used for Open Graph meta tags:

```html
<meta property="og:image" content="/screenshots/dashboard-id.png" />
<meta property="og:image:width" content="700" />
<meta property="og:image:height" content="340" />
```

## Best Practices

1. **Generate screenshots** - Use automated tools to generate screenshots
2. **Optimize images** - Compress screenshots for faster loading
3. **Consistent sizing** - Use standard dimensions (e.g., 700x340)
4. **CDN hosting** - Use CDN for production deployments
5. **Fallback handling** - Handle missing screenshots gracefully

## Related Documentation

- [Configuration Guide](../configuration/)
- [Dashboard System](dashboards/)
- [API Reference](../api/)

