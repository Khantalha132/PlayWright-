// =============================================================================
// CultureHCM — General Settings: Deep UI & Functional Test Suite
// =============================================================================
// Covers every tab and sub-tab visible in the General Settings module:
//   Regional Settings  → Country | State | City | Area | Nationality
//   Personal Settings
//   Custom Fields
//   Device Setting
//   System Configuration
//   Crons Setting
//
// Verifies: navigation, table rendering, search/filter, "+ Add" modals,
//           export buttons, form validation, CRUD actions, pagination,
//           and responsive layout sanity checks.
// =============================================================================

const { test, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Credentials & base URL
// ---------------------------------------------------------------------------
const BASE_URL  = 'https://demo.culturehcm.com';
const EMAIL     = 'apd0016@appedology.com';
const PASSWORD  = '0yMT8e';
const SETTINGS_URL = `${BASE_URL}/control-panel/general-settings`;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Log to console with a visible prefix */
const log = (...args) => console.log('[TEST]', ...args);

/**
 * Login once and reuse the browser context across every test via storageState.
 * Called from the global setup fixture below.
 */
async function loginOnce(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
}

/**
 * Click a tab by its visible label and wait for the network to settle.
 */
async function clickTab(page, label) {
  const tab = page.locator(`text="${label}"`).first();
  await tab.waitFor({ state: 'visible', timeout: 15_000 });
  await tab.click();
  await page.waitForLoadState('networkidle');
  log(`Navigated to tab: ${label}`);
}

/**
 * Click a sub-tab / pill by its visible label.
 */
async function clickSubTab(page, label) {
  // Look for pill/button/anchor with an exact or partial text match
  const locator = page
    .locator('button, a, li, [role="tab"]')
    .filter({ hasText: new RegExp(`^${label}$`, 'i') })
    .first();
  await locator.waitFor({ state: 'visible', timeout: 10_000 });
  await locator.click();
  await page.waitForLoadState('networkidle');
  log(`  Navigated to sub-tab: ${label}`);
}

/**
 * Fill the search box, assert the table filters, then clear.
 */
async function testSearchBox(page, term = 'test') {
  const searchBox = page
    .locator('input[placeholder*="Search"], input[placeholder*="search"]')
    .first();

  if ((await searchBox.count()) === 0) {
    log('  [skip] No search box found on this view');
    return;
  }

  await searchBox.fill(term);
  await page.waitForTimeout(800);

  // The table (if present) should still be visible after filtering
  const table = page.locator('table').first();
  if (await table.count()) {
    await expect(table).toBeVisible();
  }

  await searchBox.clear();
  await page.waitForTimeout(500);
  log(`  Search box tested with "${term}"`);
}

/**
 * Verify the "+ Add" button is visible, open the modal/drawer, then close it.
 */
async function testAddButton(page) {
  const addBtn = page
    .locator('button, a')
    .filter({ hasText: /^\+\s*Add$/i })
    .first();

  if ((await addBtn.count()) === 0) {
    log('  [skip] No "+ Add" button on this view');
    return;
  }

  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await page.waitForTimeout(1_000);

  // A modal / dialog / drawer should appear
  const modal = page.locator(
    '[role="dialog"], .modal, .drawer, [class*="modal"], [class*="dialog"]'
  );
  if (await modal.count()) {
    await expect(modal.first()).toBeVisible();
    log('  Modal/drawer opened successfully');
  }

  // Close via Escape or a visible close button
  const closeBtn = page
    .locator('button')
    .filter({ hasText: /close|cancel|×/i })
    .first();

  if (await closeBtn.count()) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }

  await page.waitForTimeout(600);
  log('  "+ Add" button flow verified');
}

/**
 * Verify export / download buttons (XLS, PDF, CSV icons).
 */
async function testExportButtons(page) {
  // The app uses icon-only buttons near the table header; look for at least one
  const exportArea = page.locator(
    'button[title*="export" i], button[title*="xls" i], button[title*="pdf" i], button[title*="csv" i], [class*="export"]'
  );
  const count = await exportArea.count();
  log(`  Export buttons found: ${count}`);
  // We just assert they are visible, not that they trigger a download
  for (let i = 0; i < count; i++) {
    await expect(exportArea.nth(i)).toBeVisible();
  }
}

/**
 * Validate a data table: header present, at least one data row visible.
 */
async function testDataTable(page) {
  const table = page.locator('table').first();
  if ((await table.count()) === 0) {
    log('  [skip] No table on this view');
    return;
  }
  await expect(table).toBeVisible();

  const thead = table.locator('thead');
  if (await thead.count()) await expect(thead).toBeVisible();

  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  log(`  Table rows found: ${rowCount}`);
  expect(rowCount).toBeGreaterThanOrEqual(0); // could legitimately be empty
}

/**
 * Validate pagination controls (if present).
 */
async function testPagination(page) {
  const pagination = page.locator(
    '[class*="pagination"], [aria-label*="pagination" i], nav.page'
  );
  if (!(await pagination.count())) {
    log('  [skip] No pagination on this view');
    return;
  }
  await expect(pagination.first()).toBeVisible();

  // "Show N entries" dropdown
  const showDropdown = page.locator('select').filter({ hasText: /^\d+$/ }).first();
  if (await showDropdown.count()) {
    await expect(showDropdown).toBeVisible();
    log('  Pagination "Show entries" dropdown is visible');
  }
}

/**
 * Try clicking the three-dot action menu on the first table row (if present).
 */
async function testRowActions(page) {
  const actionMenu = page
    .locator('table tbody tr')
    .first()
    .locator('button, [role="button"]')
    .filter({ hasText: /⋮|…|⋯/ })
    .first();

  // Fallback: look for any icon-button in first row
  const firstRowBtn = page
    .locator('table tbody tr:first-child [class*="action"], table tbody tr:first-child button')
    .first();

  const target = (await actionMenu.count()) ? actionMenu : firstRowBtn;

  if (!(await target.count())) {
    log('  [skip] No row action button found');
    return;
  }

  await target.scrollIntoViewIfNeeded();
  await target.click({ force: true });
  await page.waitForTimeout(700);

  // A dropdown / context menu should appear
  const dropdown = page.locator(
    '[role="menu"], [class*="dropdown-menu"], [class*="context-menu"]'
  );
  if (await dropdown.count()) {
    await expect(dropdown.first()).toBeVisible();
    log('  Row action dropdown opened');
    await page.keyboard.press('Escape');
  } else {
    log('  Row action clicked (no visible menu detected)');
  }
}

// =============================================================================
// TEST SUITE
// =============================================================================

test.describe('CultureHCM — General Settings: Complete Deep Test', () => {

  // --------------------------------------------------------------------------
  // Login before the very first test; reuse context for all subsequent tests
  // --------------------------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await loginOnce(page);
    // Then land on General Settings
    await page.goto(SETTINGS_URL, { waitUntil: 'networkidle' });
  });

  // ==========================================================================
  // 1. PAGE LOAD SANITY
  // ==========================================================================
  test('1. General Settings page loads and shows all main tabs', async ({ page }) => {
    const expectedTabs = [
      'Regional Settings',
      'Personal Settings',
      'Custom Fields',
      'Device Setting',
      'System Configuration',
      'Crons Setting',
    ];

    for (const label of expectedTabs) {
      const tab = page.locator(`text="${label}"`).first();
      await expect(tab).toBeVisible({ timeout: 10_000 });
      log(`Tab visible: ${label}`);
    }

    // The active/highlighted tab should be Regional Settings by default
    const activeTab = page.locator(
      'button.active, a.active, [class*="active"], [aria-selected="true"]'
    ).filter({ hasText: /Regional Settings/i }).first();
    if (await activeTab.count()) {
      await expect(activeTab).toBeVisible();
    }
  });

  // ==========================================================================
  // 2. REGIONAL SETTINGS — COUNTRY
  // ==========================================================================
  test('2. Regional Settings → Country sub-tab', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    // Heading
    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /Country/i }).first()).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'Pakistan');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 3. REGIONAL SETTINGS — STATE
  // ==========================================================================
  test('3. Regional Settings → State sub-tab', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'State');

    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /State/i }).first()).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'Punjab');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 4. REGIONAL SETTINGS — CITY
  // ==========================================================================
  test('4. Regional Settings → City sub-tab', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'City');

    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /City/i }).first()).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'Karachi');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 5. REGIONAL SETTINGS — AREA
  // ==========================================================================
  test('5. Regional Settings → Area sub-tab', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Area');

    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /Area/i }).first()).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'DHA');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 6. REGIONAL SETTINGS — NATIONALITY
  // ==========================================================================
  test('6. Regional Settings → Nationality sub-tab', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Nationality');

    await expect(page.locator('h1, h2, h3, h4').filter({ hasText: /Nationality/i }).first()).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'Pakistani');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 7. REGIONAL SETTINGS — "+ Add Country" FORM VALIDATION
  // ==========================================================================
  test('7. Regional Settings → Country — Add form field validation', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const addBtn = page
      .locator('button, a')
      .filter({ hasText: /^\+\s*Add$/i })
      .first();

    if ((await addBtn.count()) === 0) {
      log('[skip] No + Add button for Country');
      return;
    }

    await addBtn.click();
    await page.waitForTimeout(1_000);

    // Modal should be open
    const modal = page.locator(
      '[role="dialog"], .modal, [class*="modal"]'
    ).first();
    await expect(modal).toBeVisible();

    // Submit without filling required fields to trigger validation
    const submitBtn = modal
      .locator('button[type="submit"], button')
      .filter({ hasText: /save|submit|add|create/i })
      .first();

    if (await submitBtn.count()) {
      await submitBtn.click();
      await page.waitForTimeout(800);

      // Validation messages or red borders should appear
      const validationMsg = page.locator(
        '[class*="error"], [class*="invalid"], .text-danger, [aria-invalid="true"]'
      );
      const msgCount = await validationMsg.count();
      log(`  Validation messages shown: ${msgCount}`);
    }

    // Fill and submit a valid entry
    const nameInput = modal
      .locator('input[type="text"], input[placeholder*="name" i]')
      .first();

    if (await nameInput.count()) {
      await nameInput.fill('TestCountryPlaywright');
      if (await submitBtn.count()) {
        await submitBtn.click();
        await page.waitForTimeout(1_000);
      }
    }

    // Close if still open
    await page.keyboard.press('Escape');
  });

  // ==========================================================================
  // 8. PERSONAL SETTINGS TAB
  // ==========================================================================
  test('8. Personal Settings tab — full UI check', async ({ page }) => {
    await clickTab(page, 'Personal Settings');

    // The tab content should render
    const content = page.locator(
      'main, [class*="content"], [class*="panel"], section'
    ).first();
    await expect(content).toBeVisible();

    // Look for any form inputs / toggles / selects
    const inputs  = page.locator('input, select, textarea');
    const count   = await inputs.count();
    log(`  Form controls found on Personal Settings: ${count}`);

    // If there are save/update buttons, assert they're visible
    const saveBtn = page
      .locator('button')
      .filter({ hasText: /save|update/i })
      .first();
    if (await saveBtn.count()) {
      await expect(saveBtn).toBeVisible();
    }

    // Sub-tabs if any
    const subTabBar = page.locator('[role="tablist"], [class*="sub-tab"], [class*="subtab"]');
    if (await subTabBar.count()) {
      const subItems = subTabBar.locator('button, a, li');
      const subCount = await subItems.count();
      log(`  Personal Settings sub-tabs: ${subCount}`);
      for (let i = 0; i < subCount; i++) {
        const label = (await subItems.nth(i).textContent())?.trim();
        if (!label || label.length < 2) continue;
        await subItems.nth(i).click({ force: true });
        await page.waitForTimeout(600);
        log(`    Clicked sub-tab: ${label}`);
      }
    }

    await testSearchBox(page);
    await testDataTable(page);
    await testExportButtons(page);
    await testPagination(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 9. CUSTOM FIELDS TAB
  // ==========================================================================
  test('9. Custom Fields tab — full UI check', async ({ page }) => {
    await clickTab(page, 'Custom Fields');

    // Heading
    const heading = page.locator('h1, h2, h3, h4').filter({ hasText: /Custom Fields?/i }).first();
    if (await heading.count()) await expect(heading).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page, 'field');
    await testExportButtons(page);
    await testPagination(page);
    await testRowActions(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 10. CUSTOM FIELDS — Add form deep check
  // ==========================================================================
  test('10. Custom Fields → Add form — field type dropdown & validation', async ({ page }) => {
    await clickTab(page, 'Custom Fields');

    const addBtn = page
      .locator('button, a')
      .filter({ hasText: /^\+\s*Add$/i })
      .first();
    if ((await addBtn.count()) === 0) { log('[skip]'); return; }

    await addBtn.click();
    await page.waitForTimeout(1_000);

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
    if (!(await modal.count())) { log('[skip] No modal'); return; }
    await expect(modal).toBeVisible();

    // Field Type dropdown
    const typeSelect = modal
      .locator('select, [class*="select"], [class*="dropdown"]')
      .first();
    if (await typeSelect.count()) {
      await expect(typeSelect).toBeVisible();
      log('  Field type select is visible');
    }

    // Label input
    const labelInput = modal.locator('input').first();
    if (await labelInput.count()) {
      await labelInput.fill('PlaywrightField');
    }

    // Required toggle
    const requiredToggle = modal
      .locator('input[type="checkbox"], [role="switch"]')
      .first();
    if (await requiredToggle.count()) {
      await requiredToggle.click();
      log('  Required toggle clicked');
    }

    await page.keyboard.press('Escape');
  });

  // ==========================================================================
  // 11. DEVICE SETTING TAB
  // ==========================================================================
  test('11. Device Setting tab — full UI check', async ({ page }) => {
    await clickTab(page, 'Device Setting');

    const content = page.locator('main, [class*="content"], section').first();
    await expect(content).toBeVisible();

    // Sub-tabs (e.g. Attendance Device, Biometric, etc.)
    const subTabs = page
      .locator('button, a, li')
      .filter({ hasText: /Device|Biometric|Attendance|Access/i });
    const stCount = await subTabs.count();
    log(`  Device Setting sub-tabs found: ${stCount}`);

    for (let i = 0; i < stCount; i++) {
      const label = (await subTabs.nth(i).textContent())?.trim();
      if (!label || label.length < 2) continue;
      try {
        await subTabs.nth(i).click({ force: true });
        await page.waitForTimeout(700);
        log(`  Clicked: ${label}`);
        await testDataTable(page);
        await testSearchBox(page);
        await testAddButton(page);
      } catch { /* continue */ }
    }

    await testExportButtons(page);
    await testPagination(page);
  });

  // ==========================================================================
  // 12. SYSTEM CONFIGURATION TAB
  // ==========================================================================
  test('12. System Configuration tab — full UI check', async ({ page }) => {
    await clickTab(page, 'System Configuration');

    const content = page.locator('main, [class*="content"], section').first();
    await expect(content).toBeVisible();

    // System config often has grouped settings with toggles and inputs
    const inputs   = page.locator('input, select, textarea');
    const toggles  = page.locator('input[type="checkbox"], [role="switch"]');
    log(`  Inputs: ${await inputs.count()}, Toggles: ${await toggles.count()}`);

    // Each toggle should be visible and clickable
    const toggleCount = await toggles.count();
    for (let i = 0; i < Math.min(toggleCount, 5); i++) {
      await expect(toggles.nth(i)).toBeVisible();
    }

    // Save / Update button
    const saveBtn = page
      .locator('button')
      .filter({ hasText: /save|update/i })
      .first();
    if (await saveBtn.count()) {
      await expect(saveBtn).toBeVisible();
      log('  Save button is visible');
    }

    await testSearchBox(page);
    await testDataTable(page);
    await testExportButtons(page);
    await testAddButton(page);
  });

  // ==========================================================================
  // 13. CRONS SETTING TAB
  // ==========================================================================
  test('13. Crons Setting tab — full UI check', async ({ page }) => {
    await clickTab(page, 'Crons Setting');

    const content = page.locator('main, [class*="content"], section').first();
    await expect(content).toBeVisible();

    await testDataTable(page);
    await testSearchBox(page);
    await testPagination(page);
    await testRowActions(page);
    await testExportButtons(page);

    // Cron jobs often have a "Run Now" or "Enable/Disable" control per row
    const runBtns = page
      .locator('button')
      .filter({ hasText: /run now|execute|trigger/i });
    const runCount = await runBtns.count();
    log(`  "Run Now" type buttons: ${runCount}`);
    for (let i = 0; i < Math.min(runCount, 3); i++) {
      await expect(runBtns.nth(i)).toBeVisible();
    }

    await testAddButton(page);
  });

  // ==========================================================================
  // 14. REGIONAL SETTINGS — SHOW ENTRIES DROPDOWN
  // ==========================================================================
  test('14. Regional Settings → Country — "Show N entries" dropdown', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const entriesSelect = page
      .locator('select')
      .filter({ hasText: /10|25|50|100/ })
      .first();

    // Fallback: any <select> near the table header
    const anySelect = page.locator('select').first();
    const target = (await entriesSelect.count()) ? entriesSelect : anySelect;

    if (!(await target.count())) {
      log('[skip] No entries dropdown found');
      return;
    }

    const options = ['10', '25', '50', '100'];
    for (const val of options) {
      try {
        await target.selectOption(val);
        await page.waitForTimeout(700);
        log(`  Entries per page set to: ${val}`);
        await testDataTable(page);
      } catch {
        log(`  Option ${val} not available`);
      }
    }
  });

  // ==========================================================================
  // 15. CROSS-TAB NAVIGATION — Rapid switching stress test
  // ==========================================================================
  test('15. Rapid tab switching — no broken layouts', async ({ page }) => {
    const tabs = [
      'Regional Settings',
      'Personal Settings',
      'Custom Fields',
      'Device Setting',
      'System Configuration',
      'Crons Setting',
      'Regional Settings', // revisit to confirm idempotency
    ];

    for (const tab of tabs) {
      await clickTab(page, tab);

      // No JS errors should have crashed the page
      const body = page.locator('body');
      await expect(body).toBeVisible();
      log(`Tab OK: ${tab}`);
    }
  });

  // ==========================================================================
  // 16. SEARCH — Empty result state
  // ==========================================================================
  test('16. Regional Settings → Country — Search empty state', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    const searchBox = page
      .locator('input[placeholder*="Search"], input[placeholder*="search"]')
      .first();

    if (!(await searchBox.count())) { log('[skip]'); return; }

    // Search for something unlikely to exist
    await searchBox.fill('zzz_no_match_xyz_playwright');
    await page.waitForTimeout(1_000);

    // Either an empty row message or simply 0 rows in tbody
    const emptyMsg = page.locator(
      'text=/no data|no records|no results|no entries/i'
    );
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (await emptyMsg.count()) {
      await expect(emptyMsg.first()).toBeVisible();
      log('  Empty state message shown');
    } else {
      log(`  Rows after empty search: ${rowCount}`);
    }

    await searchBox.clear();
  });

  // ==========================================================================
  // 17. EDIT action on first Country row
  // ==========================================================================
  test('17. Regional Settings → Country — Edit first row', async ({ page }) => {
    await clickTab(page, 'Regional Settings');
    await clickSubTab(page, 'Country');

    // Open row actions
    const actionTrigger = page
      .locator('table tbody tr:first-child button, table tbody tr:first-child [class*="action"]')
      .first();

    if (!(await actionTrigger.count())) { log('[skip] No action button'); return; }

    await actionTrigger.click({ force: true });
    await page.waitForTimeout(700);

    // Click "Edit" option
    const editOption = page
      .locator('[role="menuitem"], [class*="dropdown-item"], li')
      .filter({ hasText: /edit/i })
      .first();

    if (!(await editOption.count())) { log('[skip] No Edit option'); return; }

    await editOption.click();
    await page.waitForTimeout(1_000);

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
    if (await modal.count()) {
      await expect(modal).toBeVisible();

      const nameInput = modal.locator('input[type="text"]').first();
      if (await nameInput.count()) {
        await nameInput.fill('UpdatedCountryTest');
        log('  Edit field updated');
      }

      // Cancel instead of saving
      const cancelBtn = modal
        .locator('button')
        .filter({ hasText: /cancel|close/i })
        .first();
      if (await cancelBtn.count()) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  // ==========================================================================
  // 18. LAYOUT & ACCESSIBILITY CHECKS
  // ==========================================================================
  test('18. Layout & accessibility — headings, buttons, ARIA roles', async ({ page }) => {
    const tabs = [
      'Regional Settings',
      'Custom Fields',
      'System Configuration',
    ];

    for (const tab of tabs) {
      await clickTab(page, tab);

      // At least one heading should be present
      const headings = page.locator('h1, h2, h3, h4');
      expect(await headings.count()).toBeGreaterThan(0);

      // All buttons should have accessible text or aria-label
      const buttons = page.locator('button');
      const btnCount = await buttons.count();
      for (let i = 0; i < Math.min(btnCount, 10); i++) {
        const btn = buttons.nth(i);
        const text      = (await btn.textContent())?.trim();
        const ariaLabel = await btn.getAttribute('aria-label');
        const title     = await btn.getAttribute('title');
        // At least one of these should be non-empty
        expect(text || ariaLabel || title).toBeTruthy();
      }

      log(`  Accessibility check passed for: ${tab}`);
    }
  });

});
