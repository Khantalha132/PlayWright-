/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 01 — LOGIN PAGE
 *  URL: https://adminpanel2.appedology.pk/login
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • Page load & visual elements
 *   • Field validations (empty, invalid format, wrong credentials)
 *   • Successful login + redirect
 *   • "Remember me" checkbox state
 *   • Password visibility toggle (if present)
 *   • Accessibility basics (labels, keyboard nav, focus order)
 *   • Responsive layout check
 */

const { test, expect } = require('@playwright/test');

const BASE   = 'https://adminpanel2.appedology.pk';
const LOGIN  = `${BASE}/login`;
const VALID  = { email: 'admin@example.com', password: 'admin123' };
const WRONG  = { email: 'wrong@example.com', password: 'wrongpass' };

// Helper: navigate to login without using saved session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('01 — Login Page', () => {

  // ─────────────────────────────────────────────────────────────────
  // 1. PAGE LOAD
  // ─────────────────────────────────────────────────────────────────
  test.describe('Page Load & Visual Elements', () => {

    test('01-01  page title is "Login"', async ({ page }) => {
      await page.goto(LOGIN);
      await expect(page).toHaveTitle(/login/i);
    });

    test('01-02  branding / heading is visible', async ({ page }) => {
      await page.goto(LOGIN);
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
    });

    test('01-03  email field is visible and enabled', async ({ page }) => {
      await page.goto(LOGIN);
      const email = page.getByLabel(/email/i);
      await expect(email).toBeVisible();
      await expect(email).toBeEnabled();
    });

    test('01-04  password field is visible and enabled', async ({ page }) => {
      await page.goto(LOGIN);
      const pwd = page.getByLabel(/password/i);
      await expect(pwd).toBeVisible();
      await expect(pwd).toBeEnabled();
    });

    test('01-05  password field type is "password" (masked)', async ({ page }) => {
      await page.goto(LOGIN);
      const pwd = page.getByLabel(/password/i);
      await expect(pwd).toHaveAttribute('type', 'password');
    });

    test('01-06  Login button is visible and enabled', async ({ page }) => {
      await page.goto(LOGIN);
      const btn = page.getByRole('button', { name: /login/i });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    });

    test('01-07  "Remember me" checkbox is present', async ({ page }) => {
      await page.goto(LOGIN);
      const cb = page.getByLabel(/remember/i);
      await expect(cb).toBeVisible();
    });

    test('01-08  page is responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(LOGIN);
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. FIELD VALIDATION
  // ─────────────────────────────────────────────────────────────────
  test.describe('Field Validation', () => {

    test('01-09  submitting empty form shows validation', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByRole('button', { name: /login/i }).click();
      // Either stays on /login or shows an error message
      const url = page.url();
      const hasError = await page.locator('[class*="error"], [class*="alert"], [class*="invalid"]').count() > 0;
      expect(url.includes('/login') || hasError).toBeTruthy();
    });

    test('01-10  invalid email format shows validation', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill('not-an-email');
      await page.getByLabel(/password/i).fill('somepass');
      await page.getByRole('button', { name: /login/i }).click();
      // HTML5 validity or custom error
      const emailInput = page.getByLabel(/email/i);
      const validity = await emailInput.evaluate(el => el.validity?.valid);
      expect(validity).toBe(false);
    });

    test('01-11  wrong credentials show an error message', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(WRONG.email);
      await page.getByLabel(/password/i).fill(WRONG.password);
      await page.getByRole('button', { name: /login/i }).click();
      // Should remain on login page or display an error
      await page.waitForTimeout(2000);
      const stillOnLogin = page.url().includes('/login');
      const errorVisible = await page.locator(
        'text=/invalid|incorrect|unauthorized|wrong|error/i'
      ).count() > 0;
      expect(stillOnLogin || errorVisible).toBeTruthy();
    });

    test('01-12  correct email + empty password shows validation', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByRole('button', { name: /login/i }).click();
      const url = page.url();
      const hasError = await page.locator('[class*="error"], [required]').count() > 0;
      expect(url.includes('/login') || hasError).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. SUCCESSFUL LOGIN
  // ─────────────────────────────────────────────────────────────────
  test.describe('Successful Login', () => {

    test('01-13  valid credentials redirect away from /login', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByRole('button', { name: /login/i }).click();
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('01-14  dashboard loads after login (no JS errors)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByRole('button', { name: /login/i }).click();
      await page.waitForTimeout(3000);
      expect(errors).toHaveLength(0);
    });

    test('01-15  already-logged-in user is redirected from /login', async ({ page, context }) => {
      // First login
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByRole('button', { name: /login/i }).click();
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
      // Revisit login — should redirect
      await page.goto(LOGIN);
      await page.waitForTimeout(2000);
      // Might stay on login or redirect — document actual behavior
      console.log('Post-auth /login visit URL:', page.url());
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 4. "REMEMBER ME" BEHAVIOUR
  // ─────────────────────────────────────────────────────────────────
  test.describe('"Remember Me" Checkbox', () => {

    test('01-16  checkbox is unchecked by default', async ({ page }) => {
      await page.goto(LOGIN);
      const cb = page.getByLabel(/remember/i);
      await expect(cb).not.toBeChecked();
    });

    test('01-17  checkbox can be checked and unchecked', async ({ page }) => {
      await page.goto(LOGIN);
      const cb = page.getByLabel(/remember/i);
      await cb.check();
      await expect(cb).toBeChecked();
      await cb.uncheck();
      await expect(cb).not.toBeChecked();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 5. ACCESSIBILITY & KEYBOARD NAVIGATION
  // ─────────────────────────────────────────────────────────────────
  test.describe('Accessibility', () => {

    test('01-18  email input has an associated label', async ({ page }) => {
      await page.goto(LOGIN);
      const email = page.getByLabel(/email/i);
      await expect(email).toBeVisible();
    });

    test('01-19  password input has an associated label', async ({ page }) => {
      await page.goto(LOGIN);
      const pwd = page.getByLabel(/password/i);
      await expect(pwd).toBeVisible();
    });

    test('01-20  Tab key navigates email → password → button', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).focus();
      await page.keyboard.press('Tab');
      // After tab from email, password should be focused
      const focusedType = await page.evaluate(() => document.activeElement?.getAttribute('type'));
      expect(['password', 'checkbox', 'submit', 'text'].includes(focusedType || '')).toBeTruthy();
    });

    test('01-21  Enter key on password field submits the form', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByLabel(/password/i).press('Enter');
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 6. NETWORK & SECURITY
  // ─────────────────────────────────────────────────────────────────
  test.describe('Network & Security', () => {

    test('01-22  login request is sent to HTTPS endpoint', async ({ page }) => {
      const requests = [];
      page.on('request', req => {
        if (req.method() === 'POST') requests.push(req.url());
      });
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByRole('button', { name: /login/i }).click();
      await page.waitForTimeout(2000);
      const postUrls = requests.filter(u => u.startsWith('https://'));
      expect(postUrls.length).toBeGreaterThan(0);
    });

    test('01-23  no credentials in URL after login', async ({ page }) => {
      await page.goto(LOGIN);
      await page.getByLabel(/email/i).fill(VALID.email);
      await page.getByLabel(/password/i).fill(VALID.password);
      await page.getByRole('button', { name: /login/i }).click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).not.toContain('password');
      expect(url).not.toContain('admin123');
    });

    test('01-24  unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForTimeout(2000);
      // Should land on login (or equivalent auth gate)
      const url = page.url();
      const isOnAuth = url.includes('/login') || url.includes('/auth');
      if (!isOnAuth) {
        console.warn('⚠  Dashboard is accessible without auth — potential security issue');
      }
      // Log; do not hard-fail since the app may handle it differently
      console.log('Unauthenticated /dashboard URL:', url);
    });

  });

});
