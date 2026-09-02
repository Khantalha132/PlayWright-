/**
 * ══════════════════════════════════════════════════════════════════
 *  PAGE OBJECT MODELS  — utils/pages.js
 *  Reusable helpers shared across test suites
 * ══════════════════════════════════════════════════════════════════
 */

const BASE = 'https://adminpanel2.appedology.pk';

// ─────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────
class LoginPage {
  constructor(page) {
    this.page       = page;
    this.emailInput = page.getByLabel(/email/i);
    this.pwdInput   = page.getByLabel(/password/i);
    this.rememberCb = page.getByLabel(/remember/i);
    this.loginBtn   = page.getByRole('button', { name: /login/i });
  }

  async goto() {
    await this.page.goto(`${BASE}/login`);
  }

  async login(email, password, remember = false) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.pwdInput.fill(password);
    if (remember) await this.rememberCb.check();
    await this.loginBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async loginAsAdmin() {
    return this.login('admin@example.com', 'admin123');
  }
}

// ─────────────────────────────────────────────────────────────────
// FormsPage
// ─────────────────────────────────────────────────────────────────
class FormsPage {
  constructor(page) {
    this.page      = page;
    this.addBtn    = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    this.searchBox = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    this.table     = page.locator('table').first();
    this.rows      = page.locator('table tbody tr');
  }

  async goto() {
    await this.page.goto(`${BASE}/forms`);
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount() {
    return this.rows.count();
  }

  async search(term) {
    await this.searchBox.fill(term);
    await this.page.waitForTimeout(700);
  }

  async openCreateModal() {
    await this.addBtn.click();
    await this.page.waitForSelector('[role="dialog"], form', { timeout: 5000 });
  }
}

// ─────────────────────────────────────────────────────────────────
// LeadsPage
// ─────────────────────────────────────────────────────────────────
class LeadsPage {
  constructor(page) {
    this.page      = page;
    this.searchBox = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    this.rows      = page.locator('table tbody tr');
    this.exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")').first();
  }

  async goto() {
    await this.page.goto(`${BASE}/leads`);
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount() {
    return this.rows.count();
  }

  async openFirstLead() {
    await this.rows.first().click();
    await this.page.waitForLoadState('networkidle');
  }
}

// ─────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Wait for a toast / alert message to appear and return its text.
 */
async function waitForToast(page, timeout = 5000) {
  const toast = page.locator('[class*="toast"], [class*="alert"], [class*="notification"]').first();
  await toast.waitFor({ state: 'visible', timeout });
  return toast.textContent();
}

/**
 * Collect all console errors during a page action.
 * Usage:
 *   const errors = collectConsoleErrors(page);
 *   await doSomething();
 *   expect(errors()).toHaveLength(0);
 */
function collectConsoleErrors(page) {
  const errs = [];
  page.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
  return () => errs;
}

/**
 * Collect all failed network responses (4xx / 5xx).
 */
function collectNetworkFailures(page) {
  const failures = [];
  page.on('response', res => {
    if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
  });
  return () => failures;
}

/**
 * Try navigating to the first route in an array that doesn't redirect to /login or /404.
 */
async function gotoFirst(page, routes) {
  for (const route of routes) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState('networkidle');
    if (!page.url().includes('/login') && !page.url().includes('/404')) return true;
  }
  return false;
}

module.exports = {
  LoginPage,
  FormsPage,
  LeadsPage,
  waitForToast,
  collectConsoleErrors,
  collectNetworkFailures,
  gotoFirst,
  BASE,
};
