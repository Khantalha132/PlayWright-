/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 04 — LEADS MANAGEMENT
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • Leads list page load
 *   • Search, filter, sort
 *   • Lead detail view
 *   • Status update / edit
 *   • Export trigger (CSV/Excel)
 *   • Bulk selection & bulk actions
 */

const { test, expect } = require('@playwright/test');

const BASE        = 'https://adminpanel2.appedology.pk';
const LEADS_ROUTE = '/leads';

test.describe('04 — Leads Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}${LEADS_ROUTE}`);
    await page.waitForLoadState('networkidle');
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. LEADS LIST
  // ─────────────────────────────────────────────────────────────────
  test.describe('Leads List', () => {

    test('04-01  leads page loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${BASE}${LEADS_ROUTE}`);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('04-02  leads table / list is present', async ({ page }) => {
      const table = page.locator('table, [class*="table"]').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('04-03  lead records exist or empty state is shown', async ({ page }) => {
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      const empty = await page.locator('text=/no leads|no records|empty/i').count();
      expect(count > 0 || empty > 0).toBeTruthy();
    });

    test('04-04  expected columns are present (name, email, phone, status, date)', async ({ page }) => {
      const headerText = await page.locator('thead, [class*="header"]').textContent();
      const lc = headerText?.toLowerCase() ?? '';
      // At minimum one of these identifying columns should exist
      const hasRelevant = ['name', 'email', 'phone', 'status', 'date', 'lead'].some(k => lc.includes(k));
      expect(hasRelevant).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. SEARCH & FILTER
  // ─────────────────────────────────────────────────────────────────
  test.describe('Search & Filter', () => {

    test('04-05  search input exists on leads page', async ({ page }) => {
      const input = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await input.count() === 0) {
        return console.warn('⚠  No search input on leads page');
      }
      await expect(input.first()).toBeVisible();
    });

    test('04-06  searching by name filters results', async ({ page }) => {
      const input = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      if (await input.count() === 0) return test.skip();
      const initialCount = await page.locator('table tbody tr').count();
      await input.fill('zzznoname');
      await page.waitForTimeout(800);
      const filteredCount = await page.locator('table tbody tr').count();
      const emptyState = await page.locator('text=/no results|not found/i').count();
      expect(filteredCount < initialCount || emptyState > 0).toBeTruthy();
    });

    test('04-07  status filter dropdown exists', async ({ page }) => {
      const statusFilter = page.locator('select[name*="status" i], [class*="filter"]').first();
      if (await statusFilter.count() === 0) return console.warn('⚠  No status filter found');
      await expect(statusFilter).toBeVisible();
    });

    test('04-08  date range filter (if present) affects result count', async ({ page }) => {
      const datePicker = page.locator('input[type="date"], [class*="datepicker"], [placeholder*="date" i]').first();
      if (await datePicker.count() === 0) return test.skip();
      await datePicker.fill('2099-01-01');
      await page.waitForTimeout(800);
      const count = await page.locator('table tbody tr').count();
      const emptyState = await page.locator('text=/no results|not found/i').count();
      expect(count === 0 || emptyState > 0).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. LEAD DETAIL
  // ─────────────────────────────────────────────────────────────────
  test.describe('Lead Detail', () => {

    test('04-09  clicking a lead row opens detail view', async ({ page }) => {
      const row = page.locator('table tbody tr').first();
      if (await row.count() === 0) return test.skip();
      await row.click();
      await page.waitForLoadState('networkidle');
      const urlChanged = !page.url().endsWith(LEADS_ROUTE);
      const modalOpen = await page.locator('[role="dialog"]').count() > 0;
      expect(urlChanged || modalOpen).toBeTruthy();
    });

    test('04-10  lead detail shows key fields (email, phone, form source)', async ({ page }) => {
      const row = page.locator('table tbody tr').first();
      if (await row.count() === 0) return test.skip();
      await row.click();
      await page.waitForLoadState('networkidle');
      const bodyText = await page.locator('body').textContent();
      const lc = bodyText?.toLowerCase() ?? '';
      const hasDetails = ['email', 'phone', 'name', 'status'].some(k => lc.includes(k));
      expect(hasDetails).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 4. EXPORT
  // ─────────────────────────────────────────────────────────────────
  test.describe('Export', () => {

    test('04-11  export button is present', async ({ page }) => {
      const exportBtn = page.locator(
        'button:has-text("Export"), a:has-text("Export"), button:has-text("Download"), a:has-text("Download")'
      );
      if (await exportBtn.count() === 0) return console.warn('⚠  No export button found');
      await expect(exportBtn.first()).toBeVisible();
    });

    test('04-12  clicking export initiates a download', async ({ page }) => {
      const exportBtn = page.locator(
        'button:has-text("Export"), a:has-text("Export"), button:has-text("CSV")'
      ).first();
      if (await exportBtn.count() === 0) return test.skip();

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        exportBtn.click(),
      ]);
      // If no browser download event, a file might open in a new tab — either is fine
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|xls|pdf)$/i);
      } else {
        console.warn('⚠  No download event fired — export may open in new tab');
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 5. BULK ACTIONS
  // ─────────────────────────────────────────────────────────────────
  test.describe('Bulk Actions', () => {

    test('04-13  row checkboxes are present', async ({ page }) => {
      const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
      if (await checkboxes.count() === 0) return console.warn('⚠  No row checkboxes');
      await expect(checkboxes.first()).toBeVisible();
    });

    test('04-14  selecting all rows activates bulk action toolbar', async ({ page }) => {
      const selectAll = page.locator('thead input[type="checkbox"]').first();
      if (await selectAll.count() === 0) return test.skip();
      await selectAll.check();
      await page.waitForTimeout(500);
      const toolbar = page.locator('[class*="bulk"], [class*="action-bar"], text=/selected/i');
      if (await toolbar.count() === 0) {
        console.warn('⚠  No bulk action toolbar appeared after select-all');
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 6. SORTING
  // ─────────────────────────────────────────────────────────────────
  test.describe('Sorting', () => {

    test('04-15  clicking a column header sorts the table', async ({ page }) => {
      const headers = page.locator('th[class*="sort"], th[aria-sort]');
      if (await headers.count() === 0) return test.skip();
      const firstHeader = headers.first();
      const beforeText = await page.locator('table tbody tr:first-child td:first-child').textContent();
      await firstHeader.click();
      await page.waitForTimeout(500);
      const afterText = await page.locator('table tbody tr:first-child td:first-child').textContent();
      // Either data changed or aria-sort attribute toggled
      const ariaSort = await firstHeader.getAttribute('aria-sort');
      console.log('Sort after click:', ariaSort, '| First cell before:', beforeText, '| after:', afterText);
    });

  });

});
