# Developer Quick Reference Guide

## 🚀 Quick Start Commands

```bash
# Development mode (recommended)
npm run dev:full

# Separate servers
npm run server    # Backend (port 3000)
npm run dev       # Frontend (port 5173)

# Production
npm run build
npm start
```

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Proxy**: http://localhost:5173/api/* (routes to backend)

## 📁 Key File Locations

```
src/
├── _dashboards.json              # Dashboard metadata
├── dashboards/                   # Dashboard definitions
│   └── [dashboard-id]/
│       └── definition.json
├── components/                    # React components
├── pages/                        # Page components
├── preset.js                     # Splunk dashboard presets
└── main.jsx                      # App entry point

server.js                         # Express server
vite.config.js                   # Vite configuration
```

## 🔄 Caching System

The system implements in-memory caching for API responses to improve performance.

### In-Memory Caching (Current Implementation)

The system currently uses Node.js in-memory caching with the following characteristics:

- **Fast access**: In-memory Map() provides sub-millisecond response times
- **Automatic cleanup**: Expired entries are automatically removed
- **Memory efficient**: Only stores active cache entries
- **Process-bound**: Cache is lost on server restart

### Cache Keys
```javascript
// Format: <dsid>_<JSON of the search's queryParameters>
`${dsid}_${JSON.stringify(datasource.search.queryParameters || {})}`
```

### TTL
```javascript
// The data source's own refresh interval, in seconds
const refresh = datasource.search.refresh || parseInt(process.env.DASHPUB_DEFAULT_TTL) || 60;
```

Expired entries are swept every 5 minutes (not configurable by environment variable).

### Cache Inspection
```bash
# Number of entries currently held
curl http://localhost:3000/health | jq .cache

# Whether a data source response came from cache
curl http://localhost:3000/api/data/<dsid> | jq .meta
```

There is no cache management endpoint and no manual flush. Entries expire on the data
source's own `refresh` interval; restart the server to drop the cache.

## 🔌 API Endpoints

### Dashboard Management
```http
GET    /api/dashboards                    # List all dashboards
GET    /api/dashboards/:id/definition     # Get dashboard definition
GET    /api/dashboards/list               # Enhanced dashboard list
```

### Data Sources
```http
GET    /api/data/:dsid                    # Get datasource data
```

### Health & Monitoring
```http
GET    /health                            # Health check, cache size, Splunk config
```

### Export, Logging and Auth
```http
GET    /api/export/:dsid/:format          # csv or json
GET    /api/logs/hec/status               # HEC client state
POST   /api/logs/hec/test                 # HEC connectivity check
POST   /api/logs/hec/flush                # Flush the HEC batch
POST   /api/login                         # JWT login (JWT_REQUIRED=true)
GET    /api/auth/verify                   # Verify a JWT
```

## 🎨 Frontend Development

### Component Structure
```jsx
// Dashboard component
import Dashboard from '@splunk/dashboard-core';

// Visualization components
import { LineChart, BarChart, Table } from '@splunk/visualizations';

// Splunk UI components
import { Card, CardTitle, CardSubTitle } from '@splunk/react-ui';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import Breadcrumbs from '@splunk/react-ui/Breadcrumbs';
import Button from '@splunk/react-ui/Button';

// Custom components
import Loading from '../components/Loading';
import BreadcrumbNavigation from '../components/Breadcrumbs';
```

### UI Components

#### Loading Component
The application uses Splunk UI's `WaitSpinner` for consistent loading states:

```jsx
import Loading from '../components/Loading';

// Usage
<Loading 
  type="rendering"  // 'default', 'searching', 'processing', 'rendering', 'connecting', 'error'
  message="Custom loading message"  // Optional custom message
  size="medium"  // 'small', 'medium', 'large'
/>
```

#### Breadcrumb Navigation
Breadcrumbs are automatically displayed on dashboard pages:

```jsx
import BreadcrumbNavigation from '../components/Breadcrumbs';

// Usage in Page component
<BreadcrumbNavigation 
  dashboardTitle="Dashboard Name"
  showBackButton={true}  // Optional, defaults to true
/>
```

Breadcrumbs are controlled via environment variables:
- `NEXT_PUBLIC_DASHPUBBREADCRUMBS` - Enable/disable breadcrumbs (default: true)
- `NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON` - Show/hide back button (default: true)

### State Management
```jsx
// Local state with hooks
const [dashboard, setDashboard] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// API calls
useEffect(() => {
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboards/${id}/definition`);
      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  loadDashboard();
}, [id]);
```

### Routing
```jsx
// React Router configuration
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/:dashboard" element={<DashboardPage />} />
  <Route path="*" element={<Custom404 />} />
</Routes>
```

## 🔧 Configuration

### Environment Variables
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
RATE_LIMIT_MAX_REQUESTS=1000
MAX_RETRIES=3

# Cache Management (Security)
CACHE_MANAGEMENT_KEY=your-secure-cache-key-here
```

### Vite Configuration
```javascript
// Key settings in vite.config.js
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    viteCommonjs({ include: ['@splunk/**'] }),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      overrides: { fs: false, net: false, tls: false }
    })
  ]
});
```

## 📊 Dashboard Definition Format

```json
{
  "id": "dashboard_id",
  "title": "Dashboard Title",
  "description": "Dashboard description",
  "tags": ["tag1", "tag2"],
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
      "dataSource": "dsid1",
      "position": { "row": 0, "column": 0 }
    }
  ]
}
```

## 🐛 Debugging

### Enable Debug Logging
```bash
# Backend debug
DEBUG=* npm run server

# Frontend debug
# Add console.log statements in React components
# Check browser console for errors
```

### Common Issues & Solutions

#### 1. Port Conflicts
```bash
# Check what's using ports
netstat -tlnp | grep -E "(3000|5173)"

# Kill processes
pkill -f "node server.js"
pkill -f "vite"
```

#### 2. Cache Issues
```bash
# Check cache size
curl http://localhost:3000/health | jq .cache

# Confirm whether a response was cached
curl http://localhost:3000/api/data/<dsid> | jq .meta
```

#### 3. Build Errors
```bash
# Clear build artifacts
rm -rf dist/ .next/ node_modules/
npm install
npm run build
```

#### 4. Splunk Connection Issues
```bash
# Check what the server resolved for Splunk
curl http://localhost:3000/health | jq .services.splunk

# Check environment variables
echo $SPLUNK_HOST
echo $SPLUNK_PORT
```

## 📈 Performance Monitoring

### Cache Performance
```javascript
// Per-response cache state; there is no aggregate hit-rate metric
const { meta } = await fetch(`/api/data/${dsid}`).then((r) => r.json());
console.log('From cache:', meta.fromCache, 'age(ms):', meta.cacheAge);
```

### Response Times
```javascript
// Add timing to API calls
const startTime = Date.now();
const response = await fetch('/api/data/dsid');
const responseTime = Date.now() - startTime;
console.log('Response time:', responseTime + 'ms');
```

### Memory Usage
```javascript
// Monitor memory in Node.js
const memUsage = process.memoryUsage();
console.log('Heap used:', (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB');
```

## 🔒 Security

### Rate Limiting
```javascript
// Rate limiting configuration with environment variable support
const RATE_LIMIT_CONFIG = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased default for dashboard reloads
  message: 'Too many requests from this IP, please try again later.'
};

// Default: 1000 requests per 15 minutes (allows 10 searches × 1 minute reloads)
// Override with environment variables:
// RATE_LIMIT_MAX_REQUESTS=2000  # For high-traffic dashboards
// RATE_LIMIT_WINDOW_MS=1800000  # For 30-minute windows
```

### Input Validation

**Note: Input validation is currently not implemented in this system. Dashboards are read-only and loaded from predefined configuration files.**

The system loads dashboard definitions and datasources from static configuration files (`src/dashboards/` and `src/_dashboards.json`), so no user input validation is required for dashboard operations.

For future enhancements, consider implementing validation for:
- Dashboard ID formats
- Data source configurations
- Search query syntax (if dynamic queries are added)

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Test with coverage
npm run test:coverage
```

### Test API Endpoints
```bash
# Test dashboard endpoint
curl http://localhost:3000/api/dashboards

# Test datasource endpoint
curl http://localhost:3000/api/data/test_dsid

# Test with authentication
curl -H "Authorization: Bearer token" http://localhost:3000/api/dashboards
```

## 📚 Useful Commands

### Development
```bash
# Watch for changes
npm run dev:full

# Check server logs
tail -f logs/server.log

# Monitor processes
ps aux | grep -E "(node|vite|npm)"
```

### Production
```bash
# Build and start
npm run build && npm start

# Check health
curl http://localhost:3000/health

# Uptime, memory, cache size and rate limiting are all in /health
curl http://localhost:3000/health | jq '{uptime, cache, rateLimit}'
```

### Troubleshooting
```bash
# Check network connections
netstat -tlnp | grep -E "(3000|5173)"

# Check file permissions
ls -la src/dashboards/

# Check environment
env | grep -E "(SPLUNK|NODE|PORT)"
```

## 🔄 Hot Reload Development

### Frontend Changes
- Edit React components in `src/components/` or `src/pages/`
- Changes appear instantly in browser
- No rebuild required

### Backend Changes
- Edit `server.js` or other backend files
- Restart server: `Ctrl+C` then `npm run server`
- Or use nodemon: `npm install -g nodemon && nodemon server.js`

### Dashboard Changes
- Edit dashboard definitions in `src/dashboards/[id]/definition.json`
- Refresh browser to see changes
- No rebuild required

## 📝 Logging

### Log Levels
```javascript
// In server.js
logger.info('Info message', { context: 'data' });
logger.warn('Warning message', { context: 'data' });
logger.error('Error message', { context: 'data' });
```

### Structured Logging
```javascript
logger.info('Dashboard loaded', {
  dashboardId: 'highlevel',
  loadTime: 245,
  userId: 'user123',
  timestamp: new Date().toISOString()
});
```

This quick reference guide provides developers with the essential information needed to work with the dashboard system efficiently.
