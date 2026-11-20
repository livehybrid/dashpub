/*
 * Render suite: does every Splunk visualization type draw its data?
 *
 * Runs against a dashpub instance generated from the fixture dashboards in
 * e2e/fixtures.mjs (seeded into Splunk by e2e/seed-splunk.mjs). The data is
 * `makeresults`, so the same exact values are expected on any Splunk, and
 * nothing here needs a secret: it runs on every pull request, Dependabot's
 * included.
 *
 * For each panel the suite checks, by the panel's id in the page:
 *   - the panel exists and reports the visualization type the fixture asked for
 *   - it is not showing Splunk's error or "no data" placeholder
 *   - the fixture's own values are in it (text), or the elements that only
 *     exist once the data arrived (map markers, shapes)
 * and for the page as a whole: no uncaught exception, no console error, every
 * data request answered 200 with rows.
 *
 * The last block breaks panels on purpose (through request interception, the
 * app is untouched) and asserts the same checks report them. If those tests
 * fail, the suite has stopped being able to see a broken dashboard.
 */
import { test, expect } from '@playwright/test';
import { DASHBOARDS, COVERAGE_EXEMPT, allPanels } from '../../e2e/fixtures.mjs';

const PANEL_TIMEOUT = Number(process.env.E2E_PANEL_TIMEOUT || 45000);

// 1x1 transparent PNG: stands in for every map tile so the suite does not
// depend on a third-party tile server being up.
const BLANK_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
);

/** Record everything that should never happen while a dashboard renders. */
async function watch(page) {
    const seen = { consoleErrors: [], pageErrors: [], data: [] };
    page.on('console', (msg) => {
        if (msg.type() === 'error') seen.consoleErrors.push(msg.text().slice(0, 400));
    });
    page.on('pageerror', (err) => seen.pageErrors.push(String(err).slice(0, 400)));
    page.on('response', async (res) => {
        const url = new URL(res.url());
        if (!url.pathname.startsWith('/api/data/')) return;
        const entry = { path: url.pathname, status: res.status(), rows: null };
        seen.data.push(entry);
        if (res.status() === 200) {
            try {
                const body = await res.json();
                entry.rows = Array.isArray(body.columns) && body.columns.length ? body.columns[0].length : 0;
            } catch {
                entry.rows = -1; // not JSON
            }
        }
    });
    // Nothing outside the instance under test is reachable. Map tiles get a
    // blank image (with CORS, the map engine fetches them); the rest is refused.
    const origin = new URL(test.info().project.use.baseURL).origin;
    await page.route(
        (url) => url.origin !== origin,
        (route) =>
            /\.(png|jpe?g|webp)$/i.test(new URL(route.request().url()).pathname)
                ? route.fulfill({
                      status: 200,
                      contentType: 'image/png',
                      headers: { 'access-control-allow-origin': '*' },
                      body: BLANK_PNG,
                  })
                : route.abort()
    );
    return seen;
}

const panelLocator = (page, panel) =>
    page.locator(
        panel.type === 'abslayout.line'
            ? `[data-test="line-box"][data-id="${panel.id}"]`
            : `[data-test="viz-item"][data-id="${panel.id}"]`
    );

/**
 * Everything wrong with one panel, as a list of sentences (empty = healthy).
 * Returns problems instead of asserting so the "can it fail" tests can call it
 * on a panel they broke and expect a non-empty answer.
 */
async function panelProblems(page, panel, timeout = PANEL_TIMEOUT) {
    const loc = panelLocator(page, panel);
    const problems = [];
    const within = async (label, fn) => {
        try {
            await fn();
        } catch (e) {
            problems.push(`${panel.id} (${panel.type}): ${label}`);
        }
    };

    try {
        await loc.waitFor({ state: 'attached', timeout });
    } catch {
        return [`${panel.id} (${panel.type}): panel is not on the page`];
    }

    const actualType = await loc.getAttribute('data-viz-type');
    if (actualType !== panel.type) {
        problems.push(`${panel.id}: rendered as ${actualType}, fixture asked for ${panel.type}`);
    }

    for (const text of panel.expectText || []) {
        await within(`expected text "${text}" never appeared`, () =>
            expect.poll(() => loc.evaluate((el) => el.textContent), { timeout }).toContain(text)
        );
    }
    if (panel.expectSelector) {
        const inner = loc.locator(panel.expectSelector);
        if (panel.expectCount !== undefined) {
            await within(`expected ${panel.expectCount} x ${panel.expectSelector}`, () =>
                expect(inner).toHaveCount(panel.expectCount, { timeout })
            );
        } else {
            await within(`expected element ${panel.expectSelector} never appeared`, () =>
                expect(inner.first()).toBeAttached({ timeout })
            );
        }
    }

    // Splunk's own failure placeholders. Checked last, so a panel that was
    // still loading above has had the full timeout to settle.
    const failure = loc.locator('[data-test="dashboard-message"], [data-test="viz-waiting-for-input"]');
    if ((await failure.count()) > 0) {
        const said = (await failure.first().textContent()) || '';
        problems.push(`${panel.id} (${panel.type}): shows a failure placeholder: "${said.trim().slice(0, 120)}"`);
    }
    return problems;
}

async function openTab(page, label) {
    await page.locator('[data-test="tab"]', { hasText: label }).click();
}

test.describe('fixture dashboards', () => {
    test('the instance serves exactly the fixture dashboards', async ({ request }) => {
        const health = await (await request.get('/health')).json();
        expect(health.services.splunk.status, 'dashpub is not connected to Splunk').toBe('connected');

        const listed = (await (await request.get('/api/dashboards')).json()).dashboards.map((d) => d.id).sort();
        expect(
            listed,
            'this suite needs dashpub generated from e2e/fixtures.mjs (DASHPUB_APP=dashpub_e2e); see e2e/README.md'
        ).toEqual(DASHBOARDS.map((d) => d.id).sort());
    });

    test('the home page links to every dashboard', async ({ page }) => {
        const seen = await watch(page);
        await page.goto('/');
        for (const dash of DASHBOARDS) {
            await expect(page.getByText(dash.title, { exact: true }).first()).toBeVisible({ timeout: PANEL_TIMEOUT });
        }
        expect(seen.pageErrors, 'uncaught exceptions on the home page').toEqual([]);
    });

    for (const dash of DASHBOARDS) {
        test(`${dash.id}: every panel renders its data`, async ({ page }, testInfo) => {
            test.setTimeout(PANEL_TIMEOUT * 4);
            const seen = await watch(page);
            await page.goto(`/${dash.id}`);

            const groups =
                dash.layout === 'tabs'
                    ? dash.tabs.map((tab) => ({ tab: tab.label, panels: allPanels(dash).filter((p) => p.tab === tab.label) }))
                    : [{ tab: null, panels: allPanels(dash) }];

            const problems = [];
            for (const group of groups) {
                if (group.tab) await openTab(page, group.tab);
                for (const panel of group.panels) {
                    problems.push(...(await panelProblems(page, panel)));
                }
                const name = `${dash.id}${group.tab ? `-${group.tab.replace(/\W+/g, '_')}` : ''}.png`;
                await testInfo.attach(name, {
                    body: await page.screenshot({ fullPage: true }),
                    contentType: 'image/png',
                });
            }
            expect(problems, 'panels that did not render correctly').toEqual([]);

            // dashpub-plus' screenshotter waits for this element before it takes
            // a dashboard's thumbnail; without it every screenshot times out.
            await expect(
                page.locator('.url2png-cheese'),
                'the "ready for screenshot" marker the screenshotter waits for'
            ).toBeAttached({ timeout: PANEL_TIMEOUT });

            // The same facts by a second route: what the server sent, not what the page drew.
            // Polled: a panel can be on the page before its request has been answered.
            const searches = allPanels(dash).filter((p) => p.query || p.dataSource).length;
            await expect
                .poll(() => new Set(seen.data.filter((d) => d.status !== 200 || d.rows !== null).map((d) => d.path)).size, {
                    message: `distinct data requests answered (${searches} panels have a search)`,
                    timeout: PANEL_TIMEOUT,
                })
                .toBeGreaterThanOrEqual(searches);
            expect(
                seen.data.filter((d) => d.status !== 200),
                'data requests that did not return 200'
            ).toEqual([]);
            expect(
                seen.data.filter((d) => d.rows !== null && !(d.rows > 0)),
                'data requests that returned no rows'
            ).toEqual([]);

            expect(seen.pageErrors, 'uncaught exceptions in the page').toEqual([]);
            expect(seen.consoleErrors, 'console errors in the page').toEqual([]);
        });
    }

    test('every registered visualization type has a fixture panel', async ({ page }) => {
        await page.goto(`/${DASHBOARDS[0].id}`);
        await page.waitForFunction(() => Array.isArray(window.__DASHPUB_VIZ_TYPES__), null, { timeout: PANEL_TIMEOUT });
        const registered = await page.evaluate(() => window.__DASHPUB_VIZ_TYPES__);
        const covered = new Set(DASHBOARDS.flatMap((d) => allPanels(d).map((p) => p.type)));

        const uncovered = registered.filter((t) => !covered.has(t) && !(t in COVERAGE_EXEMPT));
        expect(
            uncovered,
            'visualization types the Splunk packages register that no fixture panel renders. ' +
                'Add a panel to e2e/fixtures.mjs (or, with a reason, to COVERAGE_EXEMPT).'
        ).toEqual([]);

        const unknown = [...covered].filter((t) => !registered.includes(t));
        expect(unknown, 'fixture panels whose type is no longer registered').toEqual([]);
        expect(registered.length).toBeGreaterThan(20);
    });
});

test.describe('the suite can fail', () => {
    // Each test breaks one panel by rewriting a response on its way to the
    // browser, then expects panelProblems() to name that panel while a healthy
    // neighbour on the same page stays clean. Short timeout: these panels are
    // meant never to recover.
    const dash = DASHBOARDS.find((d) => d.id === 'e2e_values');
    const panel = (id) => dash.panels.find((p) => p.id === id);
    const QUICK = 6000;

    async function rewriteDefinition(page, mutate) {
        await page.route(`**/api/dashboards/${dash.id}/definition`, async (route) => {
            const response = await route.fetch();
            const definition = await response.json();
            mutate(definition);
            await route.fulfill({ response, json: definition });
        });
    }

    test('a visualization type that fails to load is reported', async ({ page }) => {
        await rewriteDefinition(page, (def) => {
            def.visualizations.viz_table.type = 'splunk.removed_in_a_future_release';
        });
        await page.goto(`/${dash.id}`);
        const problems = await panelProblems(page, panel('viz_table'), QUICK);
        expect(problems.join('\n')).toContain('viz_table');
        expect(await panelProblems(page, panel('viz_markergauge'))).toEqual([]);
    });

    test('a search that errors is reported', async ({ page }) => {
        let uri;
        await rewriteDefinition(page, (def) => {
            uri = def.dataSources.ds_singlevalue.options.uri;
        });
        await page.route('**/api/data/**', (route) =>
            uri && new URL(route.request().url()).pathname === uri
                ? route.fulfill({ status: 500, json: { error: 'injected by the render suite' } })
                : route.continue()
        );
        await page.goto(`/${dash.id}`);
        const problems = await panelProblems(page, panel('viz_singlevalue'), QUICK);
        expect(problems.join('\n')).toContain('viz_singlevalue');
        expect(await panelProblems(page, panel('viz_markergauge'))).toEqual([]);
    });

    test('a search that returns the wrong value is reported', async ({ page }) => {
        let uri;
        await rewriteDefinition(page, (def) => {
            uri = def.dataSources.ds_chain_total.options.uri;
        });
        await page.route('**/api/data/**', (route) =>
            uri && new URL(route.request().url()).pathname === uri
                ? route.fulfill({ status: 200, json: { fields: ['chained_total'], columns: [['100']] } })
                : route.continue()
        );
        await page.goto(`/${dash.id}`);
        const problems = await panelProblems(page, panel('viz_chain'), QUICK);
        expect(problems.join('\n')).toContain('expected text "225"');
    });

    test('a panel missing from the page is reported', async ({ page }) => {
        await rewriteDefinition(page, (def) => {
            const { viz_events, ...rest } = def.visualizations;
            def.visualizations = rest;
            def.layout.structure = def.layout.structure.filter((item) => item.item !== 'viz_events');
        });
        await page.goto(`/${dash.id}`);
        const problems = await panelProblems(page, panel('viz_events'), QUICK);
        expect(problems.join('\n')).toContain('not on the page');
    });
});
