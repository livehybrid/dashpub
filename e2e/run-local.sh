#!/usr/bin/env bash
# Seed a Splunk, generate + build a dashpub site from the fixtures, run the
# render suite against it. See e2e/README.md.
set -euo pipefail

: "${SPLUNKD_URL:?set SPLUNKD_URL (and SPLUNKD_TOKEN, or SPLUNKD_USER + SPLUNKD_PASSWORD)}"
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

repo="$(cd "$(dirname "$0")/.." && pwd)"
port="${E2E_PORT:-3311}"
work="${E2E_WORKDIR:-$(mktemp -d -t dashpub-e2e.XXXXXX)}"
mkdir -p "$work"

node "$repo/e2e/seed-splunk.mjs" --wait

export DASHPUB_APP=dashpub_e2e DASHPUB_PROJECTNAME=app DASHPUB_FOLDERNAME=app DASHPUB_VERCEL=n
DASHPUB_DASHBOARDS="$(node -e "import('$repo/e2e/fixtures.mjs').then(m => console.log(m.DASHBOARDS.map(d => d.id).join(',')))")"
export DASHPUB_DASHBOARDS

echo "Generating the site in $work/app"
(cd "$work" && node "$repo/cli/cli.js" init >"$work/init.log" 2>&1) || { tail -40 "$work/init.log"; exit 1; }
(cd "$work/app" && npm run build >"$work/build.log" 2>&1) || { tail -40 "$work/build.log"; exit 1; }

(cd "$work/app" && PORT="$port" exec node server.js >"$work/server.log" 2>&1) &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "http://127.0.0.1:$port/health" && break
    kill -0 "$server" 2>/dev/null || { tail -40 "$work/server.log"; exit 1; }
    sleep 1
done

cd "$repo/template"
PLAYWRIGHT_SKIP_WEBSERVER=1 CI=1 BASE_URL="http://127.0.0.1:$port" npx playwright test --project=render "$@"
