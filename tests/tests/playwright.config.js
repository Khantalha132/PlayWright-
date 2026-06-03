// playwright.config.js — place this in the same folder as the spec file

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60_000,          // 60s per test
  retries: 1,               // retry once on flake
  workers: 1,               // run serially — storageState is shared
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    headless: false,        // set true for CI
    viewport:  { width: 1440, height: 900 },
    baseURL:   'https://demo.culturehcm.com',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    trace:      'on-first-retry',
    // storageState is set per-describe in the spec — DO NOT set globally here
  },
});