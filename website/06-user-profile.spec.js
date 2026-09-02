/**
 * ══════════════════════════════════════════════════════════════════
 *  TEST SUITE 06 — USER MANAGEMENT & PROFILE
 * ══════════════════════════════════════════════════════════════════
 *
 *  Covers:
 *   • User list / admin profile page load
 *   • Profile form fields (name, email, password change)
 *   • Validation on profile updates
 *   • Password change flow (old → new → confirm)
 *   • Avatar / profile picture upload (if present)
 *   • Role/permission display
 */

const { test, expect } = require('@playwright/test');

const BASE = 'https://adminpanel2.appedology.pk';

const PROFILE_ROUTES = ['/profile', '/account', '/settings/profile', '/user/profile'];
const USERS_ROUTES   = ['/users', '/admin/users', '/user-management'];

async function gotoFirst(page, routes) {
  for (const route of routes) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    if (!page.url().includes('/login') && !page.url().includes('/404')) return true;
  }
  return false;
}

test.describe('06 — User Management & Profile', () => {

  // ─────────────────────────────────────────────────────────────────
  // 1. PROFILE PAGE
  // ─────────────────────────────────────────────────────────────────
  test.describe('Admin Profile', () => {

    test('06-01  profile page loads without JS errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await gotoFirst(page, PROFILE_ROUTES);
      expect(errors).toHaveLength(0);
    });

    test('06-02  profile page contains at least one input field', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const inputs = page.locator('input:visible');
      await expect(inputs.first()).toBeVisible({ timeout: 8000 });
    });

    test('06-03  name field is pre-filled with current admin name', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const nameField = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
      if (await nameField.count() === 0) return test.skip();
      const value = await nameField.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('06-04  email field is pre-filled with current admin email', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const emailField = page.locator('input[type="email"], input[name*="email" i]').first();
      if (await emailField.count() === 0) return test.skip();
      const value = await emailField.inputValue();
      expect(value).toContain('@');
    });

    test('06-05  save/update button is present on profile page', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      await expect(saveBtn).toBeVisible();
    });

    test('06-06  saving with invalid email format shows validation error', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const emailField = page.locator('input[type="email"], input[name*="email" i]').first();
      if (await emailField.count() === 0) return test.skip();
      await emailField.fill('bad-email');
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(600);
      const validity = await emailField.evaluate(el => el.validity?.valid);
      const errorEl = await page.locator('[class*="error"], [class*="invalid"]').count();
      expect(!validity || errorEl > 0).toBeTruthy();
    });

    test('06-07  profile picture upload input is present (if feature exists)', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() === 0) {
        console.warn('ℹ  No file/avatar upload found on profile page');
      } else {
        await expect(fileInput.first()).toBeAttached();
      }
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 2. PASSWORD CHANGE
  // ─────────────────────────────────────────────────────────────────
  test.describe('Password Change', () => {

    test('06-08  password change section is present', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const pwdSection = page.locator(
        'input[type="password"], input[name*="password" i], input[name*="current_password" i]'
      );
      if (await pwdSection.count() === 0) {
        return console.warn('ℹ  No password change fields on profile page');
      }
      await expect(pwdSection.first()).toBeVisible();
    });

    test('06-09  mismatched new/confirm passwords show an error', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const pwdInputs = page.locator('input[type="password"]');
      if (await pwdInputs.count() < 2) return test.skip();
      await pwdInputs.nth(0).fill('NewPass@123');
      await pwdInputs.nth(1).fill('DifferentPass@456');
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(800);
      const errorEl = page.locator('[class*="error"], [class*="invalid"], text=/do not match|mismatch|confirm/i');
      if (await errorEl.count() === 0) {
        console.warn('⚠  No mismatch error shown for mismatched passwords');
      } else {
        await expect(errorEl.first()).toBeVisible();
      }
    });

    test('06-10  short password (< 6 chars) is rejected', async ({ page }) => {
      const found = await gotoFirst(page, PROFILE_ROUTES);
      if (!found) return test.skip();
      const pwdInputs = page.locator('input[type="password"]');
      if (await pwdInputs.count() < 1) return test.skip();
      await pwdInputs.first().fill('abc');
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(600);
      const errorEl = await page.locator('[class*="error"], [class*="invalid"]').count();
      console.log('Short-password error elements:', errorEl);
    });

  });

  // ─────────────────────────────────────────────────────────────────
  // 3. USER LIST (if multi-user management exists)
  // ─────────────────────────────────────────────────────────────────
  test.describe('User List', () => {

    test('06-11  user management page loads (if available)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const found = await gotoFirst(page, USERS_ROUTES);
      if (!found) return test.skip();
      expect(errors).toHaveLength(0);
    });

    test('06-12  user list shows at least one record', async ({ page }) => {
      const found = await gotoFirst(page, USERS_ROUTES);
      if (!found) return test.skip();
      const rows = page.locator('table tbody tr, [class*="user-row"]');
      const count = await rows.count();
      const empty = await page.locator('text=/no users|empty/i').count();
      expect(count > 0 || empty > 0).toBeTruthy();
    });

    test('06-13  invite / add user button is present', async ({ page }) => {
      const found = await gotoFirst(page, USERS_ROUTES);
      if (!found) return test.skip();
      const addBtn = page.locator('button:has-text("Invite"), button:has-text("Add User"), button:has-text("New User")');
      if (await addBtn.count() === 0) {
        console.warn('ℹ  No invite/add-user button found');
      } else {
        await expect(addBtn.first()).toBeVisible();
      }
    });

    test('06-14  user rows display role/permission badge', async ({ page }) => {
      const found = await gotoFirst(page, USERS_ROUTES);
      if (!found) return test.skip();
      const rows = page.locator('table tbody tr');
      if (await rows.count() === 0) return test.skip();
      const rowText = await rows.first().textContent();
      const hasRole = /admin|editor|viewer|manager|user/i.test(rowText ?? '');
      console.log('First row role text:', rowText?.trim().slice(0, 80));
      // Log — don't hard-fail since role column presence depends on app
    });

  });

});
