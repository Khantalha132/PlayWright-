// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',

  timeout: 0,               // No per-test timeout – UI focus only
  expect: { timeout: 15000 },

  workers: 1,               // Sequential – each test logs in independently
  fullyParallel: false,
  retries: 1,               // Retry once on flake

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'https://demo.culturehcm.com',
    headless: false,                  // Watch it run; set true for CI
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15000,
    navigationTimeout: 60000,         // Generous for demo server
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});