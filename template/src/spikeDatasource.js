/*
 * SpikeDataSource — Phase 0 spike for safe inputs/tokens (see
 * docs/proposals/inputs-tokens.md).
 *
 * Demonstrates the full secure flow in the browser:
 *   1. The framework substitutes the selected input value into this datasource's
 *      `options.tokenBindings` map (raw value, never SPL) — confirmed in Phase 0.
 *   2. We forward ONLY those values to the validating server endpoint
 *      `/api/spike/data/<id>?t.<name>=<value>`. The real SPL template lives
 *      server-side; the server validates each value against an allow-list and
 *      substitutes safely. A token change re-instantiates this datasource (via
 *      DataSource.equals on options) → automatic re-fetch.
 *
 * It also records what it received on window.__SPIKE_LOG for the gating test.
 */
import DataSource from '@splunk/datasources/DataSource';
import DataSet from '@splunk/datasource-utils/DataSet';

let SEQ = 0;

function record(entry) {
    try {
        if (typeof window !== 'undefined') {
            window.__SPIKE_LOG = window.__SPIKE_LOG || [];
            window.__SPIKE_LOG.push(entry);
        }
        // eslint-disable-next-line no-console
        console.log('[SPIKE]', JSON.stringify(entry));
    } catch (e) {
        /* ignore */
    }
}

function safeClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return { __unserializable: true };
    }
}

function buildUrl(spikeDsId, bindings) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(bindings || {})) {
        if (Array.isArray(value)) {
            value.forEach((v) => params.append(`t.${name}`, String(v)));
        } else if (value != null && value !== '') {
            params.append(`t.${name}`, String(value));
        }
    }
    const qs = params.toString();
    return `/api/spike/data/${encodeURIComponent(spikeDsId)}${qs ? `?${qs}` : ''}`;
}

export default class SpikeDataSource extends DataSource {
    constructor(options = {}, context = {}, meta = {}, baseChainModel = {}) {
        super(options, context, meta, baseChainModel);
        this._n = ++SEQ;
        record({ event: 'construct', n: this._n, options: safeClone(options) });
    }

    request(requestParams) {
        return (observer) => {
            let aborted = false;
            const opts = this.options || {};
            const bindings = opts.tokenBindings || {};
            record({ event: 'request', n: this._n, options: safeClone(opts) });

            observer.next({
                data: DataSet.empty(),
                meta: { sid: 'spike', percentComplete: 0, status: 'running', totalCount: 0, lastUpdated: new Date().toISOString() },
            });

            if (!opts.spikeDsId) {
                // No server datasource configured: echo the bound value (gating-only mode).
                const seen = bindings.cluster != null ? String(bindings.cluster) : 'NONE';
                const ds = DataSet.fromJSONCols(['token_seen'], [[seen]]);
                observer.next({ data: ds.toJSONCols(), meta: { sid: 'spike', percentComplete: 100, status: 'done', totalCount: 1, lastUpdated: new Date().toISOString() } });
                observer.complete && observer.complete();
                return () => {};
            }

            const url = buildUrl(opts.spikeDsId, bindings);
            record({ event: 'fetch', n: this._n, url });

            (async () => {
                try {
                    const res = await fetch(url);
                    if (aborted) return;
                    const body = await res.json();
                    if (!res.ok) {
                        record({ event: 'fetch_error', n: this._n, status: res.status, body });
                        observer.error && observer.error({ level: 'error', message: `${body.error || 'error'} (${body.code || res.status})` });
                        return;
                    }
                    record({ event: 'fetch_ok', n: this._n, query: body.meta && body.meta.spike && body.meta.spike.query, rows: (body.columns && body.columns[0] && body.columns[0].length) || 0 });
                    observer.next({
                        data: { fields: body.fields || [], columns: body.columns || [] },
                        meta: { sid: 'spike', percentComplete: 100, status: 'done', totalCount: (body.columns && body.columns[0] ? body.columns[0].length : 0), lastUpdated: new Date().toISOString() },
                    });
                    observer.complete && observer.complete();
                } catch (e) {
                    if (!aborted) {
                        record({ event: 'fetch_exception', n: this._n, message: e.message });
                        observer.error && observer.error({ level: 'error', message: e.message });
                    }
                }
            })();

            return () => {
                aborted = true;
            };
        };
    }
}
