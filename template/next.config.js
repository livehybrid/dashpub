/*
Copyright 2020 Splunk Inc. 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

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
  experimental: {
    esmExternals: 'loose',
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

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.USE_DATA_SNAPSHOTS': JSON.stringify(settings.useDataSnapshots),
        'process.env.DASHPUB_BUILD_ID': JSON.stringify(buildId),
      })
    );

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
