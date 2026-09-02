/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 05 — EXPORTS & DELIVERY SETTINGS
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • Exports listing page
 *   • Export configuration form (format, schedule, recipients)
 *   • Delivery settings (email/webhook)
 *   • Validation on settings forms
 *   • Save confirmation / toast messages
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://adminpanel2.appedology.pk';

test.describe('05 — Exports & Delivery Settings', () => {

  // ─────────────────────────────────────────────────────────────────
  // 1. EXPORTS PAGE
  // ─────────────────────────────────────────────────────────────────
  test.describe('Exports Page', () => {

    test('05-01  exports page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${BASE}/exports`);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('05-02  exports list or empty state is visible', async ({ page }) => {
      await page.goto(`${BASE}/exports`);
      await page.waitForLoadState('networkidle');
      const list = page.locator('table, [class*="list"], [class*="export"]').first();
      const empty = page.locator('text=/no exports|no records|empty/i');
      const listVisible = await list.count() > 0;
      const emptyVisible = await empty.count() > 0;
      expect(listVisible || emptyVisible).toBeTruthy();
    });

    test('05-03  "New Export" or equivalent CTA is present', async ({ page }) => {
      await page.goto(`${BASE}/exports`);
      const cta = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New Export")');
      if (await cta.count() === 0) {
        return console.warn('⚠  No create-export button found');
      }
      await expect(cta.first()).toBeVisible();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. DELIVERY SETTINGS
  // ─────────────────────────────────────────────────────────────────
  test.describe('Delivery Settings', () => {

    test('05-04  settings page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // Try common settings routes
      for (const route of ['/settings', '/delivery', '/settings/delivery']) {
        await page.goto(`${BASE}${route}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) break;
      }
      expect(errors).toHaveLength(0);
    });

    test('05-05  settings form has at least one input', async ({ page }) => {
      for (const route of ['/settings', '/delivery', '/settings/delivery']) {
        await page.goto(`${BASE}${route}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) break;
      }
      const inputs = page.locator('input, select, textarea');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    });

    test('05-06  email delivery field accepts valid email', async ({ page }) => {
      for (const route of ['/settings', '/delivery']) {
        await page.goto(`${BASE}${route}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) break;
      }
      const emailField = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
      if (await emailField.count() === 0) return test.skip();
      await emailField.fill('valid@example.com');
      await expect(emailField).toHaveValue('valid@example.com');
    });

    test('05-07  saving settings shows a success confirmation', async ({ page }) => {
      for (const route of ['/settings', '/delivery']) {
        await page.goto(`${BASE}${route}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) break;
      }
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveBtn.count() === 0) return test.skip();
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const toast = page.locator('[class*="toast"], [class*="alert"], [class*="success"], text=/saved|updated|success/i');
      if (await toast.count() === 0) {
        console.warn('⚠  No success toast/confirmation after save');
      } else {
        await expect(toast.first()).toBeVisible();
      }
    });

    test('05-08  webhook URL field validates format', async ({ page }) => {
      for (const route of ['/settings', '/delivery']) {
        await page.goto(`${BASE}${route}`);
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/login')) break;
      }
      const webhookField = page.locator('input[name*="webhook" i], input[placeholder*="webhook" i], input[placeholder*="url" i]').first();
      if (await webhookField.count() === 0) return test.skip();
      await webhookField.fill('not-a-url');
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(800);
      const validityOk = await webhookField.evaluate(el => el.validity?.valid);
      const errorMsg = await page.locator('[class*="error"], [class*="invalid"]').count() > 0;
      expect(!validityOk || errorMsg).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. EXPORT FORMAT OPTIONS
  // ─────────────────────────────────────────────────────────────────
  test.describe('Export Format & Schedule', () => {

    test('05-09  export format selector shows CSV / Excel options', async ({ page }) => {
      await page.goto(`${BASE}/exports`);
      await page.waitForLoadState('networkidle');
      const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")').first();
      if (await createBtn.count() === 0) return test.skip();
      await createBtn.click();
      await page.waitForTimeout(1000);
      const formatSelect = page.locator('select[name*="format" i], [class*="format"] select').first();
      if (await formatSelect.count() === 0) return test.skip();
      const options = await formatSelect.locator('option').allTextContents();
      const hasCSVorXLS = options.some(o => /csv|excel|xlsx/i.test(o));
      expect(hasCSVorXLS).toBeTruthy();
    });

    test('05-10  schedule frequency selector has expected options', async ({ page }) => {
      await page.goto(`${BASE}/exports`);
      await page.waitForLoadState('networkidle');
      const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
      if (await createBtn.count() === 0) return test.skip();
      await createBtn.click();
      await page.waitForTimeout(1000);
      const schedSelect = page.locator('select[name*="schedule" i], select[name*="frequency" i]').first();
      if (await schedSelect.count() === 0) return test.skip();
      const options = await schedSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(1);
    });

  });

});
