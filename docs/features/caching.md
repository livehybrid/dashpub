---
layout: default
title: Caching System
parent: Features
nav_order: 2
---

# Caching System

Dashpub implements a sophisticated multi-level caching strategy to optimize performance and reduce Splunk API calls.

## Overview

The caching system provides:
- **90%+ reduction** in Splunk API calls
- **Sub-millisecond response times** for cached data
- **Automatic expiration** based on TTL
- **Memory efficient** cleanup of expired entries
- **High concurrency** support

## How It Works

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

### Cache Key Format

Cache keys follow this pattern:

```
type:identifier:parameters
```

Examples:
- `datasource:w7497kgev1n4:{"refresh":30}`
- `dashboard:highlevel:v1.0`
- `search:index=main|stats count:abc123:santa_tracker`

### TTL Strategies

Different data types have different TTLs:

```javascript
{
  'datasource': 300000,      // 5 minutes
  'dashboard': 3600000,      // 1 hour
  'saved_search': 1800000,  // 30 minutes
  'user_preference': 86400000 // 24 hours
}
```

## Configuration

### Cache Cleanup

```bash
# Cleanup interval (seconds)
CACHE_CLEANUP_INTERVAL=300
```

### Rate Limiting

```bash
# Rate limit window (minutes)
RATE_LIMIT_WINDOW=15

# Maximum requests per window
RATE_LIMIT_MAX_REQUESTS=1000
```

## Cache Statistics

### Get Cache Stats

```bash
curl http://localhost:3000/api/cache/stats
```

Response:
```json
{
  "totalEntries": 156,
  "memoryUsage": "45.2 MB",
  "hitRate": 0.87,
  "missRate": 0.13,
  "evictions": 23,
  "lastCleanup": "2024-01-15T10:30:00Z"
}
```

### Cache Management

Clear specific cache entry (requires key):
```bash
curl -X DELETE \
  -H "x-cache-key: your-key" \
  http://localhost:3000/api/cache/specific-key
```

Clear all cache:
```bash
curl -X DELETE \
  -H "x-cache-key: your-key" \
  http://localhost:3000/api/cache/clear
```

## Benefits

### Performance
- **90%+ reduction** in response time for cached data
- **Sub-millisecond** response times
- **Handles high concurrent loads** efficiently

### Cost Reduction
- **Minimizes Splunk API calls** and license usage
- **Reduces network traffic**
- **Lowers infrastructure costs**

### Scalability
- **Handles high concurrent user loads**
- **Reduces load on Splunk infrastructure**
- **Better for public-facing scenarios**

## Best Practices

1. **Monitor cache hit rates** - Aim for >80% hit rate
2. **Tune TTL values** - Balance freshness vs performance
3. **Monitor memory usage** - Adjust cleanup frequency
4. **Use appropriate cache keys** - Include all relevant parameters
5. **Clear cache when needed** - After dashboard updates

## Troubleshooting

### Low Hit Rate

- Check if TTLs are too short
- Verify cache keys are consistent
- Monitor cache cleanup frequency

### High Memory Usage

- Increase cleanup frequency
- Reduce cache TTLs
- Monitor cache size

### Stale Data

- Reduce TTL for real-time data
- Use cache invalidation
- Force refresh when needed

## Related Documentation

- [Configuration Guide](../configuration/)
- [API Reference](../api/)
- [Performance Tuning](../troubleshooting/#performance-issues)

