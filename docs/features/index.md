---
layout: default
title: Features
nav_order: 4
has_children: true
---

# Features

Dashpub provides a comprehensive set of features for publishing and managing Splunk dashboards.

## Core Features

### 📊 Dashboard Management
- [Dashboard System](dashboards/) - Create, manage, and display dashboards
- [Screenshot Generation](screenshots/) - Automated dashboard screenshots
- [Dashboard Metadata](dashboards/#metadata) - Tags, descriptions, and organization

### ⚡ Performance
- [Caching System](caching/) - Intelligent caching reduces API calls by 90%+
- [On-Demand Data](dashboards/#on-demand-data) - No scheduled exports required
- [Lazy Loading](loading/) - Optimized component loading

### 🎨 User Experience
- [Breadcrumb Navigation](breadcrumbs/) - Easy navigation between dashboards
- [Loading States](loading/) - Professional Splunk UI loading indicators
- [Tab Rotation](tab-rotation/) - Automatic tab rotation for kiosk displays
- [Responsive Design](dashboards/#responsive-design) - Works on all devices

### 🔒 Security
- [Authentication](configuration/#authentication--security) - Optional JWT authentication
- [Rate Limiting](caching/#rate-limiting) - IP-based rate limiting
- [Endpoint Protection](deployment/production/#security) - Protects Splunk endpoints

## Feature Highlights

### Intelligent Caching
Dashpub implements a sophisticated multi-level caching strategy that:
- Reduces Splunk API calls by 90%+
- Provides sub-millisecond response times for cached data
- Automatically expires stale data based on TTL
- Handles high concurrent user loads efficiently

### On-Demand Data
Unlike Splunk's built-in publishing, Dashpub provides:
- Real-time data fetching on page load
- No need for scheduled exports
- Intelligent caching to minimize Splunk load
- Configurable refresh intervals per datasource

### Professional UI Components
Dashpub uses Splunk's official UI components for:
- Consistent look and feel
- Professional loading indicators (WaitSpinner)
- Breadcrumb navigation
- Responsive design

## Quick Links

- [Dashboard System](dashboards/)
- [Caching System](caching/)
- [Tab Rotation](tab-rotation/)
- [Screenshots](screenshots/)
- [Breadcrumbs](breadcrumbs/)
- [Loading States](loading/)

