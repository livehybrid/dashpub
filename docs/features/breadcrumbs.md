---
layout: default
title: Breadcrumb Navigation
parent: Features
nav_order: 5
---

# Breadcrumb Navigation

Dashpub includes breadcrumb navigation to improve user orientation and navigation between dashboards.

## Overview

Breadcrumb navigation automatically appears on dashboard pages, providing:
- **Clear navigation path**: Shows Home → Dashboard Name
- **Quick navigation**: Click on any breadcrumb to navigate
- **Back button**: Optional back button for quick return to homepage
- **Consistent design**: Uses Splunk UI components for native look and feel

## Features

### Automatic Display
Breadcrumbs automatically appear on dashboard pages and are hidden on the homepage.

### Navigation Path
The breadcrumb trail shows:
```
Home → Dashboard Name
```

Where:
- **Home** - Links back to the dashboard homepage
- **Dashboard Name** - Current dashboard (non-clickable)

### Back Button
An optional back button appears before the breadcrumbs, providing a quick way to return to the homepage.

## Configuration

### Enable/Disable Breadcrumbs

Breadcrumbs are enabled by default. To disable:

```bash
# Disable breadcrumbs entirely
NEXT_PUBLIC_DASHPUBBREADCRUMBS=false
```

### Show/Hide Back Button

To keep breadcrumbs but hide the back button:

```bash
# Hide back button
NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON=false
```

### Docker Configuration

When using Docker, use the `DASHPUB_*` prefix:

```bash
DASHPUB_BREADCRUMBS=true
DASHPUB_BREADCRUMBS_BACK_BUTTON=true
```

## Implementation Details

### Component Structure

The breadcrumb component uses:
- **Splunk UI Breadcrumbs** - Official Splunk UI component
- **Splunk UI Button** - For the back button
- **React Router** - For navigation
- **Styled Components** - For theming

### Theme Integration

Breadcrumbs automatically adapt to your theme:
- Uses Splunk theme variables for colors
- Matches dashboard theme (light/dark)
- Responsive design for mobile devices

## Usage Examples

### Default Behavior

By default, breadcrumbs are shown on all dashboard pages:

```jsx
<Page title="My Dashboard">
  {/* Breadcrumbs automatically appear */}
  <DashboardComponent />
</Page>
```

### Disable on Specific Page

To disable breadcrumbs on a specific page:

```jsx
<Page title="My Dashboard" showBreadcrumbs={false}>
  <DashboardComponent />
</Page>
```

### Custom Configuration

The breadcrumb configuration is available via the `/api/config` endpoint:

```bash
curl http://localhost:3000/api/config
```

Response includes:
```json
{
  "breadcrumbs": {
    "enabled": true,
    "showBackButton": true
  }
}
```

## Best Practices

1. **Keep breadcrumbs enabled** - They improve navigation and user experience
2. **Use descriptive dashboard titles** - Breadcrumbs show the dashboard title
3. **Test on mobile** - Breadcrumbs are responsive and work on all devices
4. **Consider kiosk mode** - You may want to disable breadcrumbs for kiosk displays

## Troubleshooting

### Breadcrumbs Not Showing

1. Check configuration:
   ```bash
   curl http://localhost:3000/api/config | jq .breadcrumbs
   ```

2. Verify environment variables are set correctly

3. Check browser console for errors

4. Ensure you're on a dashboard page (not homepage)

### Back Button Not Appearing

1. Verify `NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON` is not set to `false`
2. Check that you're on a dashboard page (not homepage)
3. Verify the config endpoint shows `showBackButton: true`

## Related Documentation

- [Configuration Guide](../configuration/)
- [Loading States](loading/)
- [Dashboard System](dashboards/)

