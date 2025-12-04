# Automatic Tab Rotation Feature

## Overview

The Automatic Tab Rotation feature automatically rotates through dashboard tabs at configurable intervals for dashboards that have multiple tabs. This feature is particularly useful for displaying dashboards on monitors or in kiosk mode where you want to cycle through different views automatically.

## Configuration

### Environment Variable

The tab rotation interval can be configured using the `REACT_APP_TAB_ROTATION_INTERVAL` environment variable:

```bash
# Set rotation interval to 10 seconds (10000 milliseconds)
REACT_APP_TAB_ROTATION_INTERVAL=10000

# Set rotation interval to 30 seconds (30000 milliseconds)
REACT_APP_TAB_ROTATION_INTERVAL=30000

# Set rotation interval to 2 minutes (120000 milliseconds)
REACT_APP_TAB_ROTATION_INTERVAL=120000
```

**Default Value**: 15000 milliseconds (15 seconds)

**Minimum Value**: 1000 milliseconds (1 second)

**Format**: Integer value in milliseconds

### Configuration Validation

The system includes built-in validation for the environment variable:

- **Invalid values** (non-numeric, negative, or zero): Falls back to default (15 seconds)
- **Values below 1 second**: Automatically adjusted to 1 second minimum
- **Values above 5 minutes**: Warning logged but allowed
- **Missing variable**: Uses default value (15 seconds)

## How It Works

### Detection
The feature automatically detects dashboards with multiple tabs by checking the `layout.tabs.items` array in the dashboard definition. If a dashboard has more than one tab, the rotation feature is activated.

### Tab Structure
Dashboards with multiple tabs have the following structure in their definition:
```json
{
  "layout": {
    "tabs": {
      "items": [
        {
          "layoutId": "layout_1",
          "label": "Tab 1"
        },
        {
          "layoutId": "layout_2", 
          "label": "Tab 2"
        }
      ]
    },
    "layoutDefinitions": {
      "layout_1": { /* tab 1 content */ },
      "layout_2": { /* tab 2 content */ }
    }
  }
}
```

### Rotation Mechanism
The feature uses multiple strategies to detect and switch tabs:

1. **Direct Element Detection**: Looks for standard tab elements (`[role="tab"]`, `.tab`, etc.)
2. **Splunk-Specific Elements**: Searches for Splunk Dashboard framework tab elements
3. **Navigation Elements**: Finds navigation elements (`.nav-tabs a`, `.nav-link`, etc.)
4. **Label Matching**: Matches tab elements by their text content or aria-label
5. **Custom Events**: Dispatches `switchtotab` events for framework integration
6. **API Integration**: Attempts to use Splunk Dashboard framework APIs

### User Interface
When active, the feature displays a control panel in the top-right corner showing:
- Current tab number and total tabs
- Current tab label
- Rotation interval (formatted for readability)
- Rotation status (Ready, Rotating, Paused, etc.)
- Control buttons (Start/Pause, Next)

## Implementation

### Components

#### SplunkTabRotatorAdvanced.jsx
The main component that handles tab rotation logic:
- Detects multi-tab dashboards
- Implements multiple tab-switching strategies
- Provides user controls
- Manages rotation timing

#### tabRotationConfig.js
Utility module for configuration management:
- Parses environment variables
- Validates configuration values
- Provides formatted display functions
- Handles error cases gracefully

#### Integration with Dashboard.jsx
The tab rotator is integrated into the main Dashboard component and automatically activates for dashboards with multiple tabs.

### Configuration Options

```jsx
<SplunkTabRotatorAdvanced 
  definition={dashboardDefinition}
  enabled={true}                    // Enable/disable rotation
  rotationInterval={getTabRotationInterval()}  // Uses environment variable
  showControls={true}               // Show/hide control panel
/>
```

## Usage

### Setting Environment Variables

#### Development
Create a `.env` file in the app directory:
```bash
# .env
REACT_APP_TAB_ROTATION_INTERVAL=10000
```

#### Production
Set the environment variable in your deployment environment:
```bash
# Docker
docker run -e REACT_APP_TAB_ROTATION_INTERVAL=20000 your-app

# Vercel
vercel env add REACT_APP_TAB_ROTATION_INTERVAL

# Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashpub-config
data:
  REACT_APP_TAB_ROTATION_INTERVAL: "30000"
```

### Automatic Activation
The feature automatically activates for any dashboard with multiple tabs. No configuration is required beyond setting the environment variable.

### Manual Control
Users can:
- **Pause/Resume**: Click the "Pause" or "Start" button to stop/start rotation
- **Manual Navigation**: Click "Next" to manually advance to the next tab
- **Status Monitoring**: View the current tab, rotation status, and interval

### Dashboard Requirements
For the feature to work properly, dashboards must:
1. Have multiple tabs defined in the `layout.tabs.items` array
2. Use the Splunk Dashboard framework for rendering
3. Have tab elements that can be detected by the rotation logic

## Example Configurations

### Fast Rotation (5 seconds)
```bash
REACT_APP_TAB_ROTATION_INTERVAL=5000
```

### Standard Rotation (15 seconds) - Default
```bash
REACT_APP_TAB_ROTATION_INTERVAL=15000
```

### Slow Rotation (1 minute)
```bash
REACT_APP_TAB_ROTATION_INTERVAL=60000
```

### Very Slow Rotation (5 minutes)
```bash
REACT_APP_TAB_ROTATION_INTERVAL=300000
```

## Example Dashboards

### conf_registrations
This dashboard has two tabs:
- **Tab 1**: "Tab 1" - Shows registration data
- **Tab 2**: "Tab Numero 2" - Shows additional registration metrics

The rotation feature will automatically cycle between these tabs at the configured interval.

## Troubleshooting

### Common Issues

1. **Tabs Not Detected**
   - Check that the dashboard definition has `layout.tabs.items` with multiple items
   - Verify the dashboard is using the Splunk Dashboard framework
   - Check browser console for detection errors

2. **Tabs Not Switching**
   - The rotation feature uses multiple strategies to switch tabs
   - If one method fails, it automatically tries alternative approaches
   - Check browser console for switching method results

3. **Control Panel Not Visible**
   - Ensure the dashboard has multiple tabs
   - Check that the feature is enabled
   - Verify the dashboard is fully loaded

4. **Interval Not Applied**
   - Check that `REACT_APP_TAB_ROTATION_INTERVAL` is set correctly
   - Verify the value is a positive integer in milliseconds
   - Check browser console for validation warnings

### Debug Information
The feature provides detailed console logging:
- `📋 SplunkTabRotatorAdvanced: Found X tabs` - Tab detection
- `✅ Tab rotation interval set to: Xms (Xs)` - Configuration loading
- `🔄 SplunkTabRotatorAdvanced: Attempting to switch to tab X` - Tab switching attempts
- `✅ SplunkTabRotatorAdvanced: Successfully switched to tab X` - Successful switches
- `⚠️ SplunkTabRotatorAdvanced: Could not switch to tab X` - Failed switches
- `⚠️ Invalid REACT_APP_TAB_ROTATION_INTERVAL value` - Configuration validation warnings

## Technical Details

### Browser Compatibility
- Works with modern browsers that support ES6+ features
- Requires React 16.8+ for hooks
- Compatible with Splunk Dashboard framework

### Performance
- Minimal performance impact
- Rotation only activates for multi-tab dashboards
- Automatic cleanup on component unmount
- Configurable intervals prevent excessive switching

### Security
- No external dependencies
- Uses standard DOM APIs
- No data transmission outside the application
- Environment variables are validated and sanitized

## Future Enhancements

Potential improvements could include:
- Per-dashboard rotation intervals
- Pause on hover functionality
- Custom transition animations
- Integration with dashboard themes
- Analytics for tab usage patterns
- Dynamic interval adjustment based on content complexity