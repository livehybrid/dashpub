---
layout: default
title: Deployment
nav_order: 7
has_children: true
---

# Deployment Guide

Complete guide for deploying Dashpub to production.

## Deployment Options

### Docker Deployment

The recommended way to deploy Dashpub is using Docker:

```bash
docker run -d \
  -p 3000:3000 \
  -e SPLUNKD_URL=https://splunk-instance:8089 \
  -e SPLUNKD_TOKEN=your-token \
  livehybrid/splunk-dashpub
```

See [Docker Deployment](docker/) for detailed instructions.

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Use a process manager (PM2, systemd, etc.)

### Cloud Platforms

- **Vercel** - Automatic deployment from Git
- **Heroku** - Container-based deployment
- **AWS** - EC2 or ECS deployment
- **Azure** - Container Instances or App Service

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secret
- [ ] Enable authentication if needed
- [ ] Set up HTTPS/SSL
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backups
- [ ] Set up CI/CD pipeline

## Environment Variables

See [Configuration Guide](../configuration/) for complete list.

### Required for Production

```bash
NODE_ENV=production
SPLUNKD_URL=https://your-splunk-instance:8089
SPLUNKD_TOKEN=secure-token
JWT_SECRET=very-secure-random-string
```

## Security

### Authentication

Enable JWT authentication:

```bash
JWT_REQUIRED=true
JWT_SECRET=generate-secure-random-string
```

### Rate Limiting

Configure appropriate limits:

```bash
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000
```

### HTTPS

Always use HTTPS in production:
- Use reverse proxy (Nginx, Traefik)
- Configure SSL certificates
- Redirect HTTP to HTTPS

## Monitoring

### Health Checks

Configure health check endpoint:

```bash
GET /health
```

### Logging

Set up centralized logging:
- Splunk HEC integration
- File-based logging
- Cloud logging services

### Metrics

Monitor:
- Response times
- Cache hit rates
- Error rates
- Memory usage

## Scaling

### Horizontal Scaling

- Use load balancer
- Multiple instances
- Shared cache (Redis)

### Vertical Scaling

- Increase server resources
- Optimize queries
- Tune cache settings

## Related Documentation

- [Docker Deployment](docker/)
- [Configuration Guide](../configuration/)
- [Troubleshooting](../troubleshooting/)

