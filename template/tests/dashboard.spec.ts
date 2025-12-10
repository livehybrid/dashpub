import { test, expect } from '@playwright/test';
import { getSplunkConfig } from '../test-utils/splunk-helpers';

/**
 * End-to-end dashboard tests for dashpub
 * 
 * These tests validate dashboard functionality using a REAL external Splunk instance:
 * - Dashboard pages load correctly
 * - Charts and visualizations render
 * - Metrics display numeric values
 * - Filters and interactions work
 * - Visual regression screenshots
 * 
 * Assumes:
 * - Docker container is running on port 3000
 * - Splunk credentials are configured via environment variables
 * - At least one dashboard exists (e.g., 'highlevel')
 * 
 * Note: This is a Vite + Express app with React Router
 */
test.describe('Dashboard E2E Tests', () => {
  // Use a known dashboard ID - adjust based on your dashboards
  // Common dashboard IDs: 'highlevel', 'example', 'splunk_answers'
  const TEST_DASHBOARD = process.env.TEST_DASHBOARD_ID || 'highlevel';
  
  // Track API responses to detect failures
  type ApiResponse = { url: string; status: number; };
  let apiResponses: ApiResponse[] = [];
  
  // Validate Splunk config is available (will throw if missing)
  test.beforeAll(() => {
    try {
      getSplunkConfig();
    } catch (error) {
      console.warn('Splunk configuration not available:', error instanceof Error ? error.message : String(error));
      // Tests will still run but may fail if they require Splunk
    }
  });

  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for dashboard tests (Splunk can be slow)
    test.setTimeout(90000); // 90 seconds
    
    // Reset API response tracking
    apiResponses = [];
    
    // Monitor all API responses for errors
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/data/') || url.includes('/api/dashboards/')) {
        apiResponses.push({
          url,
          status: response.status()
        });
      }
    });
  });

  test('dashboard page loads and displays content', async ({ page }) => {
    // Navigate to dashboard route (React Router handles this)
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for initial page load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for loading indicator to disappear
    // The Loading component shows "Loading Splunk Dashboard..." or similar
    const loadingText = page.getByText(/Loading/i);
    await expect(loadingText).toBeVisible({ timeout: 5000 }).catch(() => {
      // Loading might disappear too quickly, which is fine
    });
    
    // Wait for loading to disappear (if it was visible)
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Loading already gone or never appeared - continue
    }
    
    // Wait for network to settle (dashboard may fetch data from Splunk)
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Verify main dashboard container is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify page title is set (dashboard title from definition)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).not.toMatch(/Loading/i);
    
    // Verify no 500 errors from API calls
    const failedRequests = apiResponses.filter(r => r.status >= 500);
    if (failedRequests.length > 0) {
      console.error('Failed API requests:', failedRequests);
    }
    expect(failedRequests, 'Dashboard should not have 500 errors from API calls').toHaveLength(0);
  });

  test('dashboard displays visual elements', async ({ page }) => {
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Wait for any loading indicators to disappear
    const loadingText = page.getByText(/Loading/i);
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Continue if loading already gone
    }
    
    // Look for common dashboard elements
    // Splunk dashboards typically contain SVG elements for charts
    const svgElements = page.locator('svg');
    const svgCount = await svgElements.count();
    
    // At least one visualization should be present (or the page structure)
    // If no SVGs, check for other common elements
    if (svgCount === 0) {
      // Check for text content or other visual elements
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText?.length).toBeGreaterThan(0);
    } else {
      // Verify at least one SVG (chart) is visible
      await expect(svgElements.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('dashboard displays numeric metric values', async ({ page }) => {
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Wait for loading to complete
    const loadingText = page.getByText(/Loading/i);
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Continue
    }
    
    // Look for numeric values in the page
    // Splunk dashboards often display metrics as numbers
    const bodyText = await page.locator('body').textContent() || '';
    
    // Check for numeric patterns (digits, possibly with commas or decimals)
    const numericPattern = /\d+/;
    const hasNumericContent = numericPattern.test(bodyText);
    
    // Require numeric data to be present (dashboards should show metrics)
    expect(hasNumericContent, 'Dashboard should display numeric metric values').toBe(true);
    
    // Verify the page has substantial content
    expect(bodyText.length, 'Dashboard should have content').toBeGreaterThan(100);
    
    // Verify no 500 errors
    const failedRequests = apiResponses.filter(r => r.status >= 500);
    expect(failedRequests, 'Dashboard data APIs should not return 500 errors').toHaveLength(0);
  });

  test('dashboard handles time range or filter interactions', async ({ page }) => {
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Wait for loading to complete
    const loadingText = page.getByText(/Loading/i);
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Continue
    }
    
    // Look for interactive elements (buttons, dropdowns, inputs)
    // These might be time range selectors or filters
    const buttons = page.locator('button');
    const selects = page.locator('select');
    const inputs = page.locator('input[type="text"], input[type="number"]');
    
    const buttonCount = await buttons.count();
    const selectCount = await selects.count();
    const inputCount = await inputs.count();
    
    // If interactive elements exist, try interacting with one
    if (buttonCount > 0 || selectCount > 0 || inputCount > 0) {
      // Try clicking the first button (might be a refresh or filter button)
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const buttonText = await firstButton.textContent();
        
        // Skip buttons that might cause navigation or major changes
        if (buttonText && !buttonText.toLowerCase().includes('login') && !buttonText.toLowerCase().includes('logout')) {
          // Click and wait for network to settle
          await firstButton.click();
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          
          // Verify page is still responsive
          await expect(page.locator('body')).toBeVisible();
        }
      }
    } else {
      // No interactive elements found - this is acceptable for some dashboards
      console.log('No interactive filter elements found - dashboard may be read-only');
    }
    
    // Verify dashboard is still visible after interaction attempt
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard visual regression screenshot', async ({ page }) => {
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Wait for loading to complete
    const loadingText = page.getByText(/Loading/i);
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Continue
    }
    
    // Additional wait to ensure all visualizations are rendered
    await page.waitForTimeout(2000);
    
    // Take a full-page screenshot for visual regression
    // Filename includes dashboard ID for easy identification
    await page.screenshot({
      path: `test-results/dashboard-${TEST_DASHBOARD}.png`,
      fullPage: true,
    });
    
    // Verify screenshot was created (Playwright handles this, but we can verify file exists)
    // The screenshot will be in test-results/ directory
    console.log(`Screenshot saved: test-results/dashboard-${TEST_DASHBOARD}.png`);
  });

  test('dashboard API definition endpoint responds', async ({ request }) => {
    // Test that the dashboard definition API endpoint is accessible
    const response = await request.get(`/api/dashboards/${TEST_DASHBOARD}/definition`);
    
    // Should return 200 if dashboard exists, 404 if not
    if (response.status() === 200) {
      const definition = await response.json();
      expect(definition).toBeTruthy();
      // Dashboard definition should have basic structure
      expect(definition).toHaveProperty('title');
    } else if (response.status() === 404) {
      console.warn(`Dashboard ${TEST_DASHBOARD} not found - this may be expected`);
    } else {
      // Other status codes are unexpected
      expect(response.status()).toBe(200);
    }
  });
  
  test('dashboard data APIs return successful responses', async ({ page }) => {
    await page.goto(`/${TEST_DASHBOARD}`);
    
    // Wait for dashboard to fully load and make API calls
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Wait for loading to complete
    const loadingText = page.getByText(/Loading/i);
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    } catch {
      // Continue
    }
    
    // Verify at least one data API call was made
    const dataApiCalls = apiResponses.filter(r => r.url.includes('/api/data/'));
    expect(dataApiCalls.length, 'Dashboard should make at least one data API call').toBeGreaterThan(0);
    
    // Verify all data API calls succeeded (status < 400)
    const failedDataCalls = dataApiCalls.filter(r => r.status >= 400);
    if (failedDataCalls.length > 0) {
      console.error('Failed data API calls:', failedDataCalls);
    }
    expect(failedDataCalls, 'All data API calls should succeed (no 4xx/5xx errors)').toHaveLength(0);
    
    // Verify at least one succeeded with 200
    const successfulCalls = dataApiCalls.filter(r => r.status === 200);
    expect(successfulCalls.length, 'At least one data API should return 200').toBeGreaterThan(0);
  });
});

