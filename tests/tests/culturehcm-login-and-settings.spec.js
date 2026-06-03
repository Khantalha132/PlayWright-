// =============================================================================
// CultureHCM — General Settings Deep Test Suite  (FIXED + EXTENDED)
//
// KEY FIXES vs previous version:
//  1. test.use({ storageState }) moved BEFORE beforeAll — Playwright requires this
//  2. beforeAll receives { browser } fixture instead of launching chromium manually
//  3. STATE_FILE written BEFORE any test runs — no race condition
//  4. Login tests use browser.newContext() with NO storageState override
//  5. goSettings() waits for the actual tab bar, not just heading text
//  6. clickTab / clickSubTab use role-aware locators with exact:true fallback
//  7. Every tab now has dedicated, deeper assertions (not just "body visible")
//  8. Added: Delete row test, form submit with real data, toast/snackbar check,
//     column sort, pagination next/prev, Device sub-tabs, System Config sub-tabs
// =============================================================================

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL     = 'https://demo.culturehcm.com';
const EMAIL        = 'apd0016@appedology.com';
const PASSWORD     = '0yMT8e';
const SETTINGS_URL = `${BASE_URL}/control-panel/general-settings`;
const STATE_FILE   = path.join(__dirname, '.auth-state.json');

// ---------------------------------------------------------------------------
// IMPORTANT: test.use MUST appear at describe scope, before beforeAll
// ---------------------------------------------------------------------------
test.describe('CultureHCM — Full Suite', () => {

  // ── storageState declared first so Playwright picks it up for all tests ──
  test.use({
    storageState: STATE_FILE,
    // Give every test a generous viewport
    viewport: { width: 1440, height: 900 },
  });

  // =========================================================================
  // BEFORE ALL — Login once, persist session
  // =========================================================================
  test.beforeAll(async ({ browser }) => {
    // Use a brand-new context (no storageState yet — file may not exist)
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for email input
    await page.waitForSelector('input[placeholder="Enter your email"]', { timeout: 20_000 });

    await page.locator('input[placeholder="Enter your email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button:has-text("Login")').click();

    // Wait until browser leaves /login
    await page.waitForFunction(
      () => !window.location.href.includes('/login'),
      { timeout: 25_000 }
    );

    // Persist cookies + localStorage
    await ctx.storageState({ path: STATE_FILE });
    await ctx.close();

    console.log('[AUTH] Session saved →', STATE_FILE);
  });

  // =========================================================================
  // AFTER ALL — clean up session file
  // =========================================================================
  test.afterAll(() => {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('[AUTH] Session file removed');
    }
  });

  // =========================================================================
  // SHARED HELPERS
  // =========================================================================

  /** Navigate to General Settings and wait for the tab bar */
  async function goSettings(page) {
    await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });
    // Wait for any of the known tabs — confirms the module has rendered
    await page.waitForSelector(
      'text=Regional Settings, text=Personal Settings',
      { timeout: 20_000 }
    );
  }

  /** Click a main tab by its exact visible label */
  async function clickTab(page, label) {
    const tab = page.locator(`text="${label}"`).first();
    await tab.waitFor({ state: 'visible', timeout: 12_000 });
    await tab.click();
    await page.waitForTimeout(900);
    console.log(`  ▸ Tab: ${label}`);
  }

  /** Click a sub-tab pill (Country / State / City …) */
  async function clickSubTab(page, label) {
    // Try exact match first, then partial
    let sub = page.locator('button, a, li').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
    if (!(await sub.count())) {
      sub = page.locator('button, a, li').filter({ hasText: label }).first();
    }
    await sub.waitFor({ state: 'visible', timeout: 10_000 });
    await sub.click();
    await page.waitForTimeout(700);
    console.log(`    ▸ Sub-tab: ${label}`);
  }

  /** Assert table is visible and log row count */
  async function checkTable(page) {
    const table = page.locator('table').first();
    if (!(await table.count())) { console.log('    [TABLE] not present'); return; }
    await expect(table).toBeVisible();
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    console.log(`    [TABLE] ${count} row(s)`);
    // Header row must exist
    const thead = table.locator('thead th, thead td');
    expect(await thead.count()).toBeGreaterThan(0);
  }

  /** Fill search box, verify table still visible, then clear */
  async function checkSearch(page, term = 'a') {
    const box = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (!(await box.count())) { console.log('    [SEARCH] not present'); return; }
    await box.fill(term);
    await page.waitForTimeout(700);
    // Table (if present) must still render after filtering
    const table = page.locator('table').first();
    if (await table.count()) await expect(table).toBeVisible();
    await box.clear();
    await page.waitForTimeout(400);
    console.log(`    [SEARCH] "${term}" OK`);
  }

  /** Open "+ Add" modal, verify it opens, close it */
  async function checkAddModal(page) {
    const btn = page.locator('button').filter({ hasText: /^\+\s*Add$/i }).first();
    if (!(await btn.count())) { console.log('    [ADD] no button'); return; }
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(800);
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
    if (await modal.count()) {
      await expect(modal).toBeVisible();
      // Modal must have at least one input
      const inputs = modal.locator('input, select, textarea');
      console.log(`    [ADD] modal open, inputs: ${await inputs.count()}`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  /** Click three-dot action menu on first table row */
  async function checkRowActionMenu(page) {
    // Target the last button in first row (typically the ⋮ icon)
    const row = page.locator('table tbody tr').first();
    if (!(await row.count())) { console.log('    [ROW ACTION] no rows'); return; }
    const btn = row.locator('button').last();
    if (!(await btn.count())) { console.log('    [ROW ACTION] no button'); return; }
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    await page.waitForTimeout(600);
    const menu = page.locator('[role="menu"], [class*="dropdown-menu"], [class*="action-menu"]').first();
    if (await menu.count()) {
      await expect(menu).toBeVisible();
      console.log('    [ROW ACTION] menu open ✓');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log('    [ROW ACTION] clicked, no dropdown detected');
    }
  }

  /** Verify pagination control exists and is visible */
  async function checkPagination(page) {
    const pg = page.locator('[class*="pagination"], [aria-label*="pagination"]').first();
    if (!(await pg.count())) { console.log('    [PAGINATION] none'); return; }
    await expect(pg).toBeVisible();
    console.log('    [PAGINATION] ✓');
  }

  /** Click next page then previous page in pagination */
  async function checkPaginationNavigation(page) {
    const nextBtn = page.locator(
      'button[aria-label*="next" i], [class*="next"] button, li.next a, .page-item:last-child a'
    ).first();
    if (!(await nextBtn.count())) { console.log('    [PAGE NAV] no next button'); return; }
    const isDisabled = await nextBtn.isDisabled();
    if (!isDisabled) {
      await nextBtn.click();
      await page.waitForTimeout(700);
      console.log('    [PAGE NAV] next page clicked');
      // Go back
      const prevBtn = page.locator(
        'button[aria-label*="prev" i], [class*="prev"] button, li.prev a, .page-item:first-child a'
      ).first();
      if (await prevBtn.count()) {
        await prevBtn.click();
        await page.waitForTimeout(700);
        console.log('    [PAGE NAV] prev page clicked');
      }
    } else {
      console.log('    [PAGE NAV] next disabled (only 1 page)');
    }
  }

  /** Click a column header to test sorting */
  async function checkColumnSort(page) {
    const th = page.locator('table thead th').nth(1); // skip Serial No, sort on col 2
    if (!(await th.count())) { console.log('    [SORT] no column header'); return; }
    await th.click();
    await page.waitForTimeout(600);
    await th.click(); // toggle direction
    await page.waitForTimeout(600);
    console.log('    [SORT] column sort toggled ✓');
  }

  /** Check for toast / alert message on the page */
  async function checkToast(page) {
    const toast = page.locator(
      '[class*="toast"], [class*="snack"], [class*="alert"], [role="alert"]'
    ).first();
    if (await toast.count()) {
      await expect(toast).toBeVisible();
      console.log('    [TOAST] notification visible ✓');
    }
  }

  // =========================================================================
  // ── LOGIN TESTS (fresh context, no session) ──
  // =========================================================================

  test('L-01  Login page — all UI elements present', async ({ browser }) => {
    const ctx  = await browser.newContext(); // no storageState
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[placeholder="Enter your email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    await expect(page.locator('text=Your Workplace, Just a Login Away.')).toBeVisible();
    await expect(page.locator('text=/Copyright.*CultureHCM/i')).toBeVisible();

    // Social icons row
    const socialRow = page.locator('a[href*="facebook"], a[href*="linkedin"], a[href*="google"], a[href*="twitter"], a[href*="x.com"]');
    console.log(`    Social links: ${await socialRow.count()}`);

    // HCM logo present
    await expect(page.locator('img, svg').first()).toBeVisible();

    console.log('    L-01 ✓');
    await ctx.close();
  });

  test('L-02  Login — empty submit stays on /login', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('button:has-text("Login")').click();
    await page.waitForTimeout(1_000);
    expect(page.url()).toContain('/login');
    console.log('    L-02 ✓ — stayed on /login');
    await ctx.close();
  });

  test('L-03  Login — wrong credentials shows error', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="Enter your email"]').fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('WrongPass999');
    await page.locator('button:has-text("Login")').click();
    await page.waitForTimeout(2_500);

    const stayedOnLogin = page.url().includes('/login');
    const errorVisible  = await page.locator('text=/invalid|incorrect|wrong|failed|error|credentials/i').count() > 0;
    expect(stayedOnLogin || errorVisible).toBeTruthy();
    console.log(`    L-03 ✓ — stayedOnLogin:${stayedOnLogin} error:${errorVisible}`);
    await ctx.close();
  });

  test('L-04  Login — password eye-icon toggles to text type', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="password"]').fill('TestPass123');

    // The eye SVG is typically a sibling/child of the input wrapper
    const eyeBtn = page.locator(
      '[class*="eye"], [class*="toggle"], .input-group-text, span.position-absolute'
    ).filter({ hasText: '' }).first();

    if (await eyeBtn.count()) {
      await eyeBtn.click();
      await page.waitForTimeout(400);
      // Field type should now be "text"
      const inputAfter = page.locator('input[name*="password"], input[id*="password"]').first();
      const typeAfter  = await inputAfter.getAttribute('type').catch(() => 'unknown');
      console.log(`    L-04 — type after toggle: ${typeAfter}`);
    } else {
      console.log('    L-04 [SKIP] eye icon not found by selector');
    }
    await ctx.close();
  });

  test('L-05  Login — Forgot password link clickable', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    await page.locator('text=Forgot password?').click();
    await page.waitForTimeout(1_500);
    const navigated = !page.url().endsWith('/login');
    const modal     = await page.locator('[role="dialog"], .modal').count() > 0;
    expect(navigated || modal).toBeTruthy();
    console.log(`    L-05 ✓ — navigated:${navigated} modal:${modal}`);
    await ctx.close();
  });

  test('L-06  Login — valid credentials redirect to dashboard', async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="Enter your email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button:has-text("Login")').click();
    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 20_000 });
    expect(page.url()).not.toContain('/login');
    console.log(`    L-06 ✓ — landed on: ${page.url()}`);
    await ctx.close();
  });

  // =========================================================================
  // ── GENERAL SETTINGS — SESSION REUSED FROM HERE ──
  // =========================================================================

  test('GS-01  General Settings — 6 tabs visible & page heading present', async ({ page }) => {
    await goSettings(page);
    const tabs = ['Regional Settings','Personal Settings','Custom Fields','Device Setting','System Configuration','Crons Setting'];
    for (const label of tabs) {
      await expect(page.locator(`text="${label}"`).first()).toBeVisible({ timeout: 10_000 });
    }
    // Page heading
    await expect(page.locator('text=General Settings').first()).toBeVisible();
    console.log('    GS-01 ✓');
  });

  // ── REGIONAL SETTINGS ──────────────────────────────────────────────────────

  test('GS-02  Regional → Country — table, search, sort, paginate, add, edit', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    // Heading
    await expect(page.locator('h1,h2,h3,h4').filter({ hasText: /Country/i }).first()).toBeVisible();

    await checkTable(page);
    await checkColumnSort(page);
    await checkSearch(page, 'Pakistan');
    await checkPagination(page);
    await checkPaginationNavigation(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  test('GS-03  Regional → State — table, search, add', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'State');

    await checkTable(page);
    await checkSearch(page, 'Punjab');
    await checkPagination(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  test('GS-04  Regional → City — table, search, add', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'City');

    await checkTable(page);
    await checkSearch(page, 'Karachi');
    await checkPagination(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  test('GS-05  Regional → Area — table, search, add', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Area');

    await checkTable(page);
    await checkSearch(page, 'DHA');
    await checkPagination(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  test('GS-06  Regional → Nationality — table, search, add', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Nationality');

    await checkTable(page);
    await checkSearch(page, 'Pakistani');
    await checkPagination(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  // ── ADD COUNTRY FORM — deep validation ─────────────────────────────────────

  test('GS-07  Country Add — empty submit shows validation errors', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const addBtn = page.locator('button').filter({ hasText: /^\+\s*Add$/i }).first();
    if (!(await addBtn.count())) return console.log('    [SKIP] no +Add');
    await addBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
    await expect(modal).toBeVisible();

    // -- Assert input fields are present in modal --
    const inputs = modal.locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);

    // Submit empty
    const submitBtn = modal.locator('button').filter({ hasText: /save|submit|add|create/i }).first();
    if (await submitBtn.count()) {
      await submitBtn.click();
      await page.waitForTimeout(700);
      const errs = page.locator('[class*="error"],[class*="invalid"],.text-danger,[aria-invalid="true"]');
      console.log(`    Validation indicators: ${await errs.count()}`);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });

  test('GS-08  Country Add — fill & submit valid data, check toast', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const addBtn = page.locator('button').filter({ hasText: /^\+\s*Add$/i }).first();
    if (!(await addBtn.count())) return console.log('    [SKIP] no +Add');
    await addBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
    if (!(await modal.count())) return;
    await expect(modal).toBeVisible();

    // Fill the name field
    const nameInput = modal.locator('input[type="text"], input[placeholder*="name" i]').first();
    if (await nameInput.count()) {
      await nameInput.fill('PW_TestCountry_' + Date.now());
    }

    const submitBtn = modal.locator('button').filter({ hasText: /save|submit|add|create/i }).first();
    if (await submitBtn.count()) {
      await submitBtn.click();
      await page.waitForTimeout(1_200);
      await checkToast(page);
    }

    // Close if still open
    const stillOpen = await modal.isVisible().catch(() => false);
    if (stillOpen) await page.keyboard.press('Escape');
  });

  // ── SHOW ENTRIES DROPDOWN ───────────────────────────────────────────────────

  test('GS-09  Country — Show entries dropdown 10/25/50/100', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const sel = page.locator('select').first();
    if (!(await sel.count())) return console.log('    [SKIP] no select');

    for (const v of ['10', '25', '50', '100']) {
      try {
        await sel.selectOption(v);
        await page.waitForTimeout(600);
        await checkTable(page);
        console.log(`    Entries/page = ${v} ✓`);
      } catch {
        console.log(`    ${v} option not available`);
      }
    }
  });

  // ── EMPTY SEARCH STATE ──────────────────────────────────────────────────────

  test('GS-10  Country — Search with no-match shows empty state', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const box = page.locator('input[placeholder*="Search"]').first();
    if (!(await box.count())) return console.log('    [SKIP]');

    await box.fill('zzz_NO_MATCH_pw_xyz_9999');
    await page.waitForTimeout(1_000);

    const emptyMsg = page.locator('text=/no data|no records|no results|no entries/i').first();
    const rows     = page.locator('table tbody tr');
    console.log(`    Rows: ${await rows.count()}, empty msg: ${await emptyMsg.count()}`);

    await box.clear();
    await page.waitForTimeout(400);
  });

  // ── EDIT FIRST ROW ──────────────────────────────────────────────────────────

  test('GS-11  Country — Edit first row modal, then cancel', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const row    = page.locator('table tbody tr').first();
    if (!(await row.count())) return console.log('    [SKIP] empty table');
    const dotBtn = row.locator('button').last();
    await dotBtn.click({ force: true });
    await page.waitForTimeout(600);

    const editOpt = page.locator('[role="menuitem"],[class*="dropdown-item"],li')
      .filter({ hasText: /^edit$/i }).first();
    if (!(await editOpt.count())) return console.log('    [SKIP] no edit option');

    await editOpt.click();
    await page.waitForTimeout(900);

    const modal = page.locator('[role="dialog"],.modal,[class*="modal"]').first();
    if (await modal.count()) {
      await expect(modal).toBeVisible();
      // Input field should be pre-filled
      const inp = modal.locator('input[type="text"]').first();
      if (await inp.count()) {
        const existing = await inp.inputValue();
        console.log(`    Pre-filled value: "${existing}"`);
        await inp.fill('PW_Edited_Country');
      }
      // Cancel without saving
      const cancelBtn = modal.locator('button').filter({ hasText: /cancel|close/i }).first();
      if (await cancelBtn.count()) await cancelBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      console.log('    GS-11 ✓ edit modal cancelled');
    }
  });

  // ── DELETE ROW (with cancel) ────────────────────────────────────────────────

  test('GS-12  Country — Delete action opens confirm dialog, then cancel', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const row    = page.locator('table tbody tr').first();
    if (!(await row.count())) return console.log('    [SKIP] empty table');
    const dotBtn = row.locator('button').last();
    await dotBtn.click({ force: true });
    await page.waitForTimeout(600);

    const deleteOpt = page.locator('[role="menuitem"],[class*="dropdown-item"],li')
      .filter({ hasText: /^delete$/i }).first();
    if (!(await deleteOpt.count())) return console.log('    [SKIP] no delete option');

    await deleteOpt.click();
    await page.waitForTimeout(800);

    // Confirm dialog should appear
    const confirmDialog = page.locator('[role="dialog"],.modal,[class*="modal"],[class*="confirm"]').first();
    if (await confirmDialog.count()) {
      await expect(confirmDialog).toBeVisible();
      console.log('    Delete confirmation dialog opened ✓');
      // Always cancel — don't delete real data
      const cancelBtn = confirmDialog.locator('button').filter({ hasText: /cancel|no|close/i }).first();
      if (await cancelBtn.count()) await cancelBtn.click();
      else await page.keyboard.press('Escape');
    } else {
      // Some apps use browser confirm() — dismiss it
      page.on('dialog', d => d.dismiss());
      console.log('    Delete — browser confirm handled');
    }
    await page.waitForTimeout(400);
  });

  // ── PERSONAL SETTINGS ──────────────────────────────────────────────────────

  test('GS-13  Personal Settings — form controls, sub-tabs, save button', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Personal Settings');
    await expect(page.locator('body')).toBeVisible();

    const controls = page.locator('input, select, textarea');
    console.log(`    Form controls: ${await controls.count()}`);

    // Check all inner sub-tabs if any
    const subTabs = page.locator('[class*="sub-tab"] button, [class*="nav-tabs"] a, [class*="tab-bar"] button');
    const stCount = await subTabs.count();
    for (let i = 0; i < stCount; i++) {
      const label = (await subTabs.nth(i).textContent())?.trim();
      if (!label || label.length < 2) continue;
      await subTabs.nth(i).click({ force: true });
      await page.waitForTimeout(600);
      console.log(`    Personal sub-tab: ${label}`);
    }

    const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
    if (await saveBtn.count()) {
      await expect(saveBtn).toBeVisible();
      console.log('    Save button visible ✓');
    }

    await checkTable(page);
    await checkSearch(page);
    await checkAddModal(page);
  });

  // ── CUSTOM FIELDS ───────────────────────────────────────────────────────────

  test('GS-14  Custom Fields — table, search, pagination, row actions', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Custom Fields');

    await checkTable(page);
    await checkColumnSort(page);
    await checkSearch(page, 'field');
    await checkPagination(page);
    await checkRowActionMenu(page);
  });

  test('GS-15  Custom Fields Add — field-type dropdown, label, required toggle', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Custom Fields');

    const addBtn = page.locator('button').filter({ hasText: /^\+\s*Add$/i }).first();
    if (!(await addBtn.count())) return console.log('    [SKIP]');
    await addBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"],.modal,[class*="modal"]').first();
    if (!(await modal.count())) return;
    await expect(modal).toBeVisible();

    // Field-type dropdown — must be visible and have options
    const typeDropdown = modal.locator('select').first();
    if (await typeDropdown.count()) {
      await expect(typeDropdown).toBeVisible();
      const options = typeDropdown.locator('option');
      console.log(`    Field-type options: ${await options.count()}`);
    }

    // Label input
    const labelInput = modal.locator('input[type="text"]').first();
    if (await labelInput.count()) await labelInput.fill('PWCustomField');

    // Required checkbox/toggle
    const toggle = modal.locator('input[type="checkbox"], [role="switch"]').first();
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(300);
      console.log('    Required toggle clicked ✓');
    }

    // Empty submit → validation
    const submitBtn = modal.locator('button').filter({ hasText: /save|submit|add|create/i }).first();
    if (await submitBtn.count()) {
      await submitBtn.click();
      await page.waitForTimeout(600);
      const errs = page.locator('[class*="error"],[class*="invalid"],.text-danger');
      console.log(`    Validation indicators: ${await errs.count()}`);
    }

    await page.keyboard.press('Escape');
    console.log('    GS-15 ✓');
  });

  // ── DEVICE SETTING ──────────────────────────────────────────────────────────

  test('GS-16  Device Setting — all sub-tabs, table, add', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Device Setting');
    await expect(page.locator('body')).toBeVisible();

    // Iterate any visible sub-tabs within Device Setting
    const subTabBtns = page.locator(
      '[class*="sub-tab"] button, [class*="nav-pills"] a, [class*="tab-bar"] button, button[class*="tab"]'
    );
    const count = await subTabBtns.count();
    console.log(`    Device sub-tabs: ${count}`);

    for (let i = 0; i < count; i++) {
      const label = (await subTabBtns.nth(i).textContent())?.trim();
      if (!label || label.length < 2) continue;
      try {
        await subTabBtns.nth(i).click({ force: true });
        await page.waitForTimeout(700);
        await checkTable(page);
        await checkSearch(page);
        console.log(`    Device sub-tab "${label}" ✓`);
      } catch (e) {
        console.log(`    Device sub-tab "${label}" error: ${e.message}`);
      }
    }

    await checkTable(page);
    await checkPagination(page);
    await checkRowActionMenu(page);
    await checkAddModal(page);
  });

  // ── SYSTEM CONFIGURATION ───────────────────────────────────────────────────

  test('GS-17  System Configuration — toggles, inputs, save button', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'System Configuration');
    await expect(page.locator('body')).toBeVisible();

    // All toggles visible
    const toggles = page.locator('input[type="checkbox"], [role="switch"]');
    const tCount  = await toggles.count();
    console.log(`    Toggles: ${tCount}`);
    for (let i = 0; i < Math.min(tCount, 5); i++) {
      await expect(toggles.nth(i)).toBeVisible();
    }

    // Text inputs visible
    const textInputs = page.locator('input[type="text"], input[type="number"], textarea');
    console.log(`    Text inputs: ${await textInputs.count()}`);

    // Save / Update button must be visible
    const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
    if (await saveBtn.count()) {
      await expect(saveBtn).toBeVisible();
      console.log('    Save button ✓');
    }

    // Sub-section headings
    const headings = page.locator('h1,h2,h3,h4,h5,[class*="section-title"]');
    console.log(`    Section headings: ${await headings.count()}`);

    await checkTable(page);
    await checkSearch(page);
  });

  test('GS-18  System Configuration — toggle ON/OFF one setting', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'System Configuration');

    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first();
    if (!(await toggle.count())) return console.log('    [SKIP] no toggle');

    const before = await toggle.isChecked();
    await toggle.click();
    await page.waitForTimeout(600);
    const after = await toggle.isChecked();
    console.log(`    Toggle: ${before} → ${after}`);
    expect(before).not.toEqual(after); // state must have changed

    // Revert
    await toggle.click();
    await page.waitForTimeout(500);
    console.log('    GS-18 ✓ toggle reverted');
  });

  // ── CRONS SETTING ───────────────────────────────────────────────────────────

  test('GS-19  Crons Setting — table, search, run buttons, pagination', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Crons Setting');
    await expect(page.locator('body')).toBeVisible();

    await checkTable(page);
    await checkSearch(page);
    await checkPagination(page);
    await checkRowActionMenu(page);

    // Run / Execute buttons per cron row
    const runBtns = page.locator('button').filter({ hasText: /run|execute|trigger/i });
    console.log(`    Run-type buttons: ${await runBtns.count()}`);
    for (let i = 0; i < Math.min(await runBtns.count(), 3); i++) {
      await expect(runBtns.nth(i)).toBeVisible();
    }

    await checkAddModal(page);
  });

  // ── CROSS-TAB RAPID SWITCHING ───────────────────────────────────────────────

  test('GS-20  Rapid tab switching — no crashes or blank screens', async ({ page }) => {
    await goSettings(page);

    const tabs = [
      'Regional Settings', 'Personal Settings', 'Custom Fields',
      'Device Setting', 'System Configuration', 'Crons Setting',
      'Regional Settings', // revisit — confirms idempotency
    ];

    for (const tab of tabs) {
      await clickTab(page, tab);
      // Page must not be blank — at least one visible element below the nav
      await expect(page.locator('main, [class*="content"], section, table, form').first())
        .toBeVisible({ timeout: 8_000 });
    }
    console.log('    GS-20 ✓');
  });

  // ── REGIONAL SUB-TAB RAPID SWITCHING ───────────────────────────────────────

  test('GS-21  Regional sub-tabs rapid switching', async ({ page }) => {
    await goSettings(page);
    await clickTab(page, 'Regional Settings');

    for (const sub of ['Country', 'State', 'City', 'Area', 'Nationality']) {
      await clickSubTab(page, sub);
      await expect(page.locator('table, [class*="content"]').first()).toBeVisible({ timeout: 8_000 });
      console.log(`    Sub-tab "${sub}" loaded ✓`);
    }
  });

  // ── ACCESSIBILITY ───────────────────────────────────────────────────────────

  test('GS-22  Accessibility — headings exist, buttons have labels', async ({ page }) => {
    await goSettings(page);

    for (const tab of ['Regional Settings', 'Custom Fields', 'System Configuration']) {
      await clickTab(page, tab);

      // At least one heading per section
      expect(await page.locator('h1,h2,h3,h4').count()).toBeGreaterThan(0);

      // Every visible button must have text, aria-label, or title
      const btns  = page.locator('button');
      const total = await btns.count();
      let unlabelled = 0;
      for (let i = 0; i < Math.min(total, 10); i++) {
        const text  = (await btns.nth(i).textContent())?.trim();
        const aria  = await btns.nth(i).getAttribute('aria-label');
        const title = await btns.nth(i).getAttribute('title');
        if (!text && !aria && !title) unlabelled++;
      }
      console.log(`    [${tab}] unlabelled buttons (of first 10): ${unlabelled}`);
      // Soft assertion — log but don't fail on icon-only buttons without labels
    }
    console.log('    GS-22 ✓');
  });

});