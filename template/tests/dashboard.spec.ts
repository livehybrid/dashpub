import { test, expect, type Page } from '@playwright/test';

/**
 * Live dashboard checks.
 *
 * Runs against a dashpub instance publishing a real dashboard from a real,
 * long-lived Splunk (credentials from repository secrets in CI). The data on
 * that dashboard changes, so these tests cannot know what a panel should say:
 * they check that the dashboard loads, that its panels are drawn rather than
 * showing a render error, and that its searches are answered. What each
 * visualization type should show is the render suite's job (render.spec.mjs).
 *
 * Every test waits for the thing it is about to assert on. The previous
 * version waited for the network to go idle, which can happen before the
 * dashboard has asked for any data; it failed and passed on retry most runs.
 */
const TEST_DASHBOARD = process.env.TEST_DASHBOARD_ID || 'highlevel';
const LOAD_TIMEOUT = 60000;

type DataResponse = { url: string; status: number };

async function openDashboard(page: Page) {
  const data: DataResponse[] = [];
  const pageErrors: string[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/data/')) {
      data.push({ url: response.url(), status: response.status() });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 400)));

  await page.goto(`/${TEST_DASHBOARD}`);
  // The first panel being in the page is what "loaded" means here.
  await expect(page.locator('[data-test="viz-item"]').first()).toBeAttached({ timeout: LOAD_TIMEOUT });
  return { data, pageErrors };
}

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(() => {
    test.setTimeout(120000);
  });

  test('dashboard loads and draws its panels', async ({ page }) => {
    const { pageErrors } = await openDashboard(page);

    await expect(page).not.toHaveTitle(/Loading/i);
    expect(await page.locator('[data-test="viz-item"]').count(), 'panels on the page').toBeGreaterThan(0);
    expect(pageErrors, 'uncaught exceptions in the page').toEqual([]);
  });

  test('no panel shows a render error', async ({ page }) => {
    await openDashboard(page);
    // Splunk replaces a panel it cannot draw (unknown or crashing
    // visualization) with this message element.
    const broken = page.locator('[data-test="viz-item"]:has([data-test="dashboard-message"])');
    // Give lazily loaded visualizations time to either draw or fail.
    await page.waitForTimeout(5000);
    const ids = await broken.evaluateAll((els) =>
      els.map((el) => `${el.getAttribute('data-id')} (${el.getAttribute('data-viz-type')}): ${el.textContent?.slice(0, 120)}`)
    );
    expect(ids, 'panels showing a render error').toEqual([]);
  });

  test('dashboard searches are answered', async ({ page }) => {
    const { data } = await openDashboard(page);

    await expect
      .poll(() => data.filter((d) => d.status === 200).length, {
        message: 'at least one data request should return 200',
        timeout: LOAD_TIMEOUT,
      })
      .toBeGreaterThan(0);
    // Let the remaining panels' requests land before judging them.
    await page.waitForLoadState('networkidle', { timeout: LOAD_TIMEOUT });
    expect(
      data.filter((d) => d.status >= 400),
      'data requests that failed'
    ).toEqual([]);
  });

  test('dashboard definition endpoint returns the dashboard', async ({ request }) => {
    const response = await request.get(`/api/dashboards/${TEST_DASHBOARD}/definition`);
    expect(response.status(), `definition for ${TEST_DASHBOARD}`).toBe(200);
    const definition = await response.json();
    expect(definition).toHaveProperty('title');
    expect(Object.keys(definition.visualizations || {}).length, 'visualizations in the definition').toBeGreaterThan(0);
  });

  test('dashboard screenshot', async ({ page }, testInfo) => {
    await openDashboard(page);
    await page.waitForLoadState('networkidle', { timeout: LOAD_TIMEOUT });
    await page.waitForTimeout(2000);
    const path = `test-results/dashboard-${TEST_DASHBOARD}.png`;
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`dashboard-${TEST_DASHBOARD}.png`, { path, contentType: 'image/png' });
  });
});
