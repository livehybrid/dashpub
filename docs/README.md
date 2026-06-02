# Dashpub Documentation

This directory contains the documentation for Dashpub, designed to be deployed to GitHub Pages.

## Structure

```
docs/
├── _config.yml          # Jekyll configuration
├── index.md             # Homepage
├── installation.md      # Installation guide
├── configuration.md     # Configuration reference
├── troubleshooting.md   # Troubleshooting guide
├── features/            # Feature documentation
│   ├── index.md
│   ├── dashboards.md
│   ├── breadcrumbs.md
│   ├── loading.md
│   ├── tab-rotation.md
│   ├── screenshots.md
│   └── hec-logging.md
├── api/                 # API documentation
│   └── index.md
├── development/         # Development guides
│   ├── index.md
│   ├── quick-reference.md
│   └── architecture.md
└── deployment/          # Deployment guides
    ├── index.md
    └── docker.md
```

## GitHub Pages Setup

### Enable GitHub Pages

1. Go to repository Settings
2. Navigate to Pages section
3. Select source: `main` branch, `/docs` folder
4. Save changes

### Using Jekyll Theme

The documentation uses Jekyll with the `jekyll-theme-minimal` theme. GitHub Pages will automatically build and serve the documentation.

### Local Testing

To test locally before pushing:

```bash
# Install Jekyll
gem install bundler jekyll

# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve

# Visit http://localhost:4000
```

## Updating Documentation

1. Edit markdown files in `docs/`
2. Commit changes
3. Push to repository
4. GitHub Pages will automatically rebuild

## Navigation

Navigation is configured in `_config.yml`. Update the `navigation` section to add or modify menu items.

## Contributing

When adding new documentation:
1. Follow the existing structure
2. Use front matter for metadata
3. Add to navigation in `_config.yml`
4. Include code examples
5. Link to related documentation

