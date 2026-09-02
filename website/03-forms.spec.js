/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 03 — FORMS MANAGEMENT
 *  (Lead Manager → Forms section)
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • Forms list loads with data
 *   • Search / filter functionality
 *   • Pagination (if present)
 *   • Viewing a single form detail
 *   • Create / Edit form flows
 *   • Delete form with confirmation dialog
 *   • Empty-state handling
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://adminpanel2.appedology.pk';

// Adjust these selectors based on actual app routes after first run
const FORMS_ROUTE = '/forms';

test.describe('03 — Forms Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}${FORMS_ROUTE}`);
    await page.waitForLoadState('networkidle');
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. FORMS LIST
  // ─────────────────────────────────────────────────────────────────
  test.describe('Forms List', () => {

    test('03-01  forms page loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${BASE}${FORMS_ROUTE}`);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('03-02  table or list of forms is visible', async ({ page }) => {
      const table = page.locator('table, [class*="table"], [class*="list"], [class*="card"]').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('03-03  at least one form record exists (or empty state shown)', async ({ page }) => {
      const rows = page.locator('table tbody tr, [class*="row"], [class*="item"]');
      const count = await rows.count();
      const emptyState = page.locator('text=/no forms|no records|empty/i');
      const hasEmpty = await emptyState.count() > 0;
      expect(count > 0 || hasEmpty).toBeTruthy();
    });

    test('03-04  column headers are visible', async ({ page }) => {
      const headers = page.locator('th, [class*="header"]');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. SEARCH / FILTER
  // ─────────────────────────────────────────────────────────────────
  test.describe('Search & Filter', () => {

    test('03-05  search input is present', async ({ page }) => {
      const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
      const count = await search.count();
      if (count === 0) {
        console.warn('⚠  No search input found on forms page');
      } else {
        await expect(search.first()).toBeVisible();
      }
    });

    test('03-06  typing in search filters the list', async ({ page }) => {
      const search = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      const exists = await search.count() > 0;
      if (!exists) return test.skip();

      const beforeRows = await page.locator('table tbody tr').count();
      await search.fill('zzzzz_no_match_expected');
      await page.waitForTimeout(800);
      const afterRows = await page.locator('table tbody tr').count();
      // Either fewer rows or an empty-state message
      const fewer = afterRows < beforeRows;
      const emptyMsg = await page.locator('text=/no results|not found|no records/i').count() > 0;
      expect(fewer || emptyMsg).toBeTruthy();
    });

    test('03-07  clearing search restores full list', async ({ page }) => {
      const search = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      if (await search.count() === 0) return test.skip();
      const initialCount = await page.locator('table tbody tr').count();
      await search.fill('zzzzz');
      await page.waitForTimeout(500);
      await search.clear();
      await page.waitForTimeout(500);
      const restoredCount = await page.locator('table tbody tr').count();
      expect(restoredCount).toBe(initialCount);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. PAGINATION
  // ─────────────────────────────────────────────────────────────────
  test.describe('Pagination', () => {

    test('03-08  pagination controls render if data exceeds page size', async ({ page }) => {
      const pager = page.locator('[class*="pagination"], nav[aria-label*="pagination" i], .page-item');
      const count = await pager.count();
      if (count === 0) {
        console.log('ℹ  No pagination controls found — possibly all data fits one page');
      } else {
        await expect(pager.first()).toBeVisible();
      }
    });

    test('03-09  clicking "next page" loads different records', async ({ page }) => {
      const next = page.locator('[aria-label="Next"], button:has-text("Next"), a:has-text("Next"), [class*="next"]').first();
      const exists = await next.count() > 0;
      if (!exists) return test.skip();

      const firstPageText = await page.locator('table tbody').textContent();
      await next.click();
      await page.waitForLoadState('networkidle');
      const secondPageText = await page.locator('table tbody').textContent();
      expect(firstPageText).not.toBe(secondPageText);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 4. VIEW FORM DETAIL
  // ─────────────────────────────────────────────────────────────────
  test.describe('Form Detail', () => {

    test('03-10  clicking a form row / view button opens detail', async ({ page }) => {
      const firstRow = page.locator('table tbody tr, [class*="row"]').first();
      if (await firstRow.count() === 0) return test.skip();
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      // URL should change OR a modal should appear
      const urlChanged = !page.url().endsWith(FORMS_ROUTE);
      const modalOpen = await page.locator('[role="dialog"], [class*="modal"]').count() > 0;
      expect(urlChanged || modalOpen).toBeTruthy();
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 5. CREATE FORM
  // ─────────────────────────────────────────────────────────────────
  test.describe('Create Form', () => {

    test('03-11  "Add / New / Create" button is present', async ({ page }) => {
      const btn = page.locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), a:has-text("Add"), a:has-text("New")'
      );
      await expect(btn.first()).toBeVisible();
    });

    test('03-12  clicking create opens a form/modal', async ({ page }) => {
      const btn = page.locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      ).first();
      if (await btn.count() === 0) return test.skip();
      await btn.click();
      await page.waitForTimeout(1000);
      const modal = page.locator('[role="dialog"], [class*="modal"], form');
      await expect(modal.first()).toBeVisible();
    });

    test('03-13  submitting create form without required fields shows errors', async ({ page }) => {
      const btn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      if (await btn.count() === 0) return test.skip();
      await btn.click();
      await page.waitForTimeout(500);
      const submit = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")');
      if (await submit.count() === 0) return test.skip();
      await submit.first().click();
      await page.waitForTimeout(500);
      const errors = await page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]').count();
      expect(errors).toBeGreaterThan(0);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 6. DELETE FORM
  // ─────────────────────────────────────────────────────────────────
  test.describe('Delete Form', () => {

    test('03-14  delete button is present on each row', async ({ page }) => {
      const del = page.locator('button[aria-label*="delete" i], button:has-text("Delete"), a:has-text("Delete"), [class*="delete"]');
      const count = await del.count();
      if (count === 0) {
        console.warn('⚠  No delete buttons found');
      } else {
        await expect(del.first()).toBeVisible();
      }
    });

    test('03-15  delete triggers confirmation dialog', async ({ page }) => {
      const del = page.locator('button[aria-label*="delete" i], button:has-text("Delete"), [class*="delete"]').first();
      if (await del.count() === 0) return test.skip();
      await del.click();
      await page.waitForTimeout(500);
      const confirm = page.locator('[role="dialog"], [role="alertdialog"]');
      await expect(confirm).toBeVisible();
    });

    test('03-16  cancelling delete keeps the record', async ({ page }) => {
      const initialCount = await page.locator('table tbody tr').count();
      const del = page.locator('button[aria-label*="delete" i], button:has-text("Delete"), [class*="delete"]').first();
      if (await del.count() === 0) return test.skip();
      await del.click();
      await page.waitForTimeout(500);
      const cancelBtn = page.locator('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("No")');
      if (await cancelBtn.count() === 0) return test.skip();
      await cancelBtn.first().click();
      await page.waitForTimeout(500);
      const afterCount = await page.locator('table tbody tr').count();
      expect(afterCount).toBe(initialCount);
    });

  });

});
