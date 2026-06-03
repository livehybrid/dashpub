/*
 * Integration test for the inputs/tokens spike endpoint against LIVE Splunk.
 * Requires the dashpub server running with Splunk creds (see .env).
 *   BASE=http://localhost:3021 node tests/inputs-tokens/integration.spike.mjs
 *
 * Proves end-to-end: validated token values drive a server-held template against
 * real Splunk, valid values change the data, and SPL injection / out-of-set /
 * unknown tokens FAIL CLOSED (HTTP 400) before any search runs.
 */
const BASE = process.env.BASE || 'http://localhost:3021';
let pass = 0;
let fail = 0;
const ok = (name, cond, extra) => {
    if (cond) { pass++; console.log(`  ok  ${name}`); }
    else { fail++; console.log(`NOT ok ${name}${extra ? '  ->  ' + extra : ''}`); }
};

async function get(qs) {
    const res = await fetch(`${BASE}/api/spike/data/spike_main${qs}`);
    let body;
    try { body = await res.json(); } catch { body = {}; }
    return { status: res.status, body };
}
const total = (body) => {
    const cols = body.columns || [];
    const last = cols[cols.length - 1] || [];
    return last.reduce((s, v) => s + Number(v || 0), 0);
};

(async () => {
    console.log(`# inputs/tokens spike integration (BASE=${BASE})`);

    // --- happy paths: valid values return data, and prod != dev -------------
    const prod = await get('?t.cluster=prod');
    ok('prod returns 200 with rows', prod.status === 200 && (prod.body.columns?.[0]?.length || 0) > 0, JSON.stringify(prod.body).slice(0, 120));
    const dev = await get('?t.cluster=dev');
    ok('dev returns 200 with rows', dev.status === 200 && (dev.body.columns?.[0]?.length || 0) > 0);
    ok('prod and dev yield different totals (token actually changes data)', total(prod.body) !== total(dev.body), `prod=${total(prod.body)} dev=${total(dev.body)}`);
    ok('safe query is quoted (no raw injection surface)', /cluster="prod"/.test(prod.body.meta?.spike?.query || ''), prod.body.meta?.spike?.query);

    // --- dynamic multi: in-set members expand safely ------------------------
    const multi = await get('?t.cluster=prod&t.hosts=web1&t.hosts=web2');
    ok('dynamic multi in-set => 200', multi.status === 200);
    ok('dynamic multi expands to host IN (...)', /host IN \("web1", "web2"\)/.test(multi.body.meta?.spike?.query || ''), multi.body.meta?.spike?.query);

    // --- INJECTION / out-of-set / unknown => fail closed (400) --------------
    const attacks = [
        ['cluster injection (quote+delete)', '?t.cluster=' + encodeURIComponent('prod" | delete')],
        ['cluster out-of-set (*)', '?t.cluster=' + encodeURIComponent('*')],
        ['cluster command injection', '?t.cluster=' + encodeURIComponent('prod | sendemail to=x@y.com')],
        ['dynamic host not in populate set', '?t.cluster=prod&t.hosts=web1&t.hosts=' + encodeURIComponent('evil" | delete')],
        ['unknown token name', '?t.cluster=prod&t.evil=' + encodeURIComponent('x')],
    ];
    for (const [name, qs] of attacks) {
        const r = await get(qs);
        ok(`fail-closed: ${name} => 400`, r.status === 400 && r.body.error === 'token_validation_failed', `status=${r.status} body=${JSON.stringify(r.body).slice(0, 120)}`);
    }

    // --- default applies when token absent ----------------------------------
    const def = await get('');
    ok('absent cluster uses default (prod)', def.status === 200 && /cluster="prod"/.test(def.body.meta?.spike?.query || ''), def.body.meta?.spike?.query);

    console.log(`\n# pass ${pass}  fail ${fail}`);
    process.exit(fail ? 1 : 0);
})();
