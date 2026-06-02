---
layout: default
title: Loading States
parent: Features
nav_order: 6
---

# Loading States

Dashpub uses Splunk UI's `WaitSpinner` component for consistent and professional loading experiences across all dashboard pages.

## Overview

The loading system provides:
- **Consistent Design**: Uses Splunk's official UI components
- **Size Variants**: Small, medium, and large spinner sizes
- **Contextual Messages**: Appropriate loading messages based on operation type
- **Performance**: Lazy-loaded for optimal bundle size

## Features

### Splunk WaitSpinner

The application uses `@splunk/react-ui/WaitSpinner` for all loading states, ensuring:
- Native Splunk look and feel
- Consistent with Splunk Enterprise UI
- Professional appearance
- Theme-aware (light/dark mode support)

### Size Variants

Three size options are available:

```jsx
<Loading size="small" />   // Small spinner
<Loading size="medium" />   // Medium spinner (default)
<Loading size="large" />   // Large spinner
```

### Loading Types

Different loading types show appropriate messages:

- **default** - "Loading Splunk Dashboard..."
- **searching** - "Executing Splunk search..."
- **processing** - "Processing search results..."
- **rendering** - "Rendering dashboard..."
- **connecting** - "Connecting to Splunk..."
- **error** - "An error occurred. Retrying..."

## Usage

### Basic Usage

```jsx
import Loading from '../components/Loading';

function MyComponent() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <Loading />;
  }
  
  return <DashboardContent />;
}
```

### With Custom Message

```jsx
<Loading 
  type="searching"
  message="Fetching dashboard data..."
/>
```

### With Size Variant

```jsx
<Loading 
  size="large"
  type="rendering"
/>
```

## Implementation

### Component Structure

The Loading component:
- Lazy loads WaitSpinner for performance
- Uses styled-components for layout
- Integrates with Splunk theme variables
- Provides fallback for loading states

### Performance Optimization

- **Lazy Loading**: WaitSpinner is lazy-loaded to reduce initial bundle size
- **Code Splitting**: Only loads when needed
- **Minimal Re-renders**: Optimized for performance

## Customization

### Custom Loading Messages

You can provide custom messages:

```jsx
<Loading 
  message="Loading your dashboard..."
  type="default"
/>
```

### Loading States in Components

Components automatically show loading states:

```jsx
// DashboardPage automatically shows loading
if (loading) {
  return <Loading />;
}
```

## Best Practices

1. **Use appropriate types** - Match the loading type to the operation
2. **Show loading early** - Display loading state as soon as operation starts
3. **Provide context** - Use descriptive messages when possible
4. **Handle errors** - Show error states appropriately

## Related Documentation

- [Dashboard System](dashboards/)
- [Breadcrumb Navigation](breadcrumbs/)
- [Developer Guide](../development/)

