/*
 * studioExtensionBridge — framework-agnostic host for "iframe extension" style
 * packaged Splunk Dashboard Studio custom visualizations (the IIFE bundles that
 * talk to globalThis.DashboardExtensionAPI).
 *
 * This is pure browser JS (no React) so it can be unit-tested directly against
 * a real packaged visualization.js. StudioExtensionHost.jsx is a thin React
 * wrapper over mountStudioExtension().
 */

// Normalise dashboard-core's `dataSources` prop into the shape a packaged
// studio viz expects from getDataSources():
//   { <name>: { data: { fields: [{name}], columns: [[...], ...] } } }
export function normaliseDataSources(dataSources = {}) {
    const out = {};
    for (const [name, ds] of Object.entries(dataSources || {})) {
        const data = ds && ds.data ? ds.data : ds;
        if (!data) continue;
        out[name] = {
            ...ds,
            data: {
                fields: data.fields || [],
                columns: data.columns || (Array.isArray(data.rows)
                    ? transposeRows(data.fields, data.rows)
                    : []),
                meta: data.meta,
            },
        };
    }
    return out;
}

function transposeRows(fields = [], rows = []) {
    const n = (fields || []).length;
    const cols = Array.from({ length: n }, () => []);
    for (const row of rows) for (let c = 0; c < n; c++) cols[c].push(row[c]);
    return cols;
}

// Build the DashboardExtensionAPI the packaged viz polls for. Known methods are
// implemented; anything else is stubbed and logged so a viz reaching for an
// editor-only / eventing API still renders in a view-only deployment.
function makeExtensionApi(initialOptions, initialDataSources) {
    const state = {
        options: initialOptions || {},
        dataSources: initialDataSources || {},
        optionsListeners: [],
        dataListeners: [],
    };
    const impl = {
        addOptionsListener(cb) {
            state.optionsListeners.push(cb);
            try { cb(state.options); } catch (e) { /* viz error */ }
            return () => { state.optionsListeners = state.optionsListeners.filter((f) => f !== cb); };
        },
        addDataSourcesListener(cb) {
            state.dataListeners.push(cb);
            try { cb(state.dataSources); } catch (e) { /* viz error */ }
            return () => { state.dataListeners = state.dataListeners.filter((f) => f !== cb); };
        },
        getOptions() { return state.options; },
        getDataSources() { return state.dataSources; },
    };
    const api = new Proxy(impl, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === 'symbol') return undefined;
            return (...args) => {
                // eslint-disable-next-line no-console
                console.warn(`[dashpub] DashboardExtensionAPI.${String(prop)}() is not implemented (view-only host) — ignoring`, args);
                return undefined;
            };
        },
    });
    return { api, state };
}

/*
 * Mount a packaged studio viz into an iframe element.
 *   iframe     a (rendered) <iframe> element
 *   assetBase  URL base where visualization.js / .css are served, e.g.
 *              "/custom_viz/<type>"
 * Returns { update({options, dataSources}), destroy() }.
 */
export function mountStudioExtension(iframe, { assetBase, options = {}, dataSources = {} }) {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument || (win && win.document);
    if (!win || !doc) throw new Error('mountStudioExtension: iframe has no content document');

    const { api, state } = makeExtensionApi(options, normaliseDataSources(dataSources));

    doc.open();
    doc.write(
        '<!doctype html><html><head><meta charset="utf-8">' +
        `<link rel="stylesheet" href="${assetBase}/visualization.css">` +
        '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent}#root{position:absolute;inset:0}</style>' +
        '</head><body><div id="root"></div>' +
        `<script src="${assetBase}/visualization.js"><\/script>` +
        '</body></html>'
    );
    doc.close();

    // Set the API global AFTER doc.close(): document.open()/write() resets the
    // iframe window and would wipe a global set beforehand. The packaged viz
    // polls for globalThis.DashboardExtensionAPI, so setting it here is picked
    // up on its first tick.
    win.DashboardExtensionAPI = api;

    return {
        update({ options: nextOptions, dataSources: nextDataSources } = {}) {
            if (nextOptions !== undefined) {
                state.options = nextOptions || {};
                state.optionsListeners.forEach((cb) => { try { cb(state.options); } catch (e) { /* viz */ } });
            }
            if (nextDataSources !== undefined) {
                state.dataSources = normaliseDataSources(nextDataSources);
                state.dataListeners.forEach((cb) => { try { cb(state.dataSources); } catch (e) { /* viz */ } });
            }
        },
        destroy() {
            state.optionsListeners = [];
            state.dataListeners = [];
            try { delete win.DashboardExtensionAPI; } catch (e) { /* ignore */ }
        },
    };
}
