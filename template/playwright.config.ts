import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for dashpub E2E tests
 * 
 * Tests assume the Docker container is running on port 3000
 * Splunk credentials come from environment variables (GitHub Secrets in CI)
 * 
 * Note: This is a Vite + Express app (not Next.js)
 */
export default defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run for
  timeout: 60000, // 60 seconds (Splunk can be slow)
  
  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  // Shared settings for all projects
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configure projects for different environments
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
    
    // Local development project (non-headless, useful for debugging)
    ...(process.env.CI ? [] : [{
      name: 'chromium-local',
      use: { 
        ...devices['Desktop Chrome'],
        headless: false,
        viewport: { width: 1280, height: 720 },
      },
    }]),
  ],

  // Web server configuration - disabled in CI when testing against Docker
  webServer: process.env.CI && process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: 'npm run start',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});

