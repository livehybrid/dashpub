[![GitHub Release](https://img.shields.io/github/release/livehybrid/dashpub.svg?logo=github)](https://github.com/livehybrid/dashpub/releases)
[![Docker Downloads](https://img.shields.io/docker/pulls/livehybrid/splunk-dashpub?logo=docker&label=docker%20pulls%20%2F%20livehybrid/splunk-dashpub)](https://hub.docker.com/r/livehybrid/splunk-dashpub)
[![Documentation](https://img.shields.io/badge/docs-github%20pages-blue)](https://livehybrid.github.io/dashpub/)

# Splunk Dashboard System

A modern, high-performance dashboard system built with Node.js, Express, React, and Vite, designed to display Splunk data with real-time updates, caching, and comprehensive visualization support.  
5 years on from the original dashpub CLI tool, the project has now been re-written to bring loads of new features and faster more responsive experience, including in-built caching and tab rotations.

## 📊 Feature Comparison
Recent Splunk Enterprise and Splunk Cloud releases have included the ability to publish dashboards which is amazing news. This project is still being maintained to fill any remaining gaps and provide additional functionality that is not yet in the Splunk core offering.  
For more information on Splunk's dashboard publishing check out 
https://help.splunk.com/en/splunk-cloud-platform/create-dashboards-and-reports/dashboard-studio/9.3.2411/share-dashboard-content/publish-dashboards  
Check out the table below for a feature comparison between in-built vs dashpub. Some use-cases may find the scheduled export within Splunk is sufficient however this provides a different set of features as detailed below.  

| Feature | Splunk Enterprise | This Project | Notes |
|---------|------------------|--------------|-------|
| **Compatibility** | ✅ Splunk Enterprise/Cloud | ✅ Splunk Enterprise/Cloud | O11y coming soon |
| **Dashboard Experience** | ✅ Built-in Dashboard Studio | ✅ Splunk React Frameworks | Uses official Splunk framework |
| **High Level View** | ❌ No high level overview of all dashboards published | ✅ Homepage containing list of all dashboards available |  |
| **On-Demand Data** | ❌ Dashboard must be scheduled to run | ✅ On-Demand with caching | Enhanced with intelligent caching |
| **Authentication** | ❌ Published dashboards are available without auth | ✅ Optional fixed user/pass auth available | More flexible auth options |
| **Segregation** | ❌ Exposes URL of your Splunk deployment | ✅ Hosted separately to your Splunk Instance| Protects your Splunk Deployment endpoints |
| **Tab Rotation** | ❌ Not available | ✅ Automatic tab rotation | Unique feature for kiosk/wall displays |
| **Performance Caching** | ✅ Pre-populated caching | ✅ caching on first-access | TTL set per datasource using refresh option |
| **Built-in** | ✅ No additional deployment required | ❌ Additional deployment required | Host alongside your Splunk Deployment |
| **Cost** | ✅ Part of Splunk license | ✅ Open source | No licensing costs |
| **Custom Visualizations** | ❌ No custom viz suport | ✅ Support for custom viz | Complete customization freedom |
| **Screenshot Generation** | ❌ Manual API call required | ✅ Automated screenshots using dashpub-plus | For high level thumbnail overview and URL unfurling |
| **Rate Limiting** | ❌ Basic | ✅ Advanced IP-based limiting | Better protection against abuse |
| **Scalability** | ❌ User still hit Splunk endpoints | ✅ Caching provides air-gap between dashboards and Splunk infra. | Repeated page requests do not cause concurrent/repeated Splunk calls due to in-built cache - Better for high-traffic or public-facing scenarios |



## 🏗️ Architecture Overview

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Vite Dev       │    │   Express       │
│   (React)       │◄──►│   Server         │◄──►│   Server        │
│   Port 5173     │    │   Port 5173      │    │   Port 3000     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                       │
                                │                       │
                                ▼                       ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   API Proxy      │    │   Splunk        │
                       │   (Vite)         │    │   Enterprise    │
                       └──────────────────┘    └─────────────────┘
```

### Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + Vite 6
- **Dashboard Engine**: @splunk/dashboard-core
- **Visualizations**: @splunk/visualizations
- **Data Sources**: Custom CDN + Test data sources
- **Build System**: Vite with Node.js polyfills
- **Caching**: In-memory with TTL and cleanup

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- Access to Splunk Enterprise instance

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Splunk configuration
```

### Environment Configuration

```bash
# Splunk Connection
SPLUNK_HOST=192.168.0.222
SPLUNK_PORT=8089
SPLUNK_USERNAME=admin
SPLUNK_PASSWORD=your_password
SPLUNK_APP=etyd

# Server Configuration
PORT=3000
NODE_ENV=development

# Caching
CACHE_CLEANUP_INTERVAL=300
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000  # Increased default for dashboard reloads
MAX_RETRIES=3
```

### Running the Application

#### Development Mode (Recommended)
```bash
# Run both backend and frontend with hot reload
npm run dev:full

# Or run separately:
# Terminal 1: Backend server
npm run server

# Terminal 2: Frontend dev server
npm run dev
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm run start
```

## 📊 Dashboard System

### Dashboard Structure

```
src/
├── _dashboards.json              # Dashboard metadata
├── dashboards/
│   ├── highlevel/
│   │   └── definition.json      # Dashboard definition
│   ├── splunk_answers/
│   │   └── definition.json      # Dashboard definition
│   └── [dashboard-id]/
│       └── definition.json      # Dashboard definition
```

### Dashboard Definition Format

```json
{
  "id": "highlevel",
  "title": "High Level Overview",
  "description": "System overview dashboard",
  "tags": ["overview", "system"],
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
      "id": "chart1",
      "type": "splunk.line",
      "dataSource": "dsid1",
      "position": { "row": 0, "column": 0 }
    }
  ]
}
```

### Dashboard Metadata (_dashboards.json)

```json
{
  "highlevel": {
    "title": "High Level Overview",
    "description": "System overview dashboard",
    "tags": ["overview", "system"]
  },
  "splunk_answers": {
    "title": "Splunk Answers",
    "description": "Q&A dashboard",
    "tags": ["qa", "support"]
  }
}
```

## 🔄 Tab Rotation System

### Overview

The dashboard system includes an automatic tab rotation feature that cycles through dashboard tabs at configurable intervals. This is particularly useful for displaying dashboards on monitors or in kiosk mode.

### Features

- **Automatic Detection**: Automatically detects dashboards with multiple tabs
- **Configurable Intervals**: Set rotation speed via environment variable
- **Multiple Switching Strategies**: Uses various methods to ensure reliable tab switching
- **User Controls**: Pause/resume and manual navigation controls
- **Visual Feedback**: Status indicator showing current tab and rotation state
- **Mobile Optimization**: Auto-collapse after 3 seconds for mobile devices

### Configuration

Set the rotation interval using the `REACT_APP_TAB_ROTATION_INTERVAL` environment variable:

```bash
# 5 seconds (fast rotation)
REACT_APP_TAB_ROTATION_INTERVAL=5000

# 15 seconds (default)
REACT_APP_TAB_ROTATION_INTERVAL=15000

# 30 seconds (slow rotation)
REACT_APP_TAB_ROTATION_INTERVAL=30000
```

**Default**: 15000ms (15 seconds)  
**Minimum**: 1000ms (1 second)  
**Format**: Integer value in milliseconds

### Usage

The feature automatically activates for dashboards with multiple tabs defined in their `layout.tabs.items` array. No additional configuration is required beyond setting the environment variable.

For detailed documentation, see [TAB_ROTATION_FEATURE.md](docs/TAB_ROTATION_FEATURE.md).

## 🎨 User Interface Enhancements

### Loading Experience

The application uses Splunk UI's `WaitSpinner` component for a consistent and professional loading experience across all dashboard pages. The loading spinner:

- **Consistent Design**: Uses Splunk's official UI components for a native look and feel
- **Size Variants**: Supports small, medium, and large spinner sizes
- **Contextual Messages**: Displays appropriate loading messages based on the operation type
- **Performance**: Lazy-loaded for optimal bundle size

### Breadcrumb Navigation

Dashboard pages include breadcrumb navigation to improve user orientation and navigation:

- **Automatic Display**: Breadcrumbs automatically appear on dashboard pages (hidden on homepage)
- **Navigation Path**: Shows the path from Home → Dashboard Name
- **Back Button**: Optional back button for quick navigation to the homepage
- **Configurable**: Can be enabled/disabled via environment variables

#### Configuration

Breadcrumbs are enabled by default. To customize:

```bash
# Disable breadcrumbs entirely
NEXT_PUBLIC_DASHPUBBREADCRUMBS=false

# Keep breadcrumbs but hide the back button
NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON=false
```

The breadcrumb component uses Splunk UI's `Breadcrumbs` component and integrates seamlessly with the dashboard theme.

## 🔄 Caching System

### Overview

The system implements a sophisticated multi-level caching strategy to optimize performance and reduce Splunk API calls.

### Cache Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client        │    │   Express        │    │   Splunk        │
│   Request       │───►│   Cache Layer    │───►│   Enterprise    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Memory Cache   │
                       │   (TTL-based)    │
                       └──────────────────┘
```

### Cache Implementation

#### 1. In-Memory Cache Store

```javascript
// Cache structure
const cache = new Map();

// Cache entry format
{
  data: <response_data>,
  timestamp: Date.now(),
  ttl: 300000, // 5 minutes in milliseconds
  hits: 0,
  lastAccessed: Date.now()
}
```

#### 2. Cache Key Generation

```javascript
// Cache key format: `type:identifier:parameters`
const cacheKey = `datasource:${dsid}:${JSON.stringify(params)}`;
const cacheKey = `dashboard:${dashboardId}:${version}`;
```

#### 3. TTL (Time To Live) Strategy

```javascript
// Different TTLs for different data types
const TTL_STRATEGIES = {
  'datasource': 300000,      // 5 minutes
  'dashboard': 3600000,      // 1 hour
  'saved_search': 1800000,   // 30 minutes
  'user_preference': 86400000 // 24 hours
};
```

#### 4. Cache Cleanup

```javascript
// Automatic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, 300000);
```

### Cache Benefits

- **Performance**: 90%+ reduction in response time for cached data
- **Cost Reduction**: Minimizes Splunk API calls and license usage
- **Scalability**: Handles high concurrent user loads efficiently
- **User Experience**: Faster dashboard loading and data refresh

### Cache Statistics

```javascript
// Cache metrics available via API
GET /api/cache/stats
{
  "totalEntries": 156,
  "memoryUsage": "45.2 MB",
  "hitRate": 0.87,
  "missRate": 0.13,
  "evictions": 23,
  "lastCleanup": "2024-01-15T10:30:00Z"
}
```

## 🔌 API Endpoints

### Dashboard Management

```http
# Get all dashboards
GET /api/dashboards

# Get dashboard definition
GET /api/dashboards/:id/definition

# Get dashboard list with metadata
GET /api/dashboards/list
```

### Data Sources

```http
# Get data from specific datasource
GET /api/data/:dsid

# Get datasource metadata
GET /api/datasources/:dsid

# Search datasources
# Removed: /api/datasources/search endpoint (security risk - not implemented)
```

### Caching

```http
# Get cache statistics
GET /api/cache/stats

# Clear specific cache entry
DELETE /api/cache/:key

# Clear all cache
DELETE /api/cache/clear
```

### Health & Monitoring

```http
# Health check
GET /health

# Server status
GET /api/status

# Splunk connection test
GET /api/splunk/test
```

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Main dashboard renderer
│   ├── home.jsx               # Dashboard list
│   ├── login.jsx              # Authentication
│   └── maplibreCSSLoader.js   # CSS loader for maps
├── pages/
│   ├── DashboardPage.jsx      # Individual dashboard page
│   └── HomePage.jsx           # Home page
├── preset.js                  # Splunk dashboard presets
└── main.jsx                   # Application entry point
```

### Routing

```javascript
// React Router configuration
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/:dashboard" element={<DashboardPage />} />
  <Route path="*" element={<Custom404 />} />
</Routes>
```

### State Management

- **React Hooks**: useState, useEffect for local state
- **Context API**: For global state (user authentication, theme)
- **API Integration**: Fetch API with error handling and loading states

## 🔧 Development Workflow

### Hot Reload Setup

```javascript
// Vite configuration for development
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

### Node.js Polyfills

```javascript
// Handle Node.js modules in browser
import { nodePolyfills } from 'vite-plugin-node-polyfills';

plugins: [
  nodePolyfills({
    globals: {
      Buffer: true,
      global: true,
      process: true,
    },
    overrides: {
      fs: false,
      net: false,
      tls: false,
    }
  })
]
```

### CSS Import Handling

```javascript
// Mock problematic CSS imports
const cssMockPlugin = () => ({
  name: 'css-mock',
  resolveId(id) {
    if (id.endsWith('.css') && id.includes('maplibre-gl')) {
      return id;
    }
    return null;
  },
  load(id) {
    if (id.endsWith('.css') && id.includes('maplibre-gl')) {
      return '/* Mock CSS file for maplibre-gl */';
    }
    return null;
  }
});
```

## 📈 Performance Optimization

### Frontend Optimization

- **Code Splitting**: Automatic chunking by Vite
- **Tree Shaking**: Unused code elimination
- **Lazy Loading**: Dynamic imports for dashboard components
- **Asset Optimization**: CSS/JS minification and compression

### Backend Optimization

- **Connection Pooling**: Reuse Splunk connections
- **Request Batching**: Combine multiple API calls
- **Response Compression**: Gzip compression for large datasets
- **Memory Management**: Efficient cache eviction strategies

### Caching Strategies

1. **Write-Through**: Cache updated immediately when data changes
2. **Write-Behind**: Cache updated asynchronously for better performance
3. **TTL-based**: Automatic expiration based on data freshness requirements
4. **LRU Eviction**: Least Recently Used items removed when cache is full

## 🔒 Security Features

### Authentication

```javascript
// JWT-based authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

### Rate Limiting

```javascript
// IP-based rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

### Input Validation

```javascript
// Sanitize user inputs
const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};
```

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- --grep "dashboard"
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Test API endpoints
npm run test:api
```

### Performance Tests

```bash
# Load testing
npm run test:load

# Memory leak testing
npm run test:memory
```

## 📊 Monitoring & Logging

### Logging Strategy

```javascript
// Structured logging with different levels
logger.info('Dashboard loaded', {
  dashboardId: 'highlevel',
  loadTime: 245,
  userId: 'user123',
  timestamp: new Date().toISOString()
});
```

### Metrics Collection

- **Response Times**: API endpoint performance tracking
- **Cache Hit Rates**: Cache effectiveness monitoring
- **Error Rates**: System reliability metrics
- **Resource Usage**: Memory and CPU utilization

### Health Checks

```javascript
// Comprehensive health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: cache.size,
    splunk: splunkConnectionStatus
  };
  
  res.json(health);
});
```

## 🚀 Deployment

### Production Build

```bash
# Build frontend assets
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

#### Core Application Settings
```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Splunk Connection
SPLUNKD_URL=https://your-splunk-instance:8089
SPLUNKD_USER=admin
SPLUNKD_PASSWORD=your_password
SPLUNKD_TOKEN=your_api_token
SPLUNKD_UI_PORT=8000  # Port for Splunk UI (default: 8000). Used when building dashboards to fetch static assets.
SPLUNKD_LOCALE=en-US  # Locale for Splunk UI (default: en-US). Used when constructing URLs for static assets (e.g., /en-US/static/...). Only needed if your Splunk instance uses a different locale.

# Performance & Caching
CACHE_CLEANUP_INTERVAL=300
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000  # Increased default for dashboard reloads
MAX_RETRIES=3
SEARCH_JOB_DELAY_MS=250
MIN_REFRESH_TIME=60
```

#### Authentication & Security
```bash
# JWT Authentication
JWT_REQUIRED=false
JWT_KEY=your-secret-key-here
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_USERNAME=admin
JWT_PASSWORD=your_password
API_KEY_HEADER=X-API-Key
```

#### Dashboard Configuration
```bash
# Dashboard Display Settings
NEXT_PUBLIC_DASHPUBTITLE=My Dashboards
NEXT_PUBLIC_HOMETHEME=light
NEXT_PUBLIC_DASHPUBFOOTER=Hosted Splunk Dashboards
NEXT_PUBLIC_DASHPUBHOSTEDBY=Your Company
NEXT_PUBLIC_DASHPUBHOSTEDURL=https://yourcompany.com
NEXT_PUBLIC_DASHPUBREPO=https://github.com/yourusername/dashpub

# Screenshot Configuration
NEXT_PUBLIC_DASHPUBSCREENSHOTS=false  # Enable screenshots to display dashboard thumbnails
NEXT_PUBLIC_BASE_SCREENSHOT_URL=  # Base URL where screenshots are hosted (optional, uses relative paths if empty)
NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=screenshots  # Screenshot directory name (default: screenshots)
NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=png  # Screenshot file extension (default: png)

# Breadcrumb Navigation
NEXT_PUBLIC_DASHPUBBREADCRUMBS=true  # Enable breadcrumb navigation at top of dashboard pages (default: true)
NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON=true  # Show back button in breadcrumb navigation (default: true)

# Tab Rotation Settings (Runtime Configuration)
REACT_APP_TAB_ROTATION_INTERVAL=15000  # Rotation interval in milliseconds
REACT_APP_TAB_ROTATION_ENABLED=true    # Enable/disable tab rotation
```

#### Logging & Monitoring
```bash
# Logging Configuration
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
LOG_DIR=./logs
LOG_RETENTION_DAYS=30

# Splunk HEC (HTTP Event Collector)
SPLUNK_HEC_ENABLED=false
SPLUNK_HEC_URL=https://your-splunk-instance:8088/services/collector
SPLUNK_HEC_TOKEN=your-hec-token-here
SPLUNK_HEC_INDEX=main
SPLUNK_HEC_SOURCE=dashpub
SPLUNK_HEC_SOURCETYPE=dashpub:app:logs
SPLUNK_HEC_HOST=your-hostname
SPLUNK_HEC_BATCH_SIZE=100
SPLUNK_HEC_BATCH_TIMEOUT=5000
SPLUNK_HEC_MAX_RETRIES=3
SPLUNK_HEC_RETRY_DELAY=1000
```

#### Development & Build
```bash
# Build Configuration
DASHPUB_BUILD_ID=dev  # Version identifier for browser caching
USE_DATA_SNAPSHOTS=false  # Use snapshot data for development

# Vercel Deployment (auto-set by Vercel)
VERCEL_URL=your-app.vercel.app
```

#### Deprecated Variables
The following variables are deprecated and should not be used in new deployments:
- `SPLUNK_USERNAME` → Use `SPLUNKD_USER` instead
- `SPLUNK_PASSWORD` → Use `SPLUNKD_PASSWORD` instead
- `SPLUNK_APP` → Configure via dashboard definitions instead

#### Unused Variables
The following variables are documented in some examples but are not actually used by the application:
- `SPLUNK_HOST` → Use `SPLUNKD_URL` instead (includes host and port)
- `SPLUNK_PORT` → Use `SPLUNKD_URL` instead (includes host and port)

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000 and 5173 are available
2. **Splunk Connection**: Verify credentials and network connectivity
3. **Cache Issues**: Check memory usage and TTL settings
4. **Build Errors**: Clear node_modules and reinstall dependencies

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev:full

# Check server logs
tail -f logs/server.log

# Monitor cache performance
curl http://localhost:3000/api/cache/stats
```

### Performance Tuning

```javascript
// Adjust cache TTL based on data volatility
const TTL_STRATEGIES = {
  'real-time': 30000,      // 30 seconds for live data
  'hourly': 300000,        // 5 minutes for hourly data
  'daily': 3600000,        // 1 hour for daily data
  'static': 86400000       // 24 hours for static data
};
```

## 📚 Documentation

Comprehensive documentation is available at:
- **[Full Documentation](https://livehybrid.github.io/dashpub/)** - Complete guides, API reference, and tutorials
- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [API Documentation](docs/api/)
- [Development Guide](docs/development/)

## 📚 Additional Resources

- [Splunk Dashboard SDK Documentation](https://splunk.github.io/dashboard-sdk/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practices-performance.html)
- [Vite Configuration Guide](https://vitejs.dev/config/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
