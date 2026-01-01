---
layout: default
title: Dashpub Documentation
nav_order: 1
---

# Dashpub Documentation

Welcome to the comprehensive documentation for **Dashpub** - A modern, high-performance dashboard system built with Node.js, Express, React, and Vite, designed to display Splunk data with real-time updates, caching, and comprehensive visualization support.

## 🚀 Quick Start

Get up and running in minutes:

```bash
# Clone the repository
git clone <repository-url>
cd dashpub-v2-testing

# Initialize a new project
node cli/cli.js init

# Navigate to the app directory
cd app

# Install dependencies
npm install

# Start development server
npm run dev:full
```

## 📚 Documentation Structure

### Getting Started
- [Installation Guide](installation/) - Step-by-step installation instructions
- [Quick Start](installation/#quick-start) - Get started in 5 minutes
- [Configuration](configuration/) - Environment variables and settings

### Features
- [Dashboard System](features/dashboards/) - Creating and managing dashboards
- [Caching System](features/caching/) - Performance optimization with caching
- [Tab Rotation](features/tab-rotation/) - Automatic tab rotation for kiosk displays
- [Screenshots](features/screenshots/) - Dashboard screenshot generation
- [Breadcrumb Navigation](features/breadcrumbs/) - Navigation enhancements
- [Loading States](features/loading/) - Professional loading indicators

### Development
- [Developer Guide](development/) - Development setup and workflows
- [API Reference](api/) - Complete API documentation
- [Architecture](development/architecture/) - System architecture deep dive

### Deployment
- [Docker Deployment](deployment/docker/) - Container-based deployment
- [Production Setup](deployment/production/) - Production best practices
- [CI/CD](deployment/cicd/) - Continuous integration and deployment

## 🎯 Key Features

### ✨ Modern Stack
- **Frontend**: React 18 + Vite 6
- **Backend**: Node.js + Express.js
- **Dashboard Engine**: @splunk/dashboard-core
- **Visualizations**: @splunk/visualizations

### 🚀 Performance
- **Intelligent Caching**: Reduces Splunk API calls by 90%+
- **On-Demand Data**: No scheduled exports required
- **Optimized Loading**: Lazy loading and code splitting

### 🎨 User Experience
- **Professional UI**: Splunk UI components for consistency
- **Breadcrumb Navigation**: Easy navigation between dashboards
- **Loading Indicators**: Splunk WaitSpinner for professional loading states
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🔒 Security
- **Optional Authentication**: JWT-based authentication
- **Rate Limiting**: IP-based rate limiting
- **Endpoint Protection**: Protects Splunk deployment URLs

## 📊 Feature Comparison

| Feature | Splunk Enterprise | Dashpub |
|---------|------------------|---------|
| **High Level View** | ❌ | ✅ Homepage with all dashboards |
| **On-Demand Data** | ❌ | ✅ With intelligent caching |
| **Tab Rotation** | ❌ | ✅ Automatic rotation |
| **Screenshot Generation** | ❌ | ✅ Automated screenshots |
| **Custom Visualizations** | ❌ | ✅ Full support |
| **Rate Limiting** | ❌ Basic | ✅ Advanced IP-based |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](development/contributing/) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🔗 Resources

- [GitHub Repository](https://github.com/livehybrid/dashpub)
- [Docker Hub](https://hub.docker.com/r/livehybrid/splunk-dashpub)
- [Splunk Dashboard SDK](https://splunk.github.io/dashboard-sdk/)

---

**Need Help?** Check out our [Troubleshooting Guide](troubleshooting/) or [open an issue](https://github.com/livehybrid/dashpub/issues) on GitHub.

