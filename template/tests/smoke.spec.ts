import { test, expect } from '@playwright/test';

/**
 * Smoke tests for dashpub application
 * 
 * These tests verify basic application functionality:
 * - Health endpoint responds correctly (at /health, not /api/health)
 * - Home page loads
 * - Application is properly configured
 * 
 * Assumes the Docker container is already running on port 3000
 * Note: This is a Vite + Express app, not Next.js
 */
test.describe('Smoke Tests', () => {
  test('health endpoint returns 200 with valid JSON', async ({ request }) => {
    const response = await request.get('/health');
    
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    
    // Verify health response structure
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('environment');
    expect(health).toHaveProperty('services');
    
    // Verify Splunk configuration is present
    expect(health.services).toHaveProperty('splunk');
    expect(health.services.splunk).toHaveProperty('status');
    
    // In CI, Splunk should be configured
    if (process.env.CI) {
      expect(health.services.splunk.status).toMatch(/configured|connected/);
    }
  });

  test('home page loads and displays content', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that the page title or main content is present
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Alternative: Check for main content area
    const mainContent = page.locator('body');
    await expect(mainContent).toBeVisible();
  });

  test('config endpoint returns valid response', async ({ request }) => {
    const response = await request.get('/api/config');
    
    expect(response.status()).toBe(200);
    
    const config = await response.json();
    
    // Verify config response structure
    expect(config).toHaveProperty('title');
    expect(config).toHaveProperty('theme');
  });

  test('application serves static assets', async ({ request }) => {
    // Test that favicon or other static assets are accessible
    const response = await request.get('/favicon.ico', {
      failOnStatusCode: false, // 404 is acceptable
    });
    
    // Should either return 200 (exists) or 404 (doesn't exist, but server is responding)
    expect([200, 404]).toContain(response.status());
  });

  test('dashboard list API endpoint responds', async ({ request }) => {
    const response = await request.get('/api/dashboards');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Verify dashboard list response structure
    expect(data).toHaveProperty('dashboards');
    expect(data).toHaveProperty('metadata');
    expect(Array.isArray(data.dashboards)).toBe(true);
  });
});

