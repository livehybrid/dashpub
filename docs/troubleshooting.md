---
layout: default
title: Troubleshooting
nav_order: 8
---

# Troubleshooting Guide

Common issues and solutions for Dashpub.

## Common Issues

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process or change port
PORT=3001 npm start
```

### Splunk Connection Failed

**Error:** `Failed to connect to Splunk`

**Solutions:**
1. Verify Splunk URL and credentials
2. Check network connectivity
3. Ensure Splunk REST API is accessible
4. Check firewall rules
5. Verify SSL certificate (if using HTTPS)

```bash
# Test connection
curl http://localhost:3000/api/splunk/test
```

### Build Errors

**Error:** `Build failed` or `Module not found`

**Solutions:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite
npm run build
```

### JSX Syntax Errors

**Error:** `The JSX syntax extension is not currently enabled`

**Solution:**
- Ensure `.jsx` files use `.jsx` extension
- Check Vite configuration
- Verify React plugin is installed

### Breadcrumbs Not Showing

**Solutions:**
1. Check configuration:
   ```bash
   curl http://localhost:3000/api/config | jq .breadcrumbs
   ```

2. Verify environment variables:
   ```bash
   echo $NEXT_PUBLIC_DASHPUBBREADCRUMBS
   ```

3. Check browser console for errors
4. Ensure you're on a dashboard page (not homepage)

### Screenshots Not Loading

**Solutions:**
1. Verify screenshot configuration:
   ```bash
   curl http://localhost:3000/api/config | jq .screenshots
   ```

2. Check screenshot directory exists:
   ```bash
   ls -la screenshots/
   ```

3. Verify file permissions
4. Check screenshot URLs in browser network tab

### Cache Issues

**Error:** Stale data or cache not working

**Solutions:**
```bash
# Check cache stats
curl http://localhost:3000/api/cache/stats

# Clear cache (requires key)
curl -X DELETE \
  -H "x-cache-key: your-key" \
  http://localhost:3000/api/cache/clear
```

### Rate Limiting

**Error:** `429 Too Many Requests`

**Solutions:**
1. Wait for rate limit window to reset
2. Increase rate limit:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=2000
   ```
3. Implement request batching
4. Use caching to reduce requests

## Debug Mode

### Enable Debug Logging

```bash
# Backend debug
DEBUG=* npm run server

# Full debug
DEBUG=* npm run dev:full
```

### Browser Console

Check browser console for:
- JavaScript errors
- Network request failures
- React component warnings

### Server Logs

```bash
# View logs
tail -f logs/app.log

# Check for errors
grep ERROR logs/app.log
```

## Performance Issues

### Slow Dashboard Loading

**Solutions:**
1. Check Splunk query performance
2. Verify cache is working
3. Reduce dashboard complexity
4. Optimize datasource queries
5. Increase cache TTL

### High Memory Usage

**Solutions:**
1. Reduce cache size
2. Lower cache TTL
3. Increase cache cleanup frequency
4. Monitor memory usage

### Slow API Responses

**Solutions:**
1. Check Splunk performance
2. Verify caching is enabled
3. Optimize queries
4. Use connection pooling
5. Check network latency

## Getting Help

### Check Documentation

1. Review relevant documentation sections
2. Search for similar issues
3. Check API reference

### Debug Information

When reporting issues, include:
- Error messages
- Server logs
- Browser console output
- Configuration (sanitized)
- Steps to reproduce

### Community Support

- [GitHub Issues](https://github.com/livehybrid/dashpub/issues)
- [GitHub Discussions](https://github.com/livehybrid/dashpub/discussions)

## Related Documentation

- [Configuration Guide](configuration/)
- [API Reference](api/)
- [Development Guide](development/)

