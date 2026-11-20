#!/usr/bin/env node
/*
 * Create (or remove) the render-suite fixtures in a Splunk instance over REST.
 *
 *   node e2e/seed-splunk.mjs            create/update app, saved search, views
 *   node e2e/seed-splunk.mjs --remove   delete the app again
 *   node e2e/seed-splunk.mjs --wait     first wait for splunkd to answer
 *
 * Reads the same variables dashpub does: SPLUNKD_URL plus either SPLUNKD_TOKEN
 * or SPLUNKD_USER / SPLUNKD_PASSWORD. Everything lives in one app
 * (`dashpub_e2e`), so removing that app removes every trace.
 */
import { APP, SAVED_SEARCH, DASHBOARDS, viewXml } from './fixtures.mjs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';

const url = (process.env.SPLUNKD_URL || '').replace(/\/$/, '');
const token = process.env.SPLUNKD_TOKEN;
const user = process.env.SPLUNKD_USER || process.env.SPLUNKD_USERNAME || 'admin';
const password = process.env.SPLUNKD_PASSWORD;

if (!url || (!token && !password)) {
    console.error('Set SPLUNKD_URL and SPLUNKD_TOKEN, or SPLUNKD_URL with SPLUNKD_USER and SPLUNKD_PASSWORD.');
    process.exit(2);
}

const isJwt = (t) => /^[\w-]+\.[\w-]+\.[\w-]+$/.test(t);
const authorization = token
    ? `${isJwt(token) ? 'Bearer' : 'Splunk'} ${token}`
    : `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

async function splunkd(method, path, form) {
    const res = await fetch(`${url}${path}${path.includes('?') ? '&' : '?'}output_mode=json`, {
        method,
        headers: {
            Authorization: authorization,
            ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
    });
    return { status: res.status, text: await res.text() };
}

async function must(label, method, path, form, ok = [200, 201]) {
    const res = await splunkd(method, path, form);
    if (!ok.includes(res.status)) {
        throw new Error(`${label}: HTTP ${res.status} from ${method} ${path}\n${res.text.slice(0, 600)}`);
    }
    return res;
}

async function waitForSplunk(timeoutMs = 300000) {
    const deadline = Date.now() + timeoutMs;
    let last = '';
    while (Date.now() < deadline) {
        try {
            const res = await splunkd('GET', '/services/server/info');
            if (res.status === 200) {
                const version = JSON.parse(res.text).entry[0].content.version;
                console.log(`splunkd is up (version ${version})`);
                return;
            }
            last = `HTTP ${res.status}`;
        } catch (e) {
            last = e.cause ? `${e.message}: ${e.cause.code || e.cause.message}` : e.message;
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error(`splunkd did not answer within ${timeoutMs / 1000}s (last: ${last})`);
}

async function remove() {
    const res = await splunkd('DELETE', `/services/apps/local/${APP}`);
    if (![200, 404].includes(res.status)) throw new Error(`remove app: HTTP ${res.status}\n${res.text.slice(0, 400)}`);
    console.log(res.status === 200 ? `removed app ${APP}` : `app ${APP} was not installed`);
}

async function seed() {
    const ns = `/servicesNS/nobody/${APP}`;

    const app = await splunkd('GET', `/services/apps/local/${APP}`);
    if (app.status === 404) {
        await must('create app', 'POST', '/services/apps/local', {
            name: APP,
            label: 'dashpub E2E fixtures',
            visible: 'true',
            author: 'dashpub',
            description: 'Fixture dashboards for the dashpub render suite. Safe to delete.',
        });
        console.log(`created app ${APP}`);
    } else if (app.status !== 200) {
        throw new Error(`check app: HTTP ${app.status}\n${app.text.slice(0, 400)}`);
    }

    const savedPath = `${ns}/saved/searches/${encodeURIComponent(SAVED_SEARCH.name)}`;
    const saved = await splunkd('GET', savedPath);
    if (saved.status === 404) {
        await must('create saved search', 'POST', `${ns}/saved/searches`, SAVED_SEARCH);
    } else {
        await must('update saved search', 'POST', savedPath, { search: SAVED_SEARCH.search });
    }
    // Readable by every role, exported globally: dashpub may run as a low-privilege user.
    await must('share saved search', 'POST', `${savedPath}/acl`, {
        sharing: 'app',
        owner: 'nobody',
        'perms.read': '*',
    });
    console.log(`saved search ${SAVED_SEARCH.name}`);

    for (const dash of DASHBOARDS) {
        const xml = viewXml(dash);
        const viewPath = `${ns}/data/ui/views/${dash.id}`;
        const existing = await splunkd('GET', viewPath);
        if (existing.status === 404) {
            await must(`create view ${dash.id}`, 'POST', `${ns}/data/ui/views`, { name: dash.id, 'eai:data': xml });
        } else {
            await must(`update view ${dash.id}`, 'POST', viewPath, { 'eai:data': xml });
        }
        await must(`share view ${dash.id}`, 'POST', `${viewPath}/acl`, {
            sharing: 'app',
            owner: 'nobody',
            'perms.read': '*',
        });
        console.log(`view ${dash.id}`);
    }
    console.log(`DASHPUB_APP=${APP}`);
    console.log(`DASHPUB_DASHBOARDS=${DASHBOARDS.map((d) => d.id).join(',')}`);
}

const args = new Set(process.argv.slice(2));
try {
    if (args.has('--wait')) await waitForSplunk();
    if (args.has('--remove')) await remove();
    else await seed();
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
