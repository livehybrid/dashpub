#!/usr/bin/env bash
#
# One-command local demo of sideloaded custom visualizations.
#
# Sideloads the two sample packaged Splunk apps (iframe radar + AMD clock),
# installs a demo dashboard that references both, builds the app and serves it
# through dashpub's real Express server + DashboardCore. No Splunk required —
# the demo dashboard uses a static ds.test data source.
#
#   ./examples/custom-viz/run-demo.sh        then open http://localhost:3001/custom-viz-demo
#
# Requires Node 20.19+ (Vite 7) and that template deps are installed
# (the script runs `npm install` for you).

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
TPL="$ROOT/template"
PORT="${PORT:-3001}"

export DASHPUB_CUSTOM_VIZ_PATH="$HERE/sample-splunk-apps"

echo "==> Sideloading packaged viz from $DASHPUB_CUSTOM_VIZ_PATH"
node --input-type=module -e "
  import { ingestCustomVizApps } from '$ROOT/cli/init.js';
  await ingestCustomVizApps(process.env.DASHPUB_CUSTOM_VIZ_PATH, '$TPL');
"

echo "==> Installing the demo dashboard"
mkdir -p "$TPL/src/dashboards/custom-viz-demo"
cp "$HERE/demo/custom-viz-demo/definition.json" "$TPL/src/dashboards/custom-viz-demo/definition.json"

echo "==> Building (this can take a couple of minutes)"
cd "$TPL"
npm install --no-audit --no-fund --silent
npm run build

echo ""
echo "==> Serving on http://localhost:$PORT"
echo "    Open:  http://localhost:$PORT/custom-viz-demo"
echo "    (Ctrl-C to stop)"
PORT="$PORT" NODE_ENV=production node server.js
