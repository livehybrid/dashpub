---
layout: default
title: Docker Deployment
parent: Deployment
nav_order: 1
---

# Docker Deployment

Complete guide for deploying Dashpub using Docker.

## Quick Start

### Using Docker Hub Image

```bash
docker run -d \
  -p 3000:3000 \
  -e SPLUNKD_URL=https://splunk-instance:8089 \
  -e SPLUNKD_TOKEN=your-token \
  livehybrid/splunk-dashpub
```

### Using Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd dashpub-v2-testing/docker

# Edit docker-compose.yml with your configuration
nano docker-compose.yml

# Start services
docker-compose up -d
```

## Configuration

### Environment Variables

Set environment variables in `docker-compose.yml`:

```yaml
services:
  dashpub:
    environment:
      - SPLUNKD_URL=https://splunk-instance:8089
      - SPLUNKD_TOKEN=your-token
      - NEXT_PUBLIC_DASHPUBTITLE=My Dashboards
      - NEXT_PUBLIC_DASHPUBSCREENSHOTS=true
```

### Volume Mounts

Mount volumes for persistent data:

```yaml
volumes:
  - ./screenshots:/app/screenshots
  - ./logs:/app/logs
  - ./cache:/app/cache
```

## Building from Source

### Build Image

```bash
cd docker
docker build -t dashpub:latest .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e SPLUNKD_URL=https://splunk-instance:8089 \
  -e SPLUNKD_TOKEN=your-token \
  dashpub:latest
```

## Production Deployment

### Docker Compose Production

```yaml
version: '3.8'

services:
  dashpub:
    image: livehybrid/splunk-dashpub:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SPLUNKD_URL=https://splunk-instance:8089
      - SPLUNKD_TOKEN=${SPLUNKD_TOKEN}
      - JWT_REQUIRED=true
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./screenshots:/app/screenshots
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Related Documentation

- [Deployment Guide](../index.md)
- [Configuration Guide](../configuration/)
- [Docker README](../../docker/README.md)

