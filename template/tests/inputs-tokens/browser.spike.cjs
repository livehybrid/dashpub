/*
 * Browser test for the inputs/tokens spike. Drives the rendered dashboard with a
 * real headless Chrome: confirms the dropdown's selected value flows through the
 * custom datasource to the validating server endpoint, hits live Splunk, and that
 * changing the input changes the rendered data.
 *
 * Requires: dashpub server running at BASE with the token-spike dashboard built.
 *   BASE=http://localhost:3021 node tests/inputs-tokens/browser.spike.cjs
 */
const puppeteer = require('puppeteer');
const BASE = process.env.BASE || 'http://localhost:3021';

let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log(`  ok  ${n}`); } else { fail++; console.log(`NOT ok ${n}${extra ? '  ->  ' + extra : ''}`); } };

async function tableText(p) {
    return p.evaluate(() => { const t = document.querySelector('table'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
}

(async () => {
    console.log(`# inputs/tokens spike browser test (BASE=${BASE})`);
    const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const p = await b.newPage();
    const fetches = [];
    p.on('console', (m) => { const t = m.text(); if (t.startsWith('[SPIKE]')) { try { const e = JSON.parse(t.slice(8)); if (e.event === 'fetch') fetches.push(e.url); } catch {} } });

    await p.goto(`${BASE}/token-spike`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    // wait for the table to populate with Splunk data
    await p.waitForFunction(() => { const t = document.querySelector('table'); return t && /web/i.test(t.innerText); }, { timeout: 30000 }).catch(() => {});
    const prodText = await tableText(p);
    console.log('  prod table:', prodText.slice(0, 120));
    ok('initial (prod) table shows Splunk host rows', /web/i.test(prodText));
    ok('datasource fetched the validated endpoint with t.cluster=prod', fetches.some((u) => /spike_main\?t\.cluster=prod/.test(u)), fetches.join(' , '));

    // change dropdown prod -> dev
    await p.evaluate(() => { const btn = document.querySelector('button[data-test="select"]'); if (btn) btn.click(); });
    await new Promise((r) => setTimeout(r, 700));
    const clicked = await p.evaluate(() => { const o = [...document.querySelectorAll('[role="option"],[data-test="option"]')].find((e) => /dev/i.test(e.textContent || '')); if (o) { o.click(); return true; } return false; });
    ok('selected "Dev" in dropdown', clicked);
    // wait for the table to change
    await p.waitForFunction((prev) => { const t = document.querySelector('table'); return t && t.innerText.replace(/\s+/g, ' ').trim() !== prev; }, { timeout: 30000 }, prodText).catch(() => {});
    const devText = await tableText(p);
    console.log('  dev  table:', devText.slice(0, 120));

    ok('changing the input changed the rendered data (prod != dev)', prodText && devText && prodText !== devText, `prod="${prodText}" dev="${devText}"`);
    ok('datasource re-fetched with t.cluster=dev', fetches.some((u) => /spike_main\?t\.cluster=dev/.test(u)), fetches.join(' , '));

    await b.close();
    console.log(`\n# pass ${pass}  fail ${fail}`);
    process.exit(fail ? 1 : 0);
})();
