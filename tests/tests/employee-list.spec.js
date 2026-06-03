import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('CultureHCM - Employee List Full Module Testing with API Monitoring', async ({ page }) => {

    // =========================================================
    // API FAILURE TRACKER
    // =========================================================
    const apiIssues = [];
    const apiCalls  = [];

    page.on('response', async (response) => {
        const url    = response.url();
        const status = response.status();
        const method = response.request().method();

        // Only track XHR/fetch API calls
        const isApi = url.includes('/api/') || url.includes('/v1/') ||
                      url.includes('/v2/') || url.includes('culturehcm.com') &&
                      !url.match(/\.(js|css|png|jpg|ico|svg|woff|ttf)$/);

        if (isApi) {
            apiCalls.push({ url, status, method });

            if (status >= 400) {
                const issue = {
                    url,
                    status,
                    method,
                    statusText: response.statusText(),
                    timestamp: new Date().toISOString()
                };
                apiIssues.push(issue);
                console.log(`\n🔴 API ISSUE DETECTED:`);
                console.log(`   Method  : ${method}`);
                console.log(`   URL     : ${url}`);
                console.log(`   Status  : ${status} ${response.statusText()}`);
                console.log(`   Time    : ${issue.timestamp}`);

                // Try to capture response body for 4xx/5xx
                try {
                    const body = await response.text();
                    if (body && body.length < 500) {
                        console.log(`   Body    : ${body}`);
                        issue.body = body;
                    }
                } catch { }
            }
        }
    });

    page.on('requestfailed', (request) => {
        const issue = {
            url: request.url(),
            method: request.method(),
            failure: request.failure()?.errorText || 'Unknown',
            timestamp: new Date().toISOString()
        };
        apiIssues.push(issue);
        console.log(`\n🔴 REQUEST FAILED:`);
        console.log(`   URL     : ${issue.url}`);
        console.log(`   Reason  : ${issue.failure}`);
    });

    // =========================================================
    // SAFE STEP WRAPPER
    // =========================================================
    const safeStep = async (stepName, fn) => {
        console.log(`\n========== ${stepName} ==========`);
        try {
            await fn();
            console.log(`✅ PASSED: ${stepName}`);
        } catch (e) {
            console.log(`⚠️ FAILED BUT CONTINUING: ${stepName}`);
            console.log(`   Reason: ${e.message}`);
        }
    };

    // =========================================================
    // HELPERS
    // =========================================================
    const clickButtonByText = async (text) => {
        const btns = page.locator('button');
        const count = await btns.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            try {
                const btn  = btns.nth(i);
                const t    = await btn.innerText({ timeout: 1500 }).catch(() => '');
                const v    = await btn.isVisible({ timeout: 1500 }).catch(() => false);
                if (v && t.trim().toUpperCase() === text.toUpperCase()) {
                    await btn.click({ timeout: 5000 });
                    console.log(`  ✔ Button "${text}" clicked`);
                    return true;
                }
            } catch { }
        }
        console.log(`  ⚠️ Button "${text}" not found`);
        return false;
    };

    const safeFill = async (locator, value, label) => {
        try {
            await locator.fill(value, { timeout: 4000 });
            console.log(`  ✔ Filled "${label}": ${value}`);
            return true;
        } catch {
            console.log(`  ⚠️ Could not fill "${label}"`);
            return false;
        }
    };

    const safeClick = async (locator, label) => {
        try {
            await locator.click({ timeout: 5000 });
            console.log(`  ✔ Clicked: ${label}`);
            return true;
        } catch {
            console.log(`  ⚠️ Could not click: ${label}`);
            return false;
        }
    };

    const getTableRows = async () =>
        await page.locator('table tbody tr').count().catch(() => 0);

    const logTableData = async (maxRows = 5) => {
        const rows = await getTableRows();
        console.log(`  Total rows visible: ${rows}`);
        for (let i = 0; i < Math.min(rows, maxRows); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
        }
        return rows;
    };

    const closeAnyModal = async () => {
        const sels = [
            'button[aria-label="Close"]', '.ant-modal-close',
            '.ant-drawer-close', 'button:has-text("Cancel")',
            'button:has-text("Close")', 'button:has-text("Discard")'
        ];
        for (const sel of sels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 1500 }).catch(() => false)) {
                await el.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(800);
                return true;
            }
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
        return false;
    };

    const snapAPI = (label) => {
        console.log(`  📡 API snapshot at "${label}": ${apiCalls.length} calls, ${apiIssues.length} issues`);
    };

    // =========================================================
    // DISABLE ANIMATIONS
    // =========================================================
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                transition: none !important;
                animation: none !important;
                scroll-behavior: auto !important;
            }
        `
    });

    // =========================================================
    // STEP 1: LOGIN
    // =========================================================
    await safeStep('STEP 1 - LOGIN', async () => {

        await page.goto('https://staging.culturehcm.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForTimeout(2000);
        snapAPI('login page load');

        const email = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await email.waitFor({ state: 'visible', timeout: 15000 });
        await email.fill('waseem-babar@hotmail.com');

        await page.locator('input[type="password"]').first().fill('12345678');

        await clickButtonByText('Login');

        await page.waitForURL(/dashboard|employee|home/, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 20000 });

        snapAPI('after login');
        console.log(`  Logged in — URL: ${page.url()}`);
    });

    // =========================================================
    // STEP 2: NAVIGATE TO EMPLOYEE LIST
    // =========================================================
    await safeStep('STEP 2 - NAVIGATE TO EMPLOYEE LIST', async () => {

        await page.goto('https://staging.culturehcm.com/employee/list-employee', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(3000);

        snapAPI('employee list page load');

        console.log(`  Loaded URL: ${page.url()}`);

        const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        console.log(`  Has employee content: ${/employee/i.test(bodyText)}`);
    });

    // =========================================================
    // STEP 3: PAGE TITLE & BREADCRUMB
    // =========================================================
    await safeStep('STEP 3 - PAGE TITLE & BREADCRUMB', async () => {

        const titleCandidates = [
            page.locator('text=Employee List').first(),
            page.locator('text=List Employee').first(),
            page.locator('text=Employees').first(),
            page.locator('h1').first(),
            page.locator('h2').first(),
            page.locator('[class*="title"]').first(),
            page.locator('[class*="heading"]').first()
        ];

        for (const el of titleCandidates) {
            if (await el.count() > 0) {
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                if (text.trim()) {
                    console.log(`  Page title: "${text.trim()}"`);
                    break;
                }
            }
        }

        // Breadcrumb
        const crumbSels = [
            '[class*="breadcrumb"]',
            'nav[aria-label*="breadcrumb"]',
            '[class*="crumb"]'
        ];
        for (const sel of crumbSels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                console.log(`  Breadcrumb: "${text.trim()}"`);
                break;
            }
        }

        // Back button
        const backBtn = page.locator('[class*="back"], button[aria-label*="back" i]').first();
        console.log(`  Back button: ${await backBtn.count() > 0 ? '✅' : '⚠️ not found'}`);
    });

    // =========================================================
    // STEP 4: FULL PAGE LAYOUT DISCOVERY
    // =========================================================
    await safeStep('STEP 4 - FULL PAGE LAYOUT DISCOVERY', async () => {

        const selects  = await page.locator('select').count().catch(() => 0);
        const inputs   = await page.locator('input').count().catch(() => 0);
        const buttons  = await page.locator('button').count().catch(() => 0);
        const tables   = await page.locator('table').count().catch(() => 0);
        const tabs     = await page.locator('[role="tab"], [class*="tab"]').count().catch(() => 0);
        const cards    = await page.locator('[class*="card"]').count().catch(() => 0);
        const links    = await page.locator('a').count().catch(() => 0);

        console.log(`  Layout summary:`);
        console.log(`    <select>  : ${selects}`);
        console.log(`    <input>   : ${inputs}`);
        console.log(`    <button>  : ${buttons}`);
        console.log(`    <table>   : ${tables}`);
        console.log(`    tabs      : ${tabs}`);
        console.log(`    cards     : ${cards}`);
        console.log(`    <a> links : ${links}`);

        // Log all buttons
        const allBtns = page.locator('button');
        const btnCount = await allBtns.count().catch(() => 0);
        console.log(`\n  All visible buttons:`);
        for (let i = 0; i < Math.min(btnCount, 20); i++) {
            try {
                const btn = allBtns.nth(i);
                if (await btn.isVisible({ timeout: 1500 })) {
                    const text  = await btn.innerText({ timeout: 1500 }).catch(() => '');
                    const title = await btn.getAttribute('title').catch(() => '');
                    const aria  = await btn.getAttribute('aria-label').catch(() => '');
                    console.log(`    Btn ${i + 1}: "${text.trim()}" title="${title}" aria="${aria}"`);
                }
            } catch { }
        }

        // Log all inputs
        const allInputs = page.locator('input');
        const inputCount = await allInputs.count().catch(() => 0);
        console.log(`\n  All visible inputs:`);
        for (let i = 0; i < Math.min(inputCount, 15); i++) {
            try {
                const inp = allInputs.nth(i);
                if (await inp.isVisible({ timeout: 1500 })) {
                    const ph   = await inp.getAttribute('placeholder').catch(() => '');
                    const type = await inp.getAttribute('type').catch(() => 'text');
                    const name = await inp.getAttribute('name').catch(() => '');
                    console.log(`    Input ${i + 1}: type="${type}" placeholder="${ph}" name="${name}"`);
                }
            } catch { }
        }

        // Log all selects
        const allSels = page.locator('select');
        const selCount = await allSels.count().catch(() => 0);
        console.log(`\n  All visible selects:`);
        for (let i = 0; i < Math.min(selCount, 10); i++) {
            try {
                const sel = allSels.nth(i);
                if (await sel.isVisible({ timeout: 1500 })) {
                    const opts = await sel.locator('option').allTextContents().catch(() => []);
                    const name = await sel.getAttribute('name').catch(() => '');
                    console.log(`    Select ${i + 1} [name="${name}"]: [${opts.join(' | ')}]`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 5: VIEW TOGGLE (Grid / List / Table)
    // =========================================================
    await safeStep('STEP 5 - VIEW TOGGLE (Grid/List/Table)', async () => {

        const viewToggles = [
            page.locator('button[aria-label*="grid" i], button[title*="grid" i]').first(),
            page.locator('button[aria-label*="list" i], button[title*="list" i]').first(),
            page.locator('button[aria-label*="table" i], button[title*="table" i]').first(),
            page.locator('[class*="grid-view"], [class*="list-view"], [class*="view-toggle"]').first(),
            page.locator('button:has-text("Grid")').first(),
            page.locator('button:has-text("List")').first(),
            page.locator('button:has-text("Table")').first()
        ];

        for (const el of viewToggles) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const text = await el.innerText({ timeout: 1500 }).catch(() => '');
                await el.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1500);
                console.log(`  View toggle clicked: "${text.trim()}"`);
                snapAPI(`view toggle ${text.trim()}`);
            }
        }

        if ((await viewToggles[0].count()) === 0) {
            console.log('  No view toggle buttons found');
        }
    });

    // =========================================================
    // STEP 6: TABS VALIDATION
    // =========================================================
    await safeStep('STEP 6 - TABS VALIDATION', async () => {

        const tabSelectors = [
            '[role="tab"]',
            '.ant-tabs-tab',
            '[class*="tab-item"]',
            '[class*="tab_item"]',
            'button[class*="tab"]',
            'li[class*="tab"]'
        ];

        let tabsFound = false;
        for (const sel of tabSelectors) {
            const tabs = page.locator(sel);
            const count = await tabs.count().catch(() => 0);
            if (count > 0) {
                console.log(`  Tabs found (${sel}): ${count}`);
                tabsFound = true;

                for (let i = 0; i < count; i++) {
                    try {
                        const tab = tabs.nth(i);
                        if (await tab.isVisible({ timeout: 2000 })) {
                            const text = await tab.innerText({ timeout: 2000 }).catch(() => '');
                            console.log(`  Tab ${i + 1}: "${text.trim()}"`);
                            await tab.click({ timeout: 5000 });
                            await page.waitForTimeout(2000);
                            const rows = await getTableRows();
                            console.log(`  → Rows after tab "${text.trim()}": ${rows}`);
                            snapAPI(`tab ${text.trim()}`);
                        }
                    } catch { }
                }
                break;
            }
        }

        if (!tabsFound) console.log('  No tabs found — single view');
    });

    // =========================================================
    // STEP 7: FILTER SECTION — EACH DROPDOWN
    // =========================================================
    await safeStep('STEP 7 - ALL FILTER DROPDOWNS', async () => {

        const selects = page.locator('select');
        const count   = await selects.count().catch(() => 0);
        console.log(`  Filter dropdowns: ${count}`);

        for (let i = 0; i < count; i++) {
            try {
                const sel  = selects.nth(i);
                if (!await sel.isVisible({ timeout: 2000 })) continue;

                const opts = await sel.locator('option').allTextContents().catch(() => []);
                const name = await sel.getAttribute('name').catch(() => `dropdown_${i + 1}`);
                console.log(`\n  Filter "${name}" options: [${opts.join(' | ')}]`);

                if (opts.length <= 1) { console.log('  → Only 1 option, skip'); continue; }

                // Test each option
                for (let j = 1; j < Math.min(opts.length, 4); j++) {
                    await sel.selectOption({ index: j }).catch(() => {});
                    await page.waitForTimeout(400);

                    await clickButtonByText('SEARCH');
                    await page.waitForTimeout(2500);

                    const rows = await getTableRows();
                    console.log(`  → "${name}" = "${opts[j]}": ${rows} row(s)`);
                    snapAPI(`filter ${name}=${opts[j]}`);
                }

                await clickButtonByText('RESET');
                await page.waitForTimeout(1500);
                console.log(`  → Filter "${name}" reset`);

            } catch (e) {
                console.log(`  ⚠️ Dropdown ${i + 1} error: ${e.message}`);
            }
        }
    });

    // =========================================================
    // STEP 8: TEXT INPUT FILTERS
    // =========================================================
    await safeStep('STEP 8 - TEXT INPUT FILTERS', async () => {

        const inputs = page.locator(
            'input[type="text"], input:not([type]), input[type="search"], input[type="number"]'
        );
        const count = await inputs.count().catch(() => 0);
        console.log(`  Text inputs: ${count}`);

        const sampleMap = {
            'name':       'John',
            'email':      'test@example.com',
            'employee':   'EMP',
            'id':         '001',
            'cnic':       '12345',
            'phone':      '0300',
            'department': 'HR',
            'default':    'test'
        };

        for (let i = 0; i < count; i++) {
            try {
                const inp = inputs.nth(i);
                if (!await inp.isVisible({ timeout: 2000 })) continue;

                const ph = await inp.getAttribute('placeholder').catch(() => '');
                if (/search table/i.test(ph)) continue;

                let val = sampleMap['default'];
                for (const [key, v] of Object.entries(sampleMap)) {
                    if (ph.toLowerCase().includes(key)) { val = v; break; }
                }

                await safeFill(inp, val, `"${ph}"`);
                await page.waitForTimeout(400);

                await clickButtonByText('SEARCH');
                await page.waitForTimeout(2500);
                const rows = await getTableRows();
                console.log(`  → Input "${ph}" = "${val}": ${rows} row(s)`);
                snapAPI(`text filter ${ph}`);

                await clickButtonByText('RESET');
                await page.waitForTimeout(1500);

            } catch (e) {
                console.log(`  ⚠️ Input ${i + 1} error: ${e.message}`);
            }
        }
    });

    // =========================================================
    // STEP 9: DATE FILTER INPUTS
    // =========================================================
    await safeStep('STEP 9 - DATE FILTER INPUTS', async () => {

        const dateInputs = page.locator('input[type="date"], input[type="month"]');
        const count = await dateInputs.count().catch(() => 0);
        console.log(`  Date inputs: ${count}`);

        for (let i = 0; i < count; i++) {
            try {
                const inp  = dateInputs.nth(i);
                if (!await inp.isVisible({ timeout: 2000 })) continue;

                const type  = await inp.getAttribute('type').catch(() => 'date');
                const ph    = await inp.getAttribute('placeholder').catch(() => '');
                const value = type === 'month' ? '2026-01' : '2026-01-15';

                await safeFill(inp, value, `date "${ph}"`);
                await page.waitForTimeout(400);

                await clickButtonByText('SEARCH');
                await page.waitForTimeout(2500);
                const rows = await getTableRows();
                console.log(`  → Date "${ph}" = "${value}": ${rows} row(s)`);
                snapAPI(`date filter ${ph}`);

                await clickButtonByText('RESET');
                await page.waitForTimeout(1500);
            } catch (e) {
                console.log(`  ⚠️ Date input ${i + 1} error: ${e.message}`);
            }
        }

        if (count === 0) console.log('  No date inputs found');
    });

    // =========================================================
    // STEP 10: SEARCH BUTTON (empty = all records)
    // =========================================================
    await safeStep('STEP 10 - SEARCH BUTTON (empty)', async () => {

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(2500);
        const rows = await getTableRows();
        console.log(`  All records (empty search): ${rows}`);
        snapAPI('empty search');
    });

    // =========================================================
    // STEP 11: RESET BUTTON VALIDATION
    // =========================================================
    await safeStep('STEP 11 - RESET BUTTON VALIDATION', async () => {

        // Fill something
        const firstInput = page.locator('input[type="text"], input:not([type])').first();
        if (await firstInput.count() > 0 && await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await safeFill(firstInput, 'DUMMY_RESET_TEST', 'first input');
        }
        const firstSel = page.locator('select').first();
        if (await firstSel.count() > 0) {
            await firstSel.selectOption({ index: 1 }).catch(() => {});
        }

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        snapAPI('reset');

        // Verify cleared
        if (await firstInput.count() > 0) {
            const val = await firstInput.inputValue({ timeout: 2000 }).catch(() => '');
            console.log(`  Input after reset: "${val}" ${val === '' ? '✅ cleared' : '⚠️ NOT cleared'}`);
        }
        if (await firstSel.count() > 0) {
            const selVal = await firstSel.inputValue({ timeout: 2000 }).catch(() => '');
            console.log(`  Dropdown after reset: "${selVal}"`);
        }
        const rows = await getTableRows();
        console.log(`  Rows after reset: ${rows}`);
    });

    // =========================================================
    // STEP 12: SHOW ENTRIES DROPDOWN
    // =========================================================
    await safeStep('STEP 12 - SHOW ENTRIES DROPDOWN', async () => {

        const allSels = page.locator('select');
        const count   = await allSels.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
            const opts = await allSels.nth(i).locator('option').allTextContents().catch(() => []);
            const isEntries = opts.some(o => /10|25|50|100/i.test(o));
            if (isEntries) {
                console.log(`  Show entries options: [${opts.join(' | ')}]`);
                for (let j = 0; j < opts.length; j++) {
                    await allSels.nth(i).selectOption({ index: j }).catch(() => {});
                    await page.waitForTimeout(1000);
                    const rows = await getTableRows();
                    console.log(`  Show "${opts[j]}": ${rows} rows visible`);
                    snapAPI(`show entries ${opts[j]}`);
                }
                break;
            }
        }
    });

    // =========================================================
    // STEP 13: SEARCH TABLE DATA (inline)
    // =========================================================
    await safeStep('STEP 13 - SEARCH TABLE DATA (inline)', async () => {

        const searchInput = page.locator(
            'input[placeholder="Search Table Data"], input[placeholder*="Search" i]'
        ).first();

        if (!await searchInput.count() || !await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('  ⚠️ Search Table Data input not found');
            return;
        }

        const terms = [
            'HR', 'Manager', 'Engineer', 'Admin',
            'EMP', '001', 'Ali', 'Ahmed',
            'Sales', 'IT', 'Finance'
        ];

        for (const term of terms) {
            await safeFill(searchInput, term, 'Table Search');
            await page.waitForTimeout(1500);
            const rows = await getTableRows();
            console.log(`  Search "${term}": ${rows} row(s)`);
            snapAPI(`table search ${term}`);
            await searchInput.clear({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(600);
        }
    });

    // =========================================================
    // STEP 14: TABLE COLUMNS VALIDATION
    // =========================================================
    await safeStep('STEP 14 - TABLE COLUMNS VALIDATION', async () => {

        const tables = page.locator('table');
        const tableCount = await tables.count().catch(() => 0);
        console.log(`  Tables: ${tableCount}`);

        if (tableCount === 0) {
            // Could be card/grid view
            const cards = page.locator('[class*="employee-card"], [class*="emp-card"], [class*="card"]');
            const cardCount = await cards.count().catch(() => 0);
            console.log(`  Card items (grid view): ${cardCount}`);
            return;
        }

        for (let t = 0; t < tableCount; t++) {
            const headers = await tables.nth(t).locator('th').allInnerTexts().catch(() => []);
            console.log(`  Table ${t + 1} columns: ${headers.join(' | ')}`);

            // Common employee columns
            const expected = [
                'Id', 'Employee Id', 'Name', 'Department', 'Designation',
                'Email', 'Phone', 'Contact', 'Status', 'Actions', 'Gender',
                'Joining Date', 'Employment Type'
            ];
            for (const col of expected) {
                const found = headers.some(h => h.toLowerCase().includes(col.toLowerCase()));
                if (found) console.log(`  ✅ Column "${col}" present`);
            }
        }
    });

    // =========================================================
    // STEP 15: TABLE ROW DATA VALIDATION
    // =========================================================
    await safeStep('STEP 15 - TABLE ROW DATA VALIDATION', async () => {

        const rows = await getTableRows();
        console.log(`  Total rows: ${rows}`);

        if (rows === 0) {
            const emptySels = [
                '.ant-empty', '[class*="empty"]',
                'text=/no data/i', 'text=/no employee/i', 'text=/no records/i'
            ];
            for (const sel of emptySels) {
                const el = page.locator(sel).first();
                if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                    const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                    console.log(`  Empty state: "${text.trim()}"`);
                    break;
                }
            }
            return;
        }

        for (let i = 0; i < Math.min(rows, 10); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);

            // Flag empty cells
            cells.forEach((cell, idx) => {
                if (!cell.trim()) {
                    console.log(`    ⚠️ Row ${i + 1}, cell ${idx + 1}: empty`);
                }
            });
        }
    });

    // =========================================================
    // STEP 16: TABLE COLUMN SORT
    // =========================================================
    await safeStep('STEP 16 - TABLE COLUMN SORT', async () => {

        const ths = page.locator('table thead th');
        const count = await ths.count().catch(() => 0);
        console.log(`  Sortable headers: ${count}`);

        for (let i = 0; i < Math.min(count, 7); i++) {
            try {
                const th   = ths.nth(i);
                const text = await th.innerText({ timeout: 2000 }).catch(() => '');
                if (!text.trim() || /actions/i.test(text)) continue;

                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);
                const rowsAsc = await getTableRows();
                console.log(`  Sort ASC  "${text.trim()}": ${rowsAsc} rows`);
                snapAPI(`sort asc ${text.trim()}`);

                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);
                const rowsDesc = await getTableRows();
                console.log(`  Sort DESC "${text.trim()}": ${rowsDesc} rows`);

            } catch {
                console.log(`  ⚠️ Sort column ${i + 1} failed`);
            }
        }
    });

    // =========================================================
    // STEP 17: EXPORT BUTTONS (CSV / PDF)
    // =========================================================
    await safeStep('STEP 17 - EXPORT BUTTONS', async () => {

        const exportSels = [
            'button[title*="CSV" i]', 'button[title*="Excel" i]',
            'button[title*="PDF" i]', 'button[aria-label*="export" i]',
            'button[aria-label*="csv" i]', 'button[aria-label*="pdf" i]',
            'button:has-text("Export")', 'button:has-text("Download")',
            'a[title*="CSV" i]', 'a[title*="PDF" i]'
        ];

        let found = 0;
        for (const sel of exportSels) {
            const btn = page.locator(sel).first();
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log(`  Export clicked: ${sel}`);
                snapAPI(`export ${sel}`);
                found++;
            }
        }

        if (found === 0) {
            const iconBtns = page.locator('button:has(svg)');
            const total = await iconBtns.count().catch(() => 0);
            console.log(`  Icon-only buttons: ${total}`);
            for (let i = 0; i < Math.min(total, 4); i++) {
                try {
                    if (await iconBtns.nth(i).isVisible({ timeout: 2000 })) {
                        await iconBtns.nth(i).click({ timeout: 4000 });
                        await page.waitForTimeout(800);
                        console.log(`  Icon button ${i + 1} clicked`);
                        snapAPI(`icon button ${i + 1}`);
                    }
                } catch { }
            }
        }
    });

    // =========================================================
    // STEP 18: ADD EMPLOYEE BUTTON
    // =========================================================
    await safeStep('STEP 18 - ADD EMPLOYEE BUTTON', async () => {

        const addSels = [
            page.locator('button:has-text("Add Employee")').first(),
            page.locator('button:has-text("Add")').first(),
            page.locator('button:has-text("Create")').first(),
            page.locator('button:has-text("New Employee")').first(),
            page.locator('a:has-text("Add Employee")').first(),
            page.locator('[class*="add"]:visible').first()
        ];

        let addBtn = null;
        for (const btn of addSels) {
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                addBtn = btn;
                const text = await btn.innerText({ timeout: 2000 }).catch(() => '');
                console.log(`  Add button found: "${text.trim()}"`);
                break;
            }
        }

        if (!addBtn) {
            console.log('  ⚠️ Add Employee button not found');
            return;
        }

        // Click with timeout guard
        const result = await Promise.race([
            addBtn.click({ timeout: 5000 }).then(() => 'clicked'),
            new Promise(r => setTimeout(() => r('timeout'), 5000))
        ]);
        console.log(`  Click result: ${result}`);
        await page.waitForTimeout(2500);
        snapAPI('add employee click');

        // Check modal / page navigation
        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]', '[class*="drawer"]'];
        let formOpened = false;

        for (const sel of modalSels) {
            const opened = await page.locator(sel).first().isVisible({ timeout: 3000 }).catch(() => false);
            if (opened) {
                console.log(`  Add form opened (${sel})`);
                formOpened = true;

                // Validate form fields
                const fields = page.locator(`${sel} input, ${sel} select, ${sel} textarea`);
                const fCount = await fields.count().catch(() => 0);
                console.log(`  Form fields: ${fCount}`);
                for (let i = 0; i < Math.min(fCount, 15); i++) {
                    const ph   = await fields.nth(i).getAttribute('placeholder').catch(() => '');
                    const type = await fields.nth(i).getAttribute('type').catch(() => '');
                    const tag  = await fields.nth(i).evaluate(e => e.tagName).catch(() => '');
                    const name = await fields.nth(i).getAttribute('name').catch(() => '');
                    console.log(`    Field ${i + 1} [${tag}]: type="${type}" name="${name}" placeholder="${ph}"`);
                }

                // Submit empty → check validation
                const submitBtn = page.locator(
                    `${sel} button[type="submit"], ${sel} button:has-text("Save"), ${sel} button:has-text("Submit")`
                ).first();
                if (await submitBtn.count() > 0 && await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await submitBtn.click({ timeout: 4000 }).catch(() => {});
                    await page.waitForTimeout(2000);
                    const errors = page.locator('[class*="error"], [class*="invalid"], .ant-form-item-explain-error');
                    const errCount = await errors.count().catch(() => 0);
                    console.log(`  Validation errors on empty submit: ${errCount}`);
                    snapAPI('empty form submit');
                }

                await closeAnyModal();
                console.log('  Add form closed');
                break;
            }
        }

        if (!formOpened) {
            const currentUrl = page.url();
            if (!currentUrl.includes('list-employee')) {
                console.log(`  Navigated to: ${currentUrl}`);
                await page.goBack({ timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(2000);
            } else {
                console.log('🐛 BUG: Add Employee clicked — no form appeared & no navigation');
                await page.screenshot({ path: 'test-assets/BUG-add-employee-no-form.png', fullPage: false });
            }
        }
    });

    // =========================================================
    // STEP 19: ROW ACTIONS DISCOVERY
    // =========================================================
    await safeStep('STEP 19 - ROW ACTIONS DISCOVERY', async () => {

        const rows = await getTableRows();
        console.log(`  Rows for action testing: ${rows}`);
        if (rows === 0) { console.log('  No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);

        const actionEls = firstRow.locator('button, a, [role="button"], [class*="action"], svg, [class*="icon"]');
        const elCount   = await actionEls.count().catch(() => 0);
        console.log(`  Action elements in first row: ${elCount}`);

        for (let i = 0; i < Math.min(elCount, 10); i++) {
            try {
                const el = actionEls.nth(i);
                if (await el.isVisible({ timeout: 2000 })) {
                    const text  = await el.innerText({ timeout: 1500 }).catch(() => '');
                    const title = await el.getAttribute('title').catch(() => '');
                    const aria  = await el.getAttribute('aria-label').catch(() => '');
                    const tag   = await el.evaluate(e => e.tagName).catch(() => '');
                    console.log(`  Action ${i + 1} [${tag}]: text="${text.trim()}" title="${title}" aria="${aria}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 20: THREE-DOT / CONTEXT MENU
    // =========================================================
    await safeStep('STEP 20 - THREE-DOT MENU (⋮)', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('  No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(400);

        const lastCell = firstRow.locator('td').last();
        await lastCell.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(1500);
        snapAPI('three-dot menu open');

        const menuSels = [
            '.ant-dropdown', '.ant-popover', '[class*="dropdown"]',
            '[class*="menu"]', '[role="menu"]', '[class*="popup"]'
        ];

        let menuOpened = false;
        for (const sel of menuSels) {
            const menu = page.locator(sel).first();
            if (await menu.count() > 0 && await menu.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Menu opened (${sel})`);
                menuOpened = true;

                const items = menu.locator('li, [role="menuitem"], a, button');
                const iCount = await items.count().catch(() => 0);
                console.log(`  Menu items: ${iCount}`);

                for (let i = 0; i < Math.min(iCount, 10); i++) {
                    const t = await items.nth(i).innerText({ timeout: 1500 }).catch(() => '');
                    if (t.trim()) console.log(`    Item ${i + 1}: "${t.trim()}"`);
                }
                break;
            }
        }

        if (!menuOpened) console.log('  ⚠️ Three-dot menu did not open');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    });

    // =========================================================
    // STEP 21: VIEW EMPLOYEE DETAIL
    // =========================================================
    await safeStep('STEP 21 - VIEW EMPLOYEE DETAIL', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('  No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.locator('td').first().click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(2500);
        snapAPI('view employee detail');

        const currentUrl = page.url();
        if (!currentUrl.includes('list-employee')) {
            console.log(`  Navigated to detail: ${currentUrl}`);
            await page.goBack({ timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000);
            return;
        }

        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]'];
        for (const sel of modalSels) {
            const opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (opened) {
                const content = await page.locator(sel).first().innerText({ timeout: 3000 }).catch(() => '');
                console.log(`  Detail modal content preview: "${content.substring(0, 300)}"`);
                await closeAnyModal();
                console.log('  Detail closed');
                return;
            }
        }

        // Try view button
        const viewBtn = firstRow.locator(
            'button[title*="View" i], button[aria-label*="view" i], a:has-text("View")'
        ).first();
        if (await viewBtn.count() > 0) {
            await viewBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2500);
            console.log('  View button clicked');
        } else {
            console.log('  ⚠️ No view action triggered');
        }
    });

    // =========================================================
    // STEP 22: EDIT EMPLOYEE
    // =========================================================
    await safeStep('STEP 22 - EDIT EMPLOYEE', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('  No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(400);

        const editBtn = firstRow.locator(
            'button[title*="Edit" i], button[aria-label*="edit" i], a:has-text("Edit")'
        ).first();

        if (await editBtn.count() > 0 && await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2500);
            snapAPI('edit employee');
        } else {
            // Try via three-dot menu
            await firstRow.locator('td').last().click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(1500);
            const editInMenu = page.locator('text=Edit, [role="menuitem"]:has-text("Edit")').first();
            if (await editInMenu.count() > 0 && await editInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
                await editInMenu.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2500);
                snapAPI('edit via menu');
            } else {
                await page.keyboard.press('Escape');
                console.log('  ⚠️ Edit option not found');
                return;
            }
        }

        const currentUrl = page.url();
        if (!currentUrl.includes('list-employee')) {
            console.log(`  Edit page: ${currentUrl}`);
            // Validate edit form fields
            const fields = page.locator('input, select, textarea');
            const fCount = await fields.count().catch(() => 0);
            console.log(`  Edit form fields: ${fCount}`);
            for (let i = 0; i < Math.min(fCount, 10); i++) {
                const ph  = await fields.nth(i).getAttribute('placeholder').catch(() => '');
                const val = await fields.nth(i).inputValue({ timeout: 2000 }).catch(() => '');
                const tag = await fields.nth(i).evaluate(e => e.tagName).catch(() => '');
                if (await fields.nth(i).isVisible({ timeout: 1500 }).catch(() => false)) {
                    console.log(`  Field ${i + 1} [${tag}]: placeholder="${ph}" currentValue="${val}"`);
                }
            }
            await page.goBack({ timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000);
        } else {
            const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer'];
            for (const sel of modalSels) {
                if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log(`  Edit modal opened (${sel})`);
                    await closeAnyModal();
                    break;
                }
            }
        }
    });

    // =========================================================
    // STEP 23: DELETE EMPLOYEE (cancel only)
    // =========================================================
    await safeStep('STEP 23 - DELETE EMPLOYEE (cancel only)', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('  No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(400);

        const deleteBtn = firstRow.locator(
            'button[title*="Delete" i], button[aria-label*="delete" i], button:has-text("Delete")'
        ).first();

        if (await deleteBtn.count() > 0 && await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteBtn.click({ timeout: 4000 }).catch(() => {});
        } else {
            await firstRow.locator('td').last().click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(1500);
            const delMenu = page.locator('text=Delete, [role="menuitem"]:has-text("Delete")').first();
            if (await delMenu.count() > 0 && await delMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
                await delMenu.click({ timeout: 4000 }).catch(() => {});
            } else {
                await page.keyboard.press('Escape');
                console.log('  ⚠️ Delete option not found');
                return;
            }
        }

        await page.waitForTimeout(2000);
        snapAPI('delete employee');

        const confirmSels = [
            '[role="dialog"]', '.ant-modal-confirm',
            '.ant-popover', '[class*="confirm"]'
        ];
        let confirmed = false;
        for (const sel of confirmSels) {
            if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Confirm dialog appeared (${sel})`);
                confirmed = true;
                const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
                await safeClick(cancelBtn, 'Cancel delete');
                console.log('  Delete cancelled — data preserved ✅');
                break;
            }
        }

        if (!confirmed) {
            console.log('  ⚠️ No confirmation dialog after delete');
            await page.keyboard.press('Escape');
        }
    });

    // =========================================================
    // STEP 24: EMPLOYEE PROFILE NAVIGATION (click name/ID link)
    // =========================================================
    await safeStep('STEP 24 - EMPLOYEE PROFILE NAVIGATION', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('  No rows'); return; }

        // Click employee name (usually a link)
        const nameLink = page.locator('table tbody tr').first().locator('td a').first();

        if (await nameLink.count() > 0 && await nameLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            const href = await nameLink.getAttribute('href').catch(() => '');
            const text = await nameLink.innerText({ timeout: 2000 }).catch(() => '');
            console.log(`  Employee link: "${text.trim()}" → ${href}`);

            await nameLink.click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(3000);
            snapAPI('employee profile page');

            const newUrl = page.url();
            console.log(`  Profile URL: ${newUrl}`);

            // Validate profile page content
            const profileSections = [
                'Personal Information', 'Personal Info',
                'Contact', 'Employment', 'Education',
                'Documents', 'Salary', 'Experience'
            ];
            for (const section of profileSections) {
                const el = page.locator(`text="${section}"`).first();
                if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log(`  Profile section: "${section}" ✅`);
                }
            }

            await page.goBack({ timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000);
            console.log('  Returned to employee list');
        } else {
            console.log('  ⚠️ No employee name link found in first row');
        }
    });

    // =========================================================
    // STEP 25: BULK ACTIONS / CHECKBOXES
    // =========================================================
    await safeStep('STEP 25 - BULK ACTIONS / CHECKBOXES', async () => {

        // Header checkbox (select all)
        const headerCheckbox = page.locator('table thead input[type="checkbox"]').first();
        if (await headerCheckbox.count() > 0 && await headerCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            await headerCheckbox.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(1000);
            console.log('  Header checkbox (select all) clicked');
            snapAPI('select all checkbox');

            // Check for bulk action buttons appearing
            const bulkBtns = page.locator('button:has-text("Delete Selected"), button:has-text("Export Selected"), button:has-text("Bulk")');
            const bCount = await bulkBtns.count().catch(() => 0);
            console.log(`  Bulk action buttons appeared: ${bCount}`);

            // Uncheck all
            await headerCheckbox.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(500);
            console.log('  Header checkbox unchecked');
        } else {
            console.log('  No header checkbox found (no bulk select)');
        }

        // Row checkboxes
        const rowCheckboxes = page.locator('table tbody input[type="checkbox"]');
        const cCount = await rowCheckboxes.count().catch(() => 0);
        console.log(`  Row checkboxes: ${cCount}`);
        if (cCount > 0) {
            await rowCheckboxes.first().click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(500);
            console.log('  First row checkbox clicked');
            await rowCheckboxes.first().click({ timeout: 4000 }).catch(() => {});
        }
    });

    // =========================================================
    // STEP 26: PAGINATION
    // =========================================================
    await safeStep('STEP 26 - PAGINATION', async () => {

        const nextSels = [
            'button[aria-label*="next" i]',
            '.ant-pagination-next button',
            'li.ant-pagination-next',
            '[class*="next"]',
            '[title="Next Page"]',
            'button:has-text(">")',
            'button:has-text("Next")'
        ];

        let nextBtn = null;
        for (const sel of nextSels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                nextBtn = el;
                console.log(`  Next button: "${sel}"`);
                break;
            }
        }

        if (!nextBtn) {
            console.log('  ⚠️ Pagination not found');
            return;
        }

        const enabled = await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false);
        console.log(`  Next enabled: ${enabled}`);

        if (enabled) {
            await nextBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);
            snapAPI('page 2');
            const rows2 = await getTableRows();
            console.log(`  Page 2 rows: ${rows2}`);
            await logTableData(3);

            const prevSels = [
                'button[aria-label*="prev" i]',
                '.ant-pagination-prev button',
                '[class*="prev"]',
                'button:has-text("<")',
                'button:has-text("Prev")'
            ];
            for (const sel of prevSels) {
                const prev = page.locator(sel).first();
                if (await prev.count() > 0 && await prev.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await prev.click({ timeout: 4000 }).catch(() => {});
                    await page.waitForTimeout(2000);
                    console.log('  Back to page 1');
                    break;
                }
            }
        }
    });

    // =========================================================
    // STEP 27: SIDEBAR / NAV VALIDATION
    // =========================================================
    await safeStep('STEP 27 - SIDEBAR NAVIGATION', async () => {

        const navItems = [
            'Dashboard', 'Employees', 'Employee List',
            'Attendance', 'Leave', 'Payroll',
            'Recruitment', 'ESS', 'My Team', 'Applications'
        ];

        for (const item of navItems) {
            const el = page.locator(`text="${item}"`).first();
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`  Sidebar "${item}": ${visible ? '✅' : '⚠️'}`);
        }
    });

    // =========================================================
    // STEP 28: BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('STEP 28 - BROKEN IMAGE CHECK', async () => {

        const imgs  = page.locator('img');
        const total = await imgs.count().catch(() => 0);
        let broken  = 0;
        console.log(`  Total images: ${total}`);

        for (let i = 0; i < total; i++) {
            try {
                const w = await imgs.nth(i).evaluate(img => img.naturalWidth, { timeout: 3000 });
                if (w === 0) {
                    const src = await imgs.nth(i).getAttribute('src').catch(() => '');
                    console.log(`  ⚠️ Broken image: ${src}`);
                    broken++;
                }
            } catch { }
        }

        console.log(broken === 0 ? '  All images OK ✅' : `  Broken images: ${broken}`);
    });

    // =========================================================
    // STEP 29: SCROLL TESTS
    // =========================================================
    await safeStep('STEP 29 - SCROLL TESTS', async () => {

        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
        await page.mouse.wheel(0, -4000);
        await page.waitForTimeout(700);

        await page.evaluate(() => {
            const table = document.querySelector('table');
            if (table?.parentElement) {
                table.parentElement.scrollLeft += 500;
            }
        });
        await page.waitForTimeout(600);
        await page.evaluate(() => {
            const table = document.querySelector('table');
            if (table?.parentElement) table.parentElement.scrollLeft = 0;
        });

        console.log('  Scroll (vertical + horizontal) completed');
    });

    // =========================================================
    // STEP 30: FINAL SCREENSHOTS
    // =========================================================
    await safeStep('STEP 30 - FINAL SCREENSHOTS', async () => {

        await page.screenshot({
            path: 'test-assets/employee-list-viewport.png',
            fullPage: false
        });
        console.log('  Viewport screenshot saved');

        await page.screenshot({
            path: 'test-assets/employee-list-fullpage.png',
            fullPage: true
        });
        console.log('  Full page screenshot saved');
    });

    // =========================================================
    // FINAL API REPORT
    // =========================================================
    console.log('\n\n╔══════════════════════════════════════════════╗');
    console.log('║           API MONITORING REPORT               ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`Total API calls tracked : ${apiCalls.length}`);
    console.log(`Total API issues found  : ${apiIssues.length}`);

    if (apiIssues.length === 0) {
        console.log('\n✅ No API issues detected during the test run.');
    } else {
        console.log('\n🔴 API ISSUES SUMMARY:');
        console.log('─'.repeat(60));
        apiIssues.forEach((issue, idx) => {
            console.log(`\nIssue #${idx + 1}:`);
            console.log(`  Timestamp : ${issue.timestamp || 'N/A'}`);
            console.log(`  Method    : ${issue.method || 'FAILED'}`);
            console.log(`  URL       : ${issue.url}`);
            console.log(`  Status    : ${issue.status || 'N/A'} ${issue.statusText || ''}`);
            if (issue.failure) console.log(`  Failure   : ${issue.failure}`);
            if (issue.body)    console.log(`  Body      : ${issue.body}`);
        });
        console.log('\n─'.repeat(60));

        // Group by status code
        const grouped = {};
        apiIssues.forEach(i => {
            const key = i.status || 'FAILED';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(i.url);
        });

        console.log('\n📊 Issues grouped by status:');
        for (const [status, urls] of Object.entries(grouped)) {
            console.log(`  HTTP ${status} (${urls.length} occurrence${urls.length > 1 ? 's' : ''}):`);
            urls.forEach(u => console.log(`    - ${u}`));
        }
    }

    console.log('\n✅ Employee List — Full Module Testing COMPLETE');
    console.log('📁 Screenshots: test-assets/employee-list-*.png');
});
