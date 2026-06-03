/*
 * Self-contained render test for sideloaded custom visualizations.
 * ---------------------------------------------------------------------------
 * Exercises the REAL host libraries (src/lib/studioExtensionBridge.js and
 * src/lib/studioAmdLoader.js) against the REAL packaged viz bundles shipped in
 * examples/custom-viz/sample-splunk-apps, in a real headless Chrome, and
 * asserts each actually draws to its canvas. No Splunk, no container, no build.
 *
 *   node tests/custom-viz/render.mjs      (or: npm run test:custom-viz)
 *
 * Covers both packaging flavours:
 *   - iframe  + DashboardExtensionAPI   (viz-airspace-radar.airspace_radar)
 *   - AMD     + React component inline  (viz-realtime-clock.realtime_clock)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.resolve(HERE, '..', '..');                 // template/
const APPS = path.resolve(TPL, '..', 'examples', 'custom-viz', 'sample-splunk-apps');
const vizDir = (app, viz) => path.join(APPS, app, 'appserver', 'static', 'visualizations', viz);

const RADAR = 'viz-airspace-radar.airspace_radar';
const CLOCK = 'viz-realtime-clock.realtime_clock';
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' };

// ---- static fixture server -------------------------------------------------
const routes = {
    '/lib/studioExtensionBridge.js': path.join(TPL, 'src/lib/studioExtensionBridge.js'),
    '/lib/studioAmdLoader.js': path.join(TPL, 'src/lib/studioAmdLoader.js'),
    '/react.js': path.join(TPL, 'node_modules/react/umd/react.development.js'),
    '/react-dom.js': path.join(TPL, 'node_modules/react-dom/umd/react-dom.development.js'),
    [`/custom_viz/${RADAR}/visualization.js`]: path.join(vizDir('viz-airspace-radar', 'airspace_radar'), 'visualization.js'),
    [`/custom_viz/${RADAR}/visualization.css`]: path.join(vizDir('viz-airspace-radar', 'airspace_radar'), 'visualization.css'),
    [`/custom_viz/${CLOCK}/visualization.js`]: path.join(vizDir('viz-realtime-clock', 'realtime_clock'), 'visualization.js'),
};

const radarData = {
    primary: { data: {
        fields: ['hex', 'callsign', 'lat', 'lon', 'altitude_ft', 'heading', 'speed_kts'].map((name) => ({ name })),
        columns: [
            ['4ca1f1', '40621d', '407e3b'], ['BAW123', 'EZY8412', 'RYR45GT'],
            [53.95, 53.62, 54.05], [-1.20, -1.92, -1.40],
            [37000, 12500, 28000], [110, 250, 70], [450, 280, 390],
        ],
    } },
};

const HARNESS = {
    // iframe + DashboardExtensionAPI path → real studioExtensionBridge.js
    [`/__iframe`]: `<!doctype html><html><body>
<iframe id="f" sandbox="allow-scripts allow-same-origin" style="width:520px;height:520px;border:0"></iframe>
<script type="module">
  import { mountStudioExtension } from '/lib/studioExtensionBridge.js';
  mountStudioExtension(document.getElementById('f'), {
    assetBase: '/custom_viz/${RADAR}',
    options: { rangeNm:50, colorScheme:'green', sweepSeconds:4, homeLabel:'Leeds' },
    dataSources: ${JSON.stringify(radarData)},
  });
</script></body></html>`,
    // AMD path → real studioAmdLoader.js, React UMD as externals
    [`/__amd`]: `<!doctype html><html><body>
<div id="mount" style="width:300px;height:300px"></div>
<script src="/react.js"></script><script src="/react-dom.js"></script>
<script type="module">
  import { loadStudioAmdViz } from '/lib/studioAmdLoader.js';
  try {
    const def = await loadStudioAmdViz('/custom_viz/${CLOCK}/visualization.js', { react: window.React, 'react-dom': window.ReactDOM });
    window.__vizName = def.name;
    window.ReactDOM.createRoot(document.getElementById('mount'))
      .render(window.React.createElement(def.visualization, { width:300, height:300, options:{ timezone:'utc' }, dataSources:{} }));
  } catch (e) { window.__error = String(e && e.message || e); }
</script></body></html>`,
};

const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (HARNESS[url]) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(HARNESS[url]); return; }
    const file = routes[url];
    if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

// ---- helpers ---------------------------------------------------------------
function countPixels(page, canvasSelector, inIframe) {
    return page.evaluate(({ sel, iframe }) => {
        if (window.__error) return { error: window.__error };
        const root = iframe ? document.getElementById('f').contentDocument : document;
        const canvas = root && root.querySelector(sel);
        if (!canvas) return { canvas: false };
        const ctx = canvas.getContext('2d');
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let nonBlank = 0, green = 0;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
            if (a !== 0 && (r || g || b)) nonBlank++;
            if (g > 120 && r < 120) green++;
        }
        return { canvas: true, nonBlank, green, vizName: window.__vizName };
    }, { sel: canvasSelector, iframe: inIframe });
}

async function pollRender(page, sel, inIframe, predicate) {
    let result = { canvas: false };
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
        result = await countPixels(page, sel, inIframe);
        if (result.error || predicate(result)) break;
        await new Promise((r) => setTimeout(r, 200));
    }
    return result;
}

// ---- run -------------------------------------------------------------------
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const failures = [];

async function newPage() {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('page: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    return { page, errors };
}

// Case 1: iframe + DashboardExtensionAPI (radar)
{
    const { page, errors } = await newPage();
    await page.goto(`${base}/__iframe`, { waitUntil: 'load' });
    const r = await pollRender(page, 'canvas', true, (x) => x.canvas && x.nonBlank > 500 && x.green > 100);
    const ok = r.canvas && r.nonBlank > 500 && r.green > 100 && !r.error && errors.length === 0;
    console.log(`[iframe ] radar  ${ok ? 'PASS ✓' : 'FAIL ✗'}  ${JSON.stringify(r)} ${errors.length ? JSON.stringify(errors) : ''}`);
    if (!ok) failures.push('iframe/radar');
    await page.close();
}

// Case 2: AMD module rendered inline (clock)
{
    const { page, errors } = await newPage();
    await page.goto(`${base}/__amd`, { waitUntil: 'load' });
    const r = await pollRender(page, '#mount canvas', false, (x) => x.canvas && x.nonBlank > 500);
    const ok = r.canvas && r.nonBlank > 500 && r.vizName === 'realtime_clock' && !r.error && errors.length === 0;
    console.log(`[amd    ] clock  ${ok ? 'PASS ✓' : 'FAIL ✗'}  ${JSON.stringify(r)} ${errors.length ? JSON.stringify(errors) : ''}`);
    if (!ok) failures.push('amd/clock');
    await page.close();
}

await browser.close();
server.close();

if (failures.length) { console.error(`\nFAILED: ${failures.join(', ')}`); process.exit(1); }
console.log('\nAll custom-viz render checks passed ✓');
process.exit(0);
