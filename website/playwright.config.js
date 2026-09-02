// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,          // run tests sequentially (shared login session)
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://adminpanel2.appedology.pk',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    // ── Setup: authenticate once and store session ──────────────────────────
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
    },

    // ── Desktop Chrome ──────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/session.json',
      },
      dependencies: ['setup'],
    },

    // ── Mobile Safari (responsive checks) ──────────────────────────────────
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        storageState: '.auth/session.json',
      },
      dependencies: ['setup'],
    },
  ],
});
