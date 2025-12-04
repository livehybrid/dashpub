# Splunk HEC (HTTP Event Collector) Logging Integration

This document describes the Splunk HEC logging integration that allows the Dashpub application to send structured logs directly to Splunk for centralized log management and monitoring.

## 🎯 Overview

The HEC integration provides:
- **Dual Logging**: Logs are sent to both local files and Splunk HEC
- **Batch Processing**: Efficient batching of log entries to reduce network overhead
- **Automatic Retry**: Built-in retry logic with exponential backoff
- **Graceful Shutdown**: Ensures all pending logs are sent before shutdown
- **Real-time Monitoring**: Immediate visibility into application logs in Splunk

## ⚙️ Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Enable/disable HEC logging
SPLUNK_HEC_ENABLED=true

# HEC endpoint URL (usually your Splunk instance + /services/collector)
SPLUNK_HEC_URL=https://your-splunk-instance:8088/services/collector

# HEC token (generate this in Splunk Web)
SPLUNK_HEC_TOKEN=your-hec-token-here

# Splunk index where logs will be stored
SPLUNK_HEC_INDEX=main

# Source identifier for the logs
SPLUNK_HEC_SOURCE=dashpub

# Sourcetype for proper parsing in Splunk
SPLUNK_HEC_SOURCETYPE=dashpub:app:logs

# Host identifier (defaults to system hostname)
SPLUNK_HEC_HOST=your-hostname

# Batch configuration
SPLUNK_HEC_BATCH_SIZE=100          # Number of logs to batch before sending
SPLUNK_HEC_BATCH_TIMEOUT=5000      # Maximum time to wait before sending batch (ms)
SPLUNK_HEC_MAX_RETRIES=3           # Maximum retry attempts on failure
SPLUNK_HEC_RETRY_DELAY=1000        # Base delay between retries (ms)
```

### Automatic Fallback

If `SPLUNK_HEC_URL` is not set, the system will automatically use:
- URL: `{SPLUNKD_URL}/services/collector`
- Token: `{SPLUNKD_TOKEN}`

This allows you to use the same Splunk instance for both data queries and logging.

## 🔧 Setup in Splunk

### 1. Enable HTTP Event Collector

1. In Splunk Web, go to **Settings** → **Data Inputs** → **HTTP Event Collector**
2. Click **New Token**
3. Configure the token:
   - **Name**: `dashpub-logs`
   - **Description**: `Dashpub application logs`
   - **Index**: Choose your preferred index (e.g., `main`)
   - **Source Type**: `dashpub:app:logs`
   - **App Context**: Choose appropriate app context

### 2. Configure Index (if needed)

If you want to use a dedicated index:

1. Go to **Settings** → **Indexes**
2. Click **New Index**
3. Configure:
   - **Index Name**: `dashpub_logs`
   - **Max Size**: Appropriate for your environment
   - **Max Time**: Appropriate retention period

### 3. Update Environment Variables

```bash
SPLUNK_HEC_INDEX=dashpub_logs
SPLUNK_HEC_TOKEN=your-generated-token
```

## 📊 Log Structure

### HEC Event Format

Each log entry sent to Splunk includes:

```json
{
  "event": {
    "message": "Log message content",
    "level": "INFO|ERROR|WARN|DEBUG",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "additional_metadata": "value"
  },
  "index": "main",
  "source": "dashpub",
  "sourcetype": "dashpub:app:logs",
  "host": "your-hostname",
  "time": 1705312200
}
```

### Log Levels

- **INFO**: General application information
- **ERROR**: Error conditions and exceptions
- **WARN**: Warning conditions
- **DEBUG**: Detailed debugging information

### Common Metadata Fields

- `datasourceId`: ID of the datasource being processed
- `sid`: Splunk search ID
- `userId`: User performing the action
- `ip`: Client IP address
- `userAgent`: Client user agent
- `responseTime`: API response time
- `statusCode`: HTTP status code

## 🔍 Monitoring and Management

### Health Check Endpoint

Check HEC status via the health endpoint:

```bash
GET /health
```

Response includes HEC status:

```json
{
  "logging": {
    "hec": {
      "enabled": true,
      "connected": true,
      "lastError": null,
      "batchSize": 0,
      "retryCount": 0,
      "config": {
        "url": "https://splunk:8088/services/collector",
        "index": "main",
        "source": "dashpub",
        "sourcetype": "dashpub:app:logs",
        "host": "server-01"
      }
    }
  }
}
```

### HEC Management Endpoints

#### Get HEC Status
```bash
GET /api/logs/hec/status
```

#### Test HEC Connection
```bash
POST /api/logs/hec/test
```

#### Flush Pending Logs
```bash
POST /api/logs/hec/flush
```

## 📈 Performance Considerations

### Batch Processing

- **Batch Size**: Default 100 logs per batch
- **Batch Timeout**: Default 5 seconds
- **Network Efficiency**: Reduces HTTP requests by 90%+

### Retry Logic

- **Exponential Backoff**: 1s, 2s, 4s delays
- **Max Retries**: Configurable (default: 3)
- **Graceful Degradation**: Continues local logging if HEC fails

### Memory Usage

- **Batch Buffer**: In-memory storage of pending logs
- **Automatic Cleanup**: Batches are sent and cleared automatically
- **Graceful Shutdown**: Ensures no logs are lost

## 🚨 Troubleshooting

### Common Issues

#### 1. Connection Failed

**Symptoms**: `⚠️ Splunk HEC connection failed: HTTP 401: Unauthorized`

**Solutions**:
- Verify HEC token is correct
- Check token permissions in Splunk
- Ensure token is not expired

#### 2. Network Timeout

**Symptoms**: `⚠️ HEC send failed, retrying 1/3: fetch failed`

**Solutions**:
- Check network connectivity to Splunk
- Verify firewall rules
- Increase timeout values if needed

#### 3. Index Not Found

**Symptoms**: `⚠️ Splunk HEC connection failed: HTTP 400: Bad Request`

**Solutions**:
- Verify index exists in Splunk
- Check index permissions
- Ensure index is not disabled

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

This will show:
- HEC connection attempts
- Batch send confirmations
- Retry attempts
- Detailed error messages

### Log Files

Check local log files for HEC-related entries:

```bash
tail -f logs/app.log | grep -i hec
```

## 🔄 Migration from Local-Only Logging

### Step 1: Enable HEC

```bash
SPLUNK_HEC_ENABLED=true
SPLUNK_HEC_TOKEN=your-token
SPLUNK_HEC_URL=https://splunk:8088/services/collector
```

### Step 2: Verify Connection

```bash
curl -X POST http://localhost:3000/api/logs/hec/test
```

### Step 3: Monitor Health

```bash
curl http://localhost:3000/health | jq '.logging.hec'
```

### Step 4: Check Splunk

Search in Splunk for your logs:

```
index=main sourcetype="dashpub:app:logs" source="dashpub"
```

## 📋 Best Practices

### 1. Token Security

- Use dedicated HEC tokens for different applications
- Rotate tokens regularly
- Store tokens securely (not in version control)

### 2. Index Management

- Use dedicated indexes for application logs
- Set appropriate retention policies
- Monitor index size and performance

### 3. Network Configuration

- Use HTTPS for HEC endpoints
- Configure appropriate firewall rules
- Monitor network latency

### 4. Monitoring

- Set up alerts for HEC failures
- Monitor batch processing performance
- Track log volume and patterns

## 🔗 Related Documentation

- [Splunk HEC Documentation](https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector)
- [Dashpub Main Documentation](./README.md)
- [Environment Configuration](./env.example)
- [API Documentation](./API.md)

## 📞 Support

For issues with HEC integration:

1. Check the troubleshooting section above
2. Review Splunk HEC documentation
3. Check application logs for detailed error messages
4. Verify network connectivity and configuration

---

**Note**: This integration maintains backward compatibility. If HEC is disabled, all logging continues to work as before with local file output only.
