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

One entry per data source and time range:

```
<dsid>_<JSON of the search's queryParameters>
```

Example: `w7497kgev1n4_{"earliest":"-24h","latest":"now"}`

### TTL

An entry lives for its data source's own `refresh` interval, falling back to
`DASHPUB_DEFAULT_TTL` and then to 60 seconds. The same value is sent to downstream
caches as `Cache-Control: s-maxage=<refresh>, stale-while-revalidate`.

A sweep every 5 minutes deletes entries that have already expired. There is no LRU
eviction and no size cap, so cache memory scales with the number of distinct data
sources across all published dashboards.

## Configuration

### Rate Limiting

```bash
# Rate limit window in milliseconds (default: 900000 = 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window
RATE_LIMIT_MAX_REQUESTS=1000
```

## Cache Statistics

### Inspect the Cache

```bash
# Number of entries currently held
curl http://localhost:3000/health | jq .cache
```

Each data source response carries its own cache state:

```bash
curl http://localhost:3000/api/data/<dsid> | jq .meta
```

`meta.fromCache`, `meta.cacheAge` and `meta.nextRefresh` show whether the value came
from cache and when it will next be refreshed.

There is no cache management endpoint and no manual flush - entries expire on their own
TTL, and restarting the server drops the cache.

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

