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

import crypto from 'crypto';

const makeId = ds => {
    const h = crypto.createHash('sha256');
    if (ds.query) {
        h.write(ds.query);
    }
    if (ds.ref) {
        h.write(`savedsearch:${ds.ref}`);
    }
    if (ds.app) {
        h.write(`app:${ds.app}`);
    }
    if (ds.queryParameters) {
        if (ds.queryParameters.earliest) {
            h.write(ds.queryParameters.earliest);
        }
        if (ds.queryParameters.latest) {
            h.write(ds.queryParameters.latest);
        }
    }
    if (ds.refresh) {
        h.write(toString(ds.refresh));
    }
    if (ds.postprocess) {
        h.write(ds.postprocess);
    }
    h.end();
    const s = h.digest('hex').slice(0, 24);
    let res = '';
    for (let i = 0; i < s.length; i += 2) {
        res += (parseInt(s.slice(i, i + 2), 16) % 36).toString(36)[0];
    }
    return res;
};

const units = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
};

function parseRefreshTime(refresh, dsDefaults, defaultValue = 400) {
    var dsDefaultRefresh = false
    if ((typeof(refresh)=="undefined") && (typeof(dsDefaults)=="object" && typeof(dsDefaults.options)=="object" && typeof(dsDefaults.options.refresh!=="undefined"))) {
        dsDefaultRefresh = dsDefaults.options.refresh
    }
    refresh = refresh || dsDefaultRefresh
    if (typeof refresh === 'number') {
        return refresh;
    }
    if (typeof refresh === 'string') {
        const m = refresh.match(/^(\d+)(ms|s|m|h)$/);
        if (m) {
            const v = parseInt(m[1]);
            if (!isNaN(v)) {
                const u = units[m[2]];
                if (u) {
                    const ms = v * u;

                    if (ms < 1000) {
                        console.log('WARN: Ignoring sub-second refresh time');
                        return defaultValue;
                    }
                    return Math.floor(ms / 1000);
                }
            }
        }
        const n = parseInt(refresh, 10);
        if (!isNaN(n)) {
            return n;
        }
    }
    return defaultValue;
}

// Join post-process fragments into a single pipeline. The first fragment is kept
// verbatim so single-level chains produce exactly what they always have.
function appendPostprocess(existing, query) {
    const next = (query || '').trim();
    if (!next) {
        return existing;
    }
    if (!existing) {
        return next;
    }
    return `${existing} ${next.startsWith('|') ? next : `| ${next}`}`;
}

// Collapse a ds.chain onto the search it ultimately extends. A chain may extend
// another chain, in which case every hop's SPL becomes part of one post-process
// pipeline over the root search - resolving only one level would silently drop
// the root search and run the intermediate post-process as a standalone query.
function resolveDataSourceSettings(key, ds, allDataSources, seen = new Set()) {
    if (ds.type !== 'ds.chain') {
        return ds.options;
    }
    if (seen.has(key)) {
        throw new Error(`Circular ds.chain reference involving data source ${key}`);
    }
    seen.add(key);

    const { extend } = ds.options;
    const base = allDataSources[extend];
    if (!base) {
        throw new Error(`Unable to find base search ${extend} for data source ${key}`);
    }

    const baseSettings = resolveDataSourceSettings(extend, base, allDataSources, seen);
    return {
        ...baseSettings,
        postprocess: appendPostprocess(baseSettings.postprocess, ds.options.query),
    };
}

async function generateCdnDataSource([key, ds], app, allDataSources, defaults) {
    if (ds.type === 'ds.test') {
        return [[],[key, ds]];
    }
    const settings = resolveDataSourceSettings(key, ds, allDataSources);

    // ds.savedSearch references a report by name rather than carrying SPL. Keep the
    // reference intact so the server can resolve it against the report's scheduled
    // artifacts at request time (see resolveSavedSearchJob in template/server.js).
    if (!settings.query && !settings.ref) {
        console.log(
            `WARN: Skipping data source ${key} (type ${ds.type || 'unknown'}) - no query or saved search ref. ` +
                'Visualizations bound to it will render without data.'
        );
        return null;
    }

    const dsApp = settings.app || app;
    const id = makeId({ ...settings, app: dsApp });
    const refreshVal = parseRefreshTime(ds.options.refresh, defaults['ds.search']);
    const dataSourceManifest = [
        id,
        {
            search: { ...settings, refresh: refreshVal },
            app: dsApp,
            id,
        },
    ];

    const dataSourceDefinition = [
        key,
        {
            type: 'ds.cdn',
            name: ds.name,
            options: {
                uri: `/api/data/${id}`,
                enableSmartSources: true,
                refresh: refreshVal
            },
        },
    ];

    return [dataSourceManifest, dataSourceDefinition];
}

async function generateCdnDataSources(def, app, projectDir) {
    const defaults = (def.defaults || {}).dataSources || {}
    const results = []; //await Promise.all(Object.entries(def.dataSources || {}).map(e => generateCdnDataSource(e, def.dataSources)));
    for (const e of Object.entries(def.dataSources || {})) {
        const res = await generateCdnDataSource(e, app, def.dataSources, defaults);
        if (res != null) {
            results.push(res);
        }
    }
    const dsManifest = Object.fromEntries(results.map(r => r[0]));
    const dataSourceDefinition = Object.fromEntries(results.map(r => r[1]));

    return [
        dsManifest,
        {
            ...def,
            dataSources: dataSourceDefinition,
        },
    ];
}

export { generateCdnDataSources };
