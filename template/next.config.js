/*
Copyright 2020 Splunk Inc. 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You can obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const fs = require('fs');
const path = require('path');
const settings = Object.assign({}, require('./package.json').dashpub.settings);

const withTM = require('next-transpile-modules')([
  '@splunk/visualizations',
  '@splunk/dashboard-presets',
  'maplibre-gl',
  'd3-array',
  'd3-interpolate',
]);

module.exports = withTM({
  // Removed deprecated experimental.esmExternals option
  reactStrictMode: true,
  swcMinify: true,
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.0.222'],
  // Add trailing slash to help with routing
  trailingSlash: false,
  
  // Disable static optimization for problematic pages
  experimental: {
    // Disable static optimization for 404 page
    staticPageGenerationTimeout: 0,
    // Add error boundaries for static generation
    isrMemoryCacheSize: 0,
  },
  
  // Configure headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  
  webpack(config, { isServer, buildId, webpack }) {
    // (Your snapshot file and plugin definitions remain the same)
    const snapshotPath = path.join(__dirname, 'src/pages/api/data/_snapshot.json');
    if (!fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, '{}', { encoding: 'utf-8' });
    }
    if (settings.useDataSnapshots) {
      const contents = fs.readFileSync(snapshotPath, { encoding: 'utf-8' });
      if (contents === '{}') {
        throw new Error('Data snapshots are enabled, but snapshot is empty');
      }
    }

    // Add fallbacks for maplibre-gl compatibility issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
      
      // Add resolve alias to handle maplibre-gl script property issues
      config.resolve.alias = {
        ...config.resolve.alias,
        'maplibre-gl': require.resolve('maplibre-gl'),
        'maplibre-gl/dist/maplibre-gl.css': require.resolve('maplibre-gl/dist/maplibre-gl.css'),
      };
      
      // Add webpack rule to handle maplibre-gl imports
      config.module.rules.push({
        test: /maplibre-gl\.js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      });
    }

    // Handle maplibre-gl script property error using webpack plugin
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.USE_DATA_SNAPSHOTS': JSON.stringify(settings.useDataSnapshots),
        'process.env.DASHPUB_BUILD_ID': JSON.stringify(buildId),
        // Fix maplibre-gl script property issue
        'process.env.MAPLIBRE_GL_SCRIPT_FIX': JSON.stringify(true),
      })
    );

    // Add a custom webpack plugin to handle maplibre-gl issues
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.compilation.tap('MaplibreFix', (compilation) => {
          compilation.hooks.optimizeChunkModules.tap('MaplibreFix', (chunks, modules) => {
            modules.forEach((module) => {
              if (module.resource && module.resource.includes('maplibre-gl')) {
                // This will help prevent the script property error
                module.usedExports = new Set();
              }
            });
          });
        });
      }
    });

    // Exclude maplibre-gl from certain optimizations that cause script property errors
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            maplibre: {
              test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/,
              name: 'maplibre',
              chunks: 'all',
              enforce: true,
            }
          }
        }
      };
    }

    // Optionally, keep our externals override for d3-array and d3-interpolate
    if (!isServer && config.externals) {
      config.externals = config.externals.map((external) => {
        if (typeof external !== 'function') return external;
        return (context, request, callback) => {
          if (request === 'd3-array' || request === 'd3-interpolate') {
            return callback(); // force bundling these packages
          }
          return external(context, request, callback);
        };
      });
    }

    return config;
  },
});
