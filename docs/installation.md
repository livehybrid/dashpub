---
layout: default
title: Installation
nav_order: 2
---

# Installation Guide

This guide will walk you through installing and setting up Dashpub.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 8+ (comes with Node.js)
- **Access to Splunk Enterprise** instance
- **Git** (optional, for cloning the repository)

## Installation Methods

### Method 1: Using the CLI Tool (Recommended)

The easiest way to get started is using the built-in CLI tool:

```bash
# Clone the repository
git clone <repository-url>
cd dashpub-v2-testing

# Initialize a new project
node cli/cli.js init
```

The CLI will:
1. Prompt you for Splunk connection details
2. Generate dashboard definitions from your Splunk instance
3. Create a new `app/` directory with all necessary files
4. Set up environment variables

### Method 2: Manual Installation

If you prefer manual setup:

```bash
# Clone the repository
git clone <repository-url>
cd dashpub-v2-testing

# Copy the template directory
cp -r template app
cd app

# Install dependencies
npm install

# Copy environment example
cp env.example .env

# Edit .env with your Splunk configuration
nano .env  # or use your preferred editor
```

## Quick Start

After installation, start the development server:

```bash
cd app

# Install dependencies (if not already done)
npm install

# Start both backend and frontend servers
npm run dev:full
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Environment Configuration

### Required Variables

Create a `.env` file in the `app/` directory with the following:

```bash
# Splunk Connection (Required)
SPLUNKD_URL=https://your-splunk-instance:8089
SPLUNKD_USER=admin
SPLUNKD_PASSWORD=your_password

# Or use token authentication
SPLUNKD_TOKEN=your_api_token
```

### Optional Configuration

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Dashboard Display Settings
NEXT_PUBLIC_DASHPUBTITLE=My Dashboards
NEXT_PUBLIC_HOMETHEME=light

# Screenshot Configuration
NEXT_PUBLIC_DASHPUBSCREENSHOTS=false
NEXT_PUBLIC_BASE_SCREENSHOT_URL=
NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=screenshots
NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=png

# Breadcrumb Navigation
NEXT_PUBLIC_DASHPUBBREADCRUMBS=true
NEXT_PUBLIC_DASHPUBBREADCRUMBSBACKBUTTON=true

# Tab Rotation
REACT_APP_TAB_ROTATION_INTERVAL=15000
REACT_APP_TAB_ROTATION_ENABLED=true
```

See the [Configuration Guide](configuration/) for a complete list of environment variables.

## Verifying Installation

### 1. Check Server Status

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Test Splunk Connection

```bash
curl http://localhost:3000/api/splunk/test
```

### 3. Check Dashboard List

```bash
curl http://localhost:3000/api/dashboards
```

## Next Steps

- [Configure your dashboards](configuration/)
- [Learn about features](features/)
- [Set up production deployment](deployment/production/)

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5173

# Kill the process or change ports in .env
PORT=3001  # Change backend port
```

### Splunk Connection Issues

1. Verify Splunk URL and credentials
2. Check network connectivity
3. Ensure Splunk REST API is accessible
4. Check firewall rules

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

For more troubleshooting help, see the [Troubleshooting Guide](troubleshooting/).

