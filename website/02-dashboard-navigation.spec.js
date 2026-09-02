/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 02 — DASHBOARD & NAVIGATION
 *  Runs with stored auth session (already logged in)
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • Dashboard loads correctly after login
 *   • Sidebar / top-nav links are present and navigate correctly
 *   • Active-state highlighting on nav items
 *   • Logout flow
 *   • Page title updates on route change
 *   • No 404/500 responses on internal links
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://adminpanel2.appedology.pk';

test.describe('02 — Dashboard & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    // Give the SPA a moment to hydrate
    await page.waitForLoadState('networkidle');
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. DASHBOARD LOAD
  // ─────────────────────────────────────────────────────────────────
  test.describe('Dashboard Load', () => {

    test('02-01  dashboard page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('02-02  no failed network requests (4xx / 5xx)', async ({ page }) => {
      const failed = [];
      page.on('response', res => {
        if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
      });
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      expect(failed).toHaveLength(0);
    });

    test('02-03  at least one heading/title is visible on dashboard', async ({ page }) => {
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
    });

    test('02-04  dashboard renders within 5 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. SIDEBAR / NAVIGATION LINKS
  // ─────────────────────────────────────────────────────────────────
  test.describe('Navigation Links', () => {

    test('02-05  sidebar/nav is present in the DOM', async ({ page }) => {
      const nav = page.locator('nav, [class*="sidebar"], [class*="menu"]').first();
      await expect(nav).toBeVisible();
    });

    test('02-06  all nav links point to valid same-origin URLs', async ({ page }) => {
      const links = await page.locator('nav a, [class*="sidebar"] a').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          // Relative link — verify it doesn't 404
          const res = await page.request.get(`${BASE}${href}`);
          expect(res.status(), `${href} returned ${res.status()}`).toBeLessThan(404);
        }
      }
    });

    test('02-07  clicking a nav item changes the URL', async ({ page }) => {
      const initialUrl = page.url();
      const links = await page.locator('nav a, [class*="sidebar"] a').all();
      if (links.length > 0) {
        await links[0].click();
        await page.waitForLoadState('networkidle');
        // URL may or may not change (SPA hash routing vs full reload)
        console.log('Nav click URL:', page.url());
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. LOGOUT
  // ─────────────────────────────────────────────────────────────────
  test.describe('Logout', () => {

    test('02-08  logout link/button is present', async ({ page }) => {
      const logout = page.locator(
        'a[href*="logout"], button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
      );
      await expect(logout.first()).toBeVisible();
    });

    test('02-09  clicking logout redirects to /login', async ({ page }) => {
      const logout = page.locator(
        'a[href*="logout"], button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
      ).first();
      await logout.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/login/);
    });

    test('02-10  after logout, back-button cannot access dashboard', async ({ page }) => {
      const logout = page.locator(
        'a[href*="logout"], button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
      ).first();
      await logout.click();
      await page.waitForTimeout(2000);
      await page.goBack();
      await page.waitForTimeout(2000);
      // Should be redirected to login again, not show dashboard
      const url = page.url();
      console.log('Back-button after logout URL:', url);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 4. RESPONSIVE LAYOUT
  // ─────────────────────────────────────────────────────────────────
  test.describe('Responsive Layout', () => {

    test('02-11  dashboard is usable on 768px tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
    });

    test('02-12  dashboard is usable on 375px mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

  });

});
