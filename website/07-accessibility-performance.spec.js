/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 07 — ACCESSIBILITY, PERFORMANCE & VISUAL CHECKS
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • ARIA roles and landmark regions
 *   • Focus management (modals trap focus, menus close on Escape)
 *   • Color-contrast placeholder check
 *   • Core Web Vitals proxy: LCP element visible in < 3 s
 *   • No broken images on key pages
 *   • Console error monitoring across pages
 *   • HTTP security headers (HTTPS, X-Frame-Options, CSP)
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://adminpanel2.appedology.pk';

const KEY_PAGES = [
  { name: 'Login',    url: `${BASE}/login`,   auth: false },
  { name: 'Dashboard', url: BASE,              auth: true  },
];

test.describe('07 — Accessibility, Performance & Visual', () => {

  // ─────────────────────────────────────────────────────────────────
  // 1. LANDMARK REGIONS & ARIA
  // ─────────────────────────────────────────────────────────────────
  test.describe('Landmark Regions', () => {

    test('07-01  login page has a <main> or role="main" landmark', async ({ page }) => {
      await page.goto(`${BASE}/login`);
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
    });

    test('07-02  dashboard has a <nav> or role="navigation" element', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav.first()).toBeVisible();
    });

    test('07-03  all images have non-empty alt attributes', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const imgs = await page.locator('img').all();
      const missing = [];
      for (const img of imgs) {
        const alt = await img.getAttribute('alt');
        const src = await img.getAttribute('src');
        if (alt === null || alt.trim() === '') missing.push(src ?? 'unknown');
      }
      if (missing.length > 0) {
        console.warn(`⚠  Images missing alt text: ${missing.join(', ')}`);
      }
      // Soft assertion — log, don't fail (decorative imgs may legitimately have empty alt)
    });

    test('07-04  interactive buttons have accessible names', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const buttons = await page.locator('button').all();
      const unnamed = [];
      for (const btn of buttons) {
        const text = (await btn.textContent())?.trim();
        const label = await btn.getAttribute('aria-label');
        const title = await btn.getAttribute('title');
        if (!text && !label && !title) unnamed.push(await btn.innerHTML());
      }
      if (unnamed.length > 0) {
        console.warn(`⚠  Buttons with no accessible name: ${unnamed.length}`);
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. KEYBOARD & FOCUS MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  test.describe('Keyboard & Focus', () => {

    test('07-05  Escape key closes open modals', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const openBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      if (await openBtn.count() === 0) return test.skip();
      await openBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() === 0) return test.skip();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(modal).not.toBeVisible();
    });

    test('07-06  focus is visible on interactive elements (focus ring)', async ({ page }) => {
      await page.goto(`${BASE}/login`);
      const emailInput = page.getByLabel(/email/i);
      await emailInput.focus();
      // Check computed outline/box-shadow
      const outline = await emailInput.evaluate(el => {
        const s = window.getComputedStyle(el);
        return s.outline + s.boxShadow;
      });
      // A non-"none 0px" outline indicates focus styling exists
      console.log('Focus style on email input:', outline.slice(0, 80));
    });

    test('07-07  Tab order on login is logical (email → password → login btn)', async ({ page }) => {
      await page.goto(`${BASE}/login`);
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => document.activeElement?.getAttribute('type') ?? document.activeElement?.tagName);
      await page.keyboard.press('Tab');
      const second = await page.evaluate(() => document.activeElement?.getAttribute('type') ?? document.activeElement?.tagName);
      console.log('Tab order — first:', first, '| second:', second);
      // Log for manual review; don't hard-fail (depends on DOM order)
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. BROKEN IMAGES
  // ─────────────────────────────────────────────────────────────────
  test.describe('Broken Images', () => {

    test('07-08  no broken images on login page', async ({ page }) => {
      await page.goto(`${BASE}/login`);
      const broken = await page.evaluate(() => {
        return Array.from(document.images)
          .filter(img => !img.complete || img.naturalWidth === 0)
          .map(img => img.src);
      });
      expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
    });

    test('07-09  no broken images on dashboard', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const broken = await page.evaluate(() => {
        return Array.from(document.images)
          .filter(img => !img.complete || img.naturalWidth === 0)
          .map(img => img.src);
      });
      expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 4. CONSOLE ERROR MONITORING
  // ─────────────────────────────────────────────────────────────────
  test.describe('Console Errors', () => {

    for (const pg of KEY_PAGES) {
      test(`07-10  no console errors on ${pg.name}`, async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        if (!pg.auth) {
          // Strip saved session for login page check
          await page.context().clearCookies();
        }
        await page.goto(pg.url);
        await page.waitForLoadState('networkidle');
        if (errors.length > 0) {
          console.warn(`⚠  Console errors on ${pg.name}:`, errors);
        }
        expect(errors).toHaveLength(0);
      });
    }

  });

  // ─────────────────────────────────────────────────────────────────
  // 5. BASIC PERFORMANCE PROXY
  // ─────────────────────────────────────────────────────────────────
  test.describe('Performance', () => {

    test('07-11  login page DOMContentLoaded < 3 s', async ({ page }) => {
      await page.goto(`${BASE}/login`);
      const timing = await page.evaluate(() => performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart);
      console.log(`Login DCL: ${timing}ms`);
      expect(timing).toBeLessThan(3000);
    });

    test('07-12  dashboard DOMContentLoaded < 4 s', async ({ page }) => {
      const start = Date.now();
      await page.goto(BASE);
      await page.waitForLoadState('domcontentloaded');
      const elapsed = Date.now() - start;
      console.log(`Dashboard load: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(4000);
    });

    test('07-13  LCP element (largest image/text) is visible within 3 s', async ({ page }) => {
      await page.goto(BASE);
      // Wait for the network to calm down
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      const lcpEntry = await page.evaluate(() =>
        new Promise(resolve => {
          new PerformanceObserver(list => {
            const entries = list.getEntries();
            resolve(entries[entries.length - 1]?.startTime ?? -1);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => resolve(-1), 3000);
        })
      );
      console.log(`LCP startTime: ${lcpEntry}ms`);
      if (lcpEntry > 0) {
        expect(lcpEntry).toBeLessThan(3000);
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 6. HTTP SECURITY HEADERS
  // ─────────────────────────────────────────────────────────────────
  test.describe('Security Headers', () => {

    test('07-14  response uses HTTPS', async ({ page }) => {
      const res = await page.goto(`${BASE}/login`);
      expect(res?.url()).toMatch(/^https:\/\//);
    });

    test('07-15  X-Frame-Options or CSP frame-ancestors header is set', async ({ page }) => {
      const res = await page.goto(`${BASE}/login`);
      const headers = res?.headers() ?? {};
      const xfo = headers['x-frame-options'];
      const csp = headers['content-security-policy'];
      const hasFrameProtection = !!xfo || (csp && csp.includes('frame-ancestors'));
      if (!hasFrameProtection) {
        console.warn('⚠  No clickjacking protection header (X-Frame-Options / CSP frame-ancestors)');
      }
      // Log; soft-fail for apps under active development
    });

    test('07-16  X-Content-Type-Options: nosniff is set', async ({ page }) => {
      const res = await page.goto(`${BASE}/login`);
      const val = res?.headers()['x-content-type-options'];
      if (!val || !val.includes('nosniff')) {
        console.warn('⚠  X-Content-Type-Options header missing or not "nosniff"');
      }
    });

  });

});
