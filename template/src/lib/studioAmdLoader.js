/*
 * studioAmdLoader — loads an AMD-packaged Splunk Dashboard Studio custom viz
 * (the official 10.x framework shape: `define([deps], factory)`, built with
 * React / @splunk/* as externals and loaded via RequireJS inside Splunk).
 *
 * dashpub has no RequireJS, so we provide a minimal AMD `define` shim on the
 * page, inject the bundle as a <script>, resolve its externals from a caller
 * supplied map, and capture the exported viz `definition`. The definition's
 * `.visualization` is an ordinary React component that we then render inline
 * with dashpub's own React (shared instance — no iframe).
 *
 * Pure browser JS (no bare imports): the caller injects `externals`
 * (e.g. { react: React, 'react-dom': ReactDOM }) so this module can be loaded
 * as raw ESM in a test as well as bundled by Vite via StudioAmdHost.
 */

const cache = new Map(); // url -> Promise<definition>

// Only one bundle may own `window.define` at a time, so serialise loads.
let chain = Promise.resolve();

function injectScript(url) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = () => resolve(s);
        s.onerror = () => reject(new Error(`Failed to load AMD bundle: ${url}`));
        document.head.appendChild(s);
    });
}

function unwrapDefinition(moduleExports) {
    // webpack ESM output exposes the default export as `.default`; some bundles
    // assign the definition directly.
    if (moduleExports && moduleExports.default && moduleExports.default.visualization) {
        return moduleExports.default;
    }
    if (moduleExports && moduleExports.visualization) return moduleExports;
    if (moduleExports && moduleExports.default) return moduleExports.default;
    return moduleExports;
}

async function loadOne(url, externals) {
    const prevDefine = window.define;
    const prevRequire = window.require;

    let captured;
    const resolveDep = (name) => {
        if (name === 'require') return window.require;
        if (name === 'exports') return {};
        if (name in externals) return externals[name];
        // eslint-disable-next-line no-console
        console.warn(`[dashpub] AMD viz requested unprovided external "${name}" — supplying {}`);
        return {};
    };

    const shimDefine = (deps, factory) => {
        // Support define(factory) and define(name, deps, factory) signatures.
        if (typeof deps === 'function') { factory = deps; deps = []; }
        else if (typeof factory !== 'function' && Array.isArray(factory) === false && arguments.length >= 3) {
            // define(name, deps, factory)
            // (handled by the variadic capture below)
        }
        const resolved = (deps || []).map(resolveDep);
        captured = typeof factory === 'function' ? factory(...resolved) : factory;
    };
    shimDefine.amd = {};
    window.define = shimDefine;

    try {
        const script = await injectScript(url);
        if (script.parentNode) script.parentNode.removeChild(script);
    } finally {
        window.define = prevDefine;
        window.require = prevRequire;
    }

    if (captured === undefined) {
        throw new Error(`AMD bundle ${url} did not call define()`);
    }
    const definition = unwrapDefinition(captured);
    if (!definition || typeof definition.visualization !== 'function') {
        throw new Error(`AMD bundle ${url} did not export a definition with a React .visualization`);
    }
    return definition;
}

export function loadStudioAmdViz(url, externals = {}) {
    if (cache.has(url)) return cache.get(url);
    const p = (chain = chain.then(() => loadOne(url, externals), () => loadOne(url, externals)));
    cache.set(url, p);
    return p;
}
