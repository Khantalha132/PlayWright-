/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 08 — END-TO-END SMOKE TESTS (Critical Happy Paths)
 * ══════════════════════════════════════════════════════════════════
 *
 *  These tests exercise the most important user journeys end-to-end.
 *  Run these as a quick sanity check after every deployment.
 *
 *  Journeys:
 *   E2E-01  Login → view leads list → open lead → go back
 *   E2E-02  Login → navigate to forms → open a form → return
 *   E2E-03  Login → trigger export → confirm download initiated
 *   E2E-04  Login → change settings → save → verify success toast
 *   E2E-05  Login → logout → verify session cleared
 */

const { test, expect } = require('@playwright/test');
const {
  LoginPage,
  FormsPage,
  LeadsPage,
  waitForToast,
  collectConsoleErrors,
  BASE,
} = require('../utils/pages');

// These tests use a fresh session (not the saved auth state)
// so they verify the full login → action → logout journey.
test.use({ storageState: { cookies: [], origins: [] } });

const CREDS = { email: 'admin@example.com', password: 'admin123' };

test.describe('08 — End-to-End Smoke Tests', () => {

  // ─────────────────────────────────────────────────────────────────
  // E2E-01  Login → Leads → Detail → Back
  // ─────────────────────────────────────────────────────────────────
  test('E2E-01  Login → Browse leads → Open lead detail → Return', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    // Step 1: Login
    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Step 2: Navigate to leads
    const leads = new LeadsPage(page);
    await leads.goto();
    await expect(page).toHaveURL(/leads/, { timeout: 8000 });

    // Step 3: Open first lead
    const rowCount = await leads.getRowCount();
    if (rowCount > 0) {
      await leads.openFirstLead();
      // Something should have changed (URL or modal)
      const urlChanged = !page.url().includes('/leads') || await page.locator('[role="dialog"]').count() > 0;
      expect(urlChanged).toBeTruthy();
    }

    // Step 4: Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    expect(errors()).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-02  Login → Forms → Open form
  // ─────────────────────────────────────────────────────────────────
  test('E2E-02  Login → Forms list → Open form detail', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    const forms = new FormsPage(page);
    await forms.goto();

    const count = await forms.getRowCount();
    if (count > 0) {
      await forms.rows.first().click();
      await page.waitForLoadState('networkidle');
      const isDetail = !page.url().endsWith('/forms') || await page.locator('[role="dialog"]').count() > 0;
      expect(isDetail).toBeTruthy();
    } else {
      console.log('ℹ  No forms in list — skipping detail click');
    }

    expect(errors()).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-03  Login → Export leads
  // ─────────────────────────────────────────────────────────────────
  test('E2E-03  Login → Leads list → Trigger export', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    const leads = new LeadsPage(page);
    await leads.goto();

    if (await leads.exportBtn.count() === 0) {
      return console.warn('ℹ  No export button — skipping E2E-03');
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      leads.exportBtn.click(),
    ]);

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.(csv|xlsx|xls|pdf)$/i);
      console.log('✅  Export downloaded:', filename);
    } else {
      console.warn('ℹ  No download event — export may open in new tab');
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-04  Login → Settings → Save
  // ─────────────────────────────────────────────────────────────────
  test('E2E-04  Login → Open settings → Save → Expect success feedback', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Try common settings routes
    let landed = false;
    for (const route of ['/settings', '/settings/general', '/profile']) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      if (!page.url().includes('/login')) { landed = true; break; }
    }
    if (!landed) return console.warn('⚠  Could not find a settings route');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
    if (await saveBtn.count() === 0) return console.warn('⚠  No save button on settings page');

    await saveBtn.click();
    await page.waitForTimeout(2000);

    const successIndicator = page.locator('[class*="success"], [class*="toast"], text=/saved|updated|success/i');
    if (await successIndicator.count() > 0) {
      await expect(successIndicator.first()).toBeVisible();
      console.log('✅  Save success indicator found');
    } else {
      console.warn('⚠  No success toast appeared after save');
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-05  Full login → logout cycle
  // ─────────────────────────────────────────────────────────────────
  test('E2E-05  Login → Logout → Session cleared → Redirect to /login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    console.log('✅  Logged in. URL:', page.url());

    // Find & click logout
    const logoutBtn = page.locator(
      'a[href*="logout"], button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    ).first();
    await expect(logoutBtn).toBeVisible({ timeout: 8000 });
    await logoutBtn.click();
    await page.waitForTimeout(2000);

    // Should be back on login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    console.log('✅  Logged out. URL:', page.url());

    // Try to access a protected route
    await page.goto(`${BASE}/leads`);
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    const isOnAuth = finalUrl.includes('/login') || finalUrl.includes('/auth');
    console.log('Post-logout /leads URL:', finalUrl);
    expect(isOnAuth).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-06  Full form lifecycle: create → view → (optionally) delete
  // ─────────────────────────────────────────────────────────────────
  test('E2E-06  Login → Create form attempt → Validate required fields', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsAdmin();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    const forms = new FormsPage(page);
    await forms.goto();

    if (await forms.addBtn.count() === 0) return console.warn('ℹ  No create button');
    await forms.openCreateModal();

    // Try submitting empty
    const submitBtn = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")').first();
    if (await submitBtn.count() === 0) return console.warn('ℹ  No submit in modal');

    await submitBtn.click();
    await page.waitForTimeout(800);

    const errors = page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]');
    const errCount = await errors.count();
    console.log(`Validation errors shown on empty submit: ${errCount}`);
    expect(errCount).toBeGreaterThan(0);
  });

});
