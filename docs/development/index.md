---
layout: default
title: Development Guide
nav_order: 6
has_children: true
---

# Development Guide

Complete guide for developers working on Dashpub.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd dashpub-v2-testing

# Install dependencies
npm install

# Start development servers
cd app
npm run dev:full
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm 8+
- Access to Splunk Enterprise instance
- Git

### Project Structure

```
dashpub-v2-testing/
├── cli/              # CLI tool for initialization
├── template/         # Template files (copied to app/)
├── app/              # Generated application
├── docs/             # Documentation
└── docker/           # Docker configuration
```

### Development Workflow

1. **Make changes** in `template/` directory
2. **Test locally** using `npm run dev:full`
3. **Run tests** with `npm test`
4. **Commit changes** to git

## Key Documentation

- [Quick Reference](quick-reference/) - Essential commands and patterns
- [Architecture](architecture/) - System architecture deep dive
- [API Reference](../api/) - Complete API documentation

## Development Commands

### Frontend Development

```bash
# Start Vite dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```bash
# Start Express server
npm run server

# Run with nodemon (auto-reload)
npx nodemon server.js
```

### Full Stack Development

```bash
# Start both servers
npm run dev:full
```

## Code Style

### JavaScript/React

- Use ES6+ features
- Prefer functional components with hooks
- Use async/await for async operations
- Follow React best practices

### File Naming

- Components: `PascalCase.jsx`
- Utilities: `camelCase.js`
- Constants: `UPPER_SNAKE_CASE.js`

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── dashboard.spec.ts    # Dashboard E2E tests
└── smoke.spec.ts        # Smoke tests
```

## Debugging

### Enable Debug Logging

```bash
DEBUG=* npm run dev:full
```

### Browser DevTools

- React DevTools for component inspection
- Network tab for API debugging
- Console for error messages

### Server Logs

```bash
# View server logs
tail -f logs/app.log

# Check cache stats
curl http://localhost:3000/api/cache/stats
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit pull request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console errors
- [ ] Performance considered

## Related Documentation

- [Quick Reference](quick-reference/)
- [Architecture](architecture/)
- [API Reference](../api/)

