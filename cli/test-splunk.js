#!/usr/bin/env node

/*
 * Stub Splunk Service for Local Testing
 * 
 * This service pretends to be a Splunk instance and provides
 * mock endpoints for testing the template app without external dependencies.
 */

import http from 'http';
import url from 'url';

const PORT = process.env.SPLUNK_TEST_PORT || 8089;
const HOST = 'localhost';

// Mock data for testing
const MOCK_APPS = {
    'search': {
        name: 'search',
        label: 'Search & Reporting',
        description: 'Default search app'
    },
    'test': {
        name: 'test',
        label: 'Test App',
        description: 'Test application for development'
    }
};

const MOCK_DASHBOARDS = {
    'search': [
        {
            name: 'test_dashboard',
            label: 'Test Dashboard',
            description: 'A test dashboard for development',
            tags: ['test', 'development']
        },
        {
            name: 'sample_dashboard',
            label: 'Sample Dashboard',
            description: 'A sample dashboard with mock data',
            tags: ['sample', 'demo']
        }
    ],
    'test': [
        {
            name: 'dev_dashboard',
            label: 'Development Dashboard',
            description: 'Dashboard for development testing',
            tags: ['dev', 'test']
        }
    ]
};

const MOCK_SEARCH_RESULTS = {
    'test_dashboard': {
        results: [
            { _time: '2024-01-01T00:00:00Z', host: 'test-host-1', source: 'test.log', message: 'Test log message 1' },
            { _time: '2024-01-01T00:01:00Z', host: 'test-host-2', source: 'test.log', message: 'Test log message 2' },
            { _time: '2024-01-01T00:02:00Z', host: 'test-host-3', source: 'test.log', message: 'Test log message 3' }
        ],
        fields: ['_time', 'host', 'source', 'message'],
        preview: true
    },
    'sample_dashboard': {
        results: [
            { _time: '2024-01-01T00:00:00Z', user: 'admin', action: 'login', status: 'success' },
            { _time: '2024-01-01T00:01:00Z', user: 'user1', action: 'search', status: 'success' },
            { _time: '2024-01-01T00:02:00Z', user: 'user2', action: 'logout', status: 'success' }
        ],
        fields: ['_time', 'user', 'action', 'status'],
        preview: true
    }
};

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`${req.method} ${path}`);

    try {
        // Splunk info endpoint
        if (path === '/services/server/info' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                entry: [{
                    content: {
                        version: '9.0.0',
                        build: '1234567890',
                        serverName: 'test-splunk-instance'
                    }
                }]
            }));
            return;
        }

        // Apps endpoint
        if (path === '/services/apps/local' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                entry: Object.values(MOCK_APPS).map(app => ({
                    name: app.name,
                    content: app
                }))
            }));
            return;
        }

        // Dashboards endpoint
        if (path.startsWith('/servicesNS/-/') && path.includes('/data/ui/nav/default') && req.method === 'GET') {
            const appMatch = path.match(/\/servicesNS\/-\/([^\/]+)\//);
            const app = appMatch ? appMatch[1] : 'search';
            
            const dashboards = MOCK_DASHBOARDS[app] || MOCK_DASHBOARDS['search'];
            
            res.writeHead(200);
            res.end(JSON.stringify({
                entry: dashboards.map(dash => ({
                    name: dash.name,
                    content: dash
                }))
            }));
            return;
        }

        // Search dispatch endpoint
        if (path === '/services/search/jobs' && req.method === 'POST') {
            const searchId = 'test_search_' + Date.now();
            res.writeHead(201);
            res.end(JSON.stringify({
                entry: [{
                    name: searchId,
                    content: {
                        sid: searchId,
                        status: 'DONE'
                    }
                }]
            }));
            return;
        }

        // Search status endpoint
        if (path.startsWith('/services/search/jobs/') && path.endsWith('/') && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                entry: [{
                    content: {
                        status: 'DONE',
                        resultCount: 3,
                        resultPreviewCount: 3
                    }
                }]
            }));
            return;
        }

        // Search results endpoint
        if (path.startsWith('/services/search/jobs/') && path.includes('/results') && req.method === 'GET') {
            const searchId = path.split('/')[4];
            const dashboardName = query.dashboard || 'test_dashboard';
            
            const results = MOCK_SEARCH_RESULTS[dashboardName] || MOCK_SEARCH_RESULTS['test_dashboard'];
            
            res.writeHead(200);
            res.end(JSON.stringify({
                results: results.results,
                fields: results.fields,
                preview: results.preview
            }));
            return;
        }

        // Default response for unknown endpoints
        res.writeHead(404);
        res.end(JSON.stringify({
            error: 'Endpoint not found',
            path: path,
            method: req.method
        }));

    } catch (error) {
        console.error('Error handling request:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }));
    }
});

// Start the server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Stub Splunk service running at http://${HOST}:${PORT}`);
    console.log(`📱 Test endpoints:`);
    console.log(`   - Server info: GET /services/server/info`);
    console.log(`   - Apps: GET /services/apps/local`);
    console.log(`   - Dashboards: GET /servicesNS/-/{app}/data/ui/nav/default`);
    console.log(`   - Search: POST /services/search/jobs`);
    console.log(`   - Results: GET /services/search/jobs/{id}/results`);
    console.log(``);
    console.log(`🔧 To use with dashpub, set:`);
    console.log(`   SPLUNKD_URL=http://${HOST}:${PORT}`);
    console.log(`   SPLUNKD_USER=admin`);
    console.log(`   SPLUNKD_PASSWORD=changeme`);
    console.log(``);
    console.log(`💡 Press Ctrl+C to stop the service`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down stub Splunk service...');
    server.close(() => {
        console.log('✅ Service stopped');
        process.exit(0);
    });
});
