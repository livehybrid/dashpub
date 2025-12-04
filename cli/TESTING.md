# Testing Guide for DashPub Template

This guide explains how to test the DashPub template app locally using a stub Splunk service.

## 🚀 Quick Start

### 1. Start the Stub Splunk Service

```bash
npm run test:splunk
```

This starts a mock Splunk service on `http://localhost:8089` that provides:
- Mock apps and dashboards
- Search endpoints that return test data
- No external dependencies

### 2. Test the Template App

```bash
npm run test:template
```

This script:
- Creates a test app directory
- Sets up test dashboards
- Builds the template app
- Configures it to use the stub service

### 3. Run the Test App

```bash
cd test-template-app
npm run start
```

The app will be available at `http://localhost:3000`

## 🔧 Manual Testing

### Start Stub Service Manually

```bash
node cli/test-splunk.js
```

### Environment Variables for Testing

```bash
export SPLUNKD_URL=http://localhost:8089
export SPLUNKD_USER=admin
export SPLUNKD_PASSWORD=changeme
export DASHPUB_APP=search
export DASHPUB_DASHBOARDS=test_dashboard,sample_dashboard
export DASHPUB_SCREENSHOTS=true
export DASHPUB_SCREENSHOT_DIR=screenshots
export DASHPUB_SCREENSHOT_EXT=png
```

### Test with DashPub CLI

```bash
# Set environment variables above, then:
dashpub init
cd app
npm install
npm run build
npm run start
```

## 📊 Test Data

### Available Apps
- `search` - Default search app
- `test` - Test application

### Available Dashboards
- `test_dashboard` - Test dashboard with log data
- `sample_dashboard` - Sample dashboard with user actions
- `dev_dashboard` - Development dashboard

### Mock Search Results

#### test_dashboard
```json
{
  "results": [
    { "_time": "2024-01-01T00:00:00Z", "host": "test-host-1", "source": "test.log", "message": "Test log message 1" },
    { "_time": "2024-01-01T00:01:00Z", "host": "test-host-2", "source": "test.log", "message": "Test log message 2" },
    { "_time": "2024-01-01T00:02:00Z", "host": "test-host-3", "source": "test.log", "message": "Test log message 3" }
  ]
}
```

#### sample_dashboard
```json
{
  "results": [
    { "_time": "2024-01-01T00:00:00Z", "user": "admin", "action": "login", "status": "success" },
    { "_time": "2024-01-01T00:01:00Z", "user": "user1", "action": "search", "status": "success" },
    { "_time": "2024-01-01T00:02:00Z", "user": "user2", "action": "logout", "status": "success" }
  ]
}
```

## 🌐 Stub Service Endpoints

### Server Info
- `GET /services/server/info` - Returns mock Splunk version info

### Apps
- `GET /services/apps/local` - Returns available apps

### Dashboards
- `GET /servicesNS/-/{app}/data/ui/views` - Returns dashboards for an app

### Search
- `POST /services/search/jobs` - Creates a search job
- `GET /services/search/jobs/{id}/` - Returns search status
- `GET /services/search/jobs/{id}/results` - Returns search results

## 🧪 Testing Scenarios

### 1. Basic Dashboard Display
- Verify dashboards load without errors
- Check that dashboard titles and descriptions display
- Ensure tags are shown correctly

### 2. Search Functionality
- Test that search queries work
- Verify search results display
- Check search status updates

### 3. Screenshot Support
- Confirm screenshot configuration is loaded
- Test screenshot directory serving
- Verify screenshot display in dashboard cards

### 4. Responsive Design
- Test on different screen sizes
- Verify mobile layout works
- Check dashboard card layouts

### 5. Error Handling
- Test with invalid search queries
- Verify error messages display
- Check fallback behavior

## 🔍 Debugging

### Check Stub Service Logs
```bash
npm run test:splunk
# Look for request logs in the console
```

### Check Test App Logs
```bash
cd test-template-app
npm run start
# Check console for any errors
```

### Verify Configuration
- Check `src/config.js` exists and has correct values
- Verify `.env` file has proper Splunk connection details
- Ensure `package.json` has correct dashboard definitions

## 🚨 Troubleshooting

### Stub Service Won't Start
- Check if port 8089 is already in use
- Verify Node.js version (requires 18+)
- Check for syntax errors in test-splunk.js

### Template App Won't Build
- Ensure all dependencies are installed
- Check for missing environment variables
- Verify template directory structure

### Dashboards Don't Load
- Confirm stub service is running
- Check network requests in browser dev tools
- Verify dashboard names match stub service data

### Screenshots Don't Display
- Check screenshot directory exists
- Verify screenshot configuration in config.js
- Ensure static file serving is working

## 📝 Customization

### Add More Test Dashboards
Edit `cli/test-splunk.js` and add to `MOCK_DASHBOARDS`:

```javascript
const MOCK_DASHBOARDS = {
    'search': [
        // ... existing dashboards
        {
            name: 'custom_dashboard',
            label: 'Custom Dashboard',
            description: 'A custom test dashboard',
            tags: ['custom', 'test']
        }
    ]
};
```

### Add More Test Data
Edit `cli/test-splunk.js` and add to `MOCK_SEARCH_RESULTS`:

```javascript
const MOCK_SEARCH_RESULTS = {
    // ... existing results
    'custom_dashboard': {
        results: [
            { _time: '2024-01-01T00:00:00Z', field1: 'value1', field2: 'value2' }
        ],
        fields: ['_time', 'field1', 'field2'],
        preview: true
    }
};
```

### Change Test Port
```bash
export SPLUNK_TEST_PORT=9090
npm run test:splunk
```

## 🎯 Benefits of This Testing Approach

1. **No External Dependencies** - Everything runs locally
2. **Fast Testing** - No network delays or timeouts
3. **Predictable Data** - Consistent test results
4. **Easy Debugging** - Full control over responses
5. **CI/CD Friendly** - Can run in automated environments
6. **Realistic Testing** - Mimics actual Splunk API behavior

## 🔄 Next Steps

- Add more test scenarios
- Implement authentication testing
- Add performance testing
- Create integration tests
- Add screenshot testing automation

