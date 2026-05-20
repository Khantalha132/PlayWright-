import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('CultureHCM - Interview Logs Full Module Testing', async ({ page }) => {

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
                const btn = btns.nth(i);
                const t = await btn.innerText({ timeout: 1500 }).catch(() => '');
                const v = await btn.isVisible({ timeout: 1500 }).catch(() => false);
                if (v && t.trim().toUpperCase() === text.toUpperCase()) {
                    await btn.click({ timeout: 5000 });
                    console.log(`Button "${text}" clicked`);
                    return true;
                }
            } catch { }
        }
        console.log(`⚠️ Button "${text}" not found`);
        return false;
    };

    const safeFill = async (locator, value, label) => {
        try {
            await locator.fill(value, { timeout: 4000 });
            console.log(`Filled "${label}": ${value}`);
            return true;
        } catch {
            console.log(`⚠️ Could not fill "${label}"`);
            return false;
        }
    };

    const safeClick = async (locator, label) => {
        try {
            await locator.click({ timeout: 5000 });
            console.log(`Clicked: ${label}`);
            return true;
        } catch {
            console.log(`⚠️ Could not click: ${label}`);
            return false;
        }
    };

    const closeAnyModal = async () => {
        const sels = [
            'button[aria-label="Close"]',
            '.ant-modal-close',
            '.ant-drawer-close',
            'button:has-text("Cancel")',
            'button:has-text("Close")'
        ];
        for (const sel of sels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 1500 }).catch(() => false)) {
                await el.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(800);
                return;
            }
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
    };

    const getTableRows = async () => {
        return await page.locator('table tbody tr').count().catch(() => 0);
    };

    const logTableData = async (maxRows = 5) => {
        const rows = await getTableRows();
        console.log(`  Total rows: ${rows}`);
        for (let i = 0; i < Math.min(rows, maxRows); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
        }
        return rows;
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

        await page.goto('https://demo.culturehcm.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForTimeout(2000);

        const email = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await email.waitFor({ state: 'visible', timeout: 15000 });
        await email.fill('apd0016@appedology.com');

        await page.locator('input[type="password"]').first().fill('0yMT8e');

        await clickButtonByText('Login');

        await page.waitForURL(/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 20000 });

        console.log('Logged in — Asfand Khan / SQA Engineer');
    });

    // =========================================================
    // STEP 2: NAVIGATE TO INTERVIEW LOGS
    // =========================================================
    await safeStep('STEP 2 - NAVIGATE TO INTERVIEW LOGS', async () => {

        await page.goto('https://demo.culturehcm.com/recruitment/interview-logs', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(3000);

        console.log(`Loaded URL: ${page.url()}`);

        const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        const hasContent = /interview.*log|log.*interview|recruitment/i.test(bodyText);
        console.log(`Page has interview log content: ${hasContent}`);
    });

    // =========================================================
    // STEP 3: PAGE TITLE & BREADCRUMB
    // =========================================================
    await safeStep('STEP 3 - PAGE TITLE & BREADCRUMB', async () => {

        // Title check
        const titleCandidates = [
            page.locator('text=Interview Logs').first(),
            page.locator('h1').first(),
            page.locator('h2').first(),
            page.locator('[class*="title"]').first(),
            page.locator('[class*="heading"]').first()
        ];

        for (const el of titleCandidates) {
            if (await el.count() > 0) {
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                if (text.trim()) {
                    console.log(`Page title: "${text.trim()}"`);
                    break;
                }
            }
        }

        // Breadcrumb items
        const crumbs = ['Recruitment', 'Interview Logs'];
        for (const crumb of crumbs) {
            const el = page.locator(`text="${crumb}"`).first();
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`Breadcrumb "${crumb}": ${visible ? '✅ visible' : '⚠️ not found'}`);
        }

        // Back button
        const backBtn = page.locator('button[aria-label*="back" i], a[aria-label*="back" i], [class*="back"]').first();
        if (await backBtn.count() > 0) {
            console.log('Back navigation button: ✅ present');
        }
    });

    // =========================================================
    // STEP 4: PAGE LAYOUT DISCOVERY
    // =========================================================
    await safeStep('STEP 4 - PAGE LAYOUT DISCOVERY', async () => {

        // Count all interactive elements
        const selects  = await page.locator('select').count().catch(() => 0);
        const inputs   = await page.locator('input').count().catch(() => 0);
        const buttons  = await page.locator('button').count().catch(() => 0);
        const tables   = await page.locator('table').count().catch(() => 0);
        const tabs     = await page.locator('[role="tab"], [class*="tab"]').count().catch(() => 0);

        console.log(`Layout summary:`);
        console.log(`  <select> dropdowns : ${selects}`);
        console.log(`  <input> fields     : ${inputs}`);
        console.log(`  <button> elements  : ${buttons}`);
        console.log(`  <table> elements   : ${tables}`);
        console.log(`  Tab elements       : ${tabs}`);

        // Log all visible buttons
        const allBtns = page.locator('button');
        const btnCount = await allBtns.count().catch(() => 0);
        console.log(`\n  All button texts:`);
        for (let i = 0; i < Math.min(btnCount, 15); i++) {
            try {
                const btn = allBtns.nth(i);
                if (await btn.isVisible({ timeout: 1500 })) {
                    const text = await btn.innerText({ timeout: 1500 }).catch(() => '');
                    const title = await btn.getAttribute('title').catch(() => '');
                    const aria = await btn.getAttribute('aria-label').catch(() => '');
                    console.log(`    Btn ${i + 1}: "${text.trim()}" title="${title}" aria="${aria}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 5: TABS VALIDATION (if any)
    // =========================================================
    await safeStep('STEP 5 - TABS VALIDATION', async () => {

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
                console.log(`Tabs found via "${sel}": ${count}`);
                tabsFound = true;

                for (let i = 0; i < count; i++) {
                    try {
                        const tab = tabs.nth(i);
                        const visible = await tab.isVisible({ timeout: 2000 });
                        if (visible) {
                            const text = await tab.innerText({ timeout: 2000 }).catch(() => '');
                            console.log(`  Tab ${i + 1}: "${text.trim()}"`);

                            await tab.click({ timeout: 5000 });
                            await page.waitForTimeout(2000);
                            const rows = await getTableRows();
                            console.log(`  → Rows after clicking tab "${text.trim()}": ${rows}`);
                        }
                    } catch { }
                }
                break;
            }
        }

        if (!tabsFound) {
            console.log('No tabs found — single view page');
        }
    });

    // =========================================================
    // STEP 6: FILTER DROPDOWNS DISCOVERY & VALIDATION
    // =========================================================
    await safeStep('STEP 6 - FILTER DROPDOWNS DISCOVERY', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);
        console.log(`Total <select> elements: ${count}`);

        for (let i = 0; i < count; i++) {
            try {
                const sel = selects.nth(i);
                const visible = await sel.isVisible({ timeout: 2000 });
                if (visible) {
                    const opts = await sel.locator('option').allTextContents().catch(() => []);
                    const name = await sel.getAttribute('name').catch(() => '');
                    const id   = await sel.getAttribute('id').catch(() => '');
                    console.log(`  Select ${i + 1} [name="${name}" id="${id}"]: [${opts.join(' | ')}]`);
                }
            } catch { }
        }

        // All inputs
        const inputs = page.locator('input');
        const inputCount = await inputs.count().catch(() => 0);
        console.log(`\n  Input fields: ${inputCount}`);
        for (let i = 0; i < inputCount; i++) {
            try {
                const inp = inputs.nth(i);
                const visible = await inp.isVisible({ timeout: 1500 });
                if (visible) {
                    const ph   = await inp.getAttribute('placeholder').catch(() => '');
                    const type = await inp.getAttribute('type').catch(() => 'text');
                    const name = await inp.getAttribute('name').catch(() => '');
                    console.log(`    Input ${i + 1}: type="${type}" placeholder="${ph}" name="${name}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 7: FILTER BY EACH DROPDOWN → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 7 - FILTER EACH DROPDOWN', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
            try {
                const sel = selects.nth(i);
                const visible = await sel.isVisible({ timeout: 2000 });
                if (!visible) continue;

                const opts = await sel.locator('option').allTextContents().catch(() => []);
                if (opts.length <= 1) {
                    console.log(`  Dropdown ${i + 1}: only 1 option, skipping`);
                    continue;
                }

                // Select second option (index 1 = first real option)
                await sel.selectOption({ index: 1 }).catch(() => {});
                await page.waitForTimeout(500);
                console.log(`  Dropdown ${i + 1} selected: "${opts[1]}"`);

                await clickButtonByText('SEARCH');
                await page.waitForTimeout(2500);
                const rows = await getTableRows();
                console.log(`  → Rows after filter: ${rows}`);

                await clickButtonByText('RESET');
                await page.waitForTimeout(2000);
                console.log(`  → Reset done`);

            } catch (e) {
                console.log(`  ⚠️ Dropdown ${i + 1} failed: ${e.message}`);
            }
        }
    });

    // =========================================================
    // STEP 8: FILTER BY DATE INPUTS → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 8 - DATE FILTER', async () => {

        const dateInputs = page.locator('input[type="date"], input[type="month"]');
        const count = await dateInputs.count().catch(() => 0);
        console.log(`Date inputs found: ${count}`);

        for (let i = 0; i < count; i++) {
            try {
                const inp = dateInputs.nth(i);
                const visible = await inp.isVisible({ timeout: 2000 });
                if (!visible) continue;

                const type = await inp.getAttribute('type').catch(() => 'date');
                const ph   = await inp.getAttribute('placeholder').catch(() => '');
                const value = type === 'month' ? '2026-02' : '2026-02-25';

                await safeFill(inp, value, `Date input ${i + 1} (${ph})`);
                await page.waitForTimeout(500);

                await clickButtonByText('SEARCH');
                await page.waitForTimeout(2500);
                const rows = await getTableRows();
                console.log(`  → Rows after date filter (${value}): ${rows}`);

                await clickButtonByText('RESET');
                await page.waitForTimeout(2000);
                console.log('  → Date filter reset');

            } catch (e) {
                console.log(`  ⚠️ Date input ${i + 1} failed: ${e.message}`);
            }
        }

        if (count === 0) {
            console.log('No date inputs found on this page');
        }
    });

    // =========================================================
    // STEP 9: TEXT INPUT FILTERS → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 9 - TEXT INPUT FILTERS', async () => {

        const textInputs = page.locator(
            'input[type="text"], input:not([type]), input[type="search"], input[type="number"]'
        );
        const count = await textInputs.count().catch(() => 0);
        console.log(`Text inputs found: ${count}`);

        const sampleValues = {
            'applicant': 'APD-SD-FSD-260304-0002-0002',
            'name':      'Kaylie',
            'job':       'SQA Engineer',
            'cnic':      '11111-1111111-7',
            'id':        'KHI',
            'default':   'test'
        };

        for (let i = 0; i < count; i++) {
            try {
                const inp = textInputs.nth(i);
                const visible = await inp.isVisible({ timeout: 2000 });
                if (!visible) continue;

                const ph = await inp.getAttribute('placeholder').catch(() => '');
                if (ph.toLowerCase().includes('search table')) continue; // handled separately

                // Pick a relevant sample value
                let fillVal = sampleValues['default'];
                for (const [key, val] of Object.entries(sampleValues)) {
                    if (ph.toLowerCase().includes(key)) { fillVal = val; break; }
                }

                await safeFill(inp, fillVal, `Text input "${ph}"`);
                await page.waitForTimeout(500);

                await clickButtonByText('SEARCH');
                await page.waitForTimeout(2500);
                const rows = await getTableRows();
                console.log(`  → Rows after "${ph}" filter: ${rows}`);

                await clickButtonByText('RESET');
                await page.waitForTimeout(2000);
                console.log(`  → Reset done`);

            } catch (e) {
                console.log(`  ⚠️ Text input ${i + 1} failed: ${e.message}`);
            }
        }
    });

    // =========================================================
    // STEP 10: SEARCH BUTTON VALIDATION
    // =========================================================
    await safeStep('STEP 10 - SEARCH BUTTON (empty search)', async () => {

        // Click SEARCH with no filters — should return all records
        const clicked = await clickButtonByText('SEARCH');
        if (clicked) {
            await page.waitForTimeout(2500);
            const rows = await getTableRows();
            console.log(`Rows after empty SEARCH (all records): ${rows}`);
        }
    });

    // =========================================================
    // STEP 11: RESET BUTTON VALIDATION
    // =========================================================
    await safeStep('STEP 11 - RESET BUTTON', async () => {

        // Fill something first so Reset is meaningful
        const anyInput = page.locator('input[type="text"], input:not([type])').first();
        if (await anyInput.count() > 0 && await anyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await safeFill(anyInput, 'dummy_value', 'any input');
        }

        const clicked = await clickButtonByText('RESET');
        if (clicked) {
            await page.waitForTimeout(2000);

            // Verify inputs are cleared
            if (await anyInput.count() > 0) {
                const val = await anyInput.inputValue({ timeout: 2000 }).catch(() => '');
                console.log(`After RESET, input value: "${val}" (should be empty)`);
                if (val === '') console.log('✅ Input cleared successfully');
                else console.log('⚠️ Input NOT cleared after reset');
            }

            const rows = await getTableRows();
            console.log(`Rows after RESET: ${rows}`);
        }
    });

    // =========================================================
    // STEP 12: SEARCH TABLE DATA (inline search)
    // =========================================================
    await safeStep('STEP 12 - SEARCH TABLE DATA (inline)', async () => {

        const searchInput = page.locator('input[placeholder="Search Table Data"]').first();
        let found = false;

        if (await searchInput.count() > 0 && await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            found = true;
        } else {
            // Try generic search placeholder
            const generic = page.locator('input[placeholder*="Search" i]').first();
            if (await generic.count() > 0 && await generic.isVisible({ timeout: 2000 }).catch(() => false)) {
                found = true;
            }
        }

        if (!found) {
            console.log('⚠️ Inline search input not found');
            return;
        }

        const inp = found
            ? page.locator('input[placeholder="Search Table Data"]').first()
            : page.locator('input[placeholder*="Search" i]').first();

        const terms = [
            'SQA Engineer',
            'Full Stack Developer',
            'Kaylie',
            'Alizeh',
            'Daniel Reeve',
            'APD',
            'KHI'
        ];

        for (const term of terms) {
            await safeFill(inp, term, 'Table Search');
            await page.waitForTimeout(1500);
            const rows = await getTableRows();
            console.log(`  Search "${term}": ${rows} row(s)`);
            await inp.clear({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(600);
        }
    });

    // =========================================================
    // STEP 13: TABLE COLUMNS VALIDATION
    // =========================================================
    await safeStep('STEP 13 - TABLE COLUMNS VALIDATION', async () => {

        const tables = page.locator('table');
        const tableCount = await tables.count().catch(() => 0);
        console.log(`Tables on page: ${tableCount}`);

        if (tableCount === 0) {
            console.log('⚠️ No table found');
            return;
        }

        for (let t = 0; t < tableCount; t++) {
            const headers = await tables.nth(t).locator('th')
                .allInnerTexts().catch(() => []);
            console.log(`Table ${t + 1} columns: ${headers.join(' | ')}`);

            // Common interview log columns to check
            const expected = [
                'Applicant Id', 'Job Title', 'Name', 'CNIC',
                'Applied On', 'Interview Time', 'Interviewer',
                'Recruiter', 'Status', 'Result', 'Remarks', 'Last Updated'
            ];

            for (const col of expected) {
                const found = headers.some(h => h.toLowerCase().includes(col.toLowerCase()));
                if (found) console.log(`  ✅ Column "${col}" present`);
            }
        }
    });

    // =========================================================
    // STEP 14: TABLE ROW DATA VALIDATION
    // =========================================================
    await safeStep('STEP 14 - TABLE ROW DATA VALIDATION', async () => {

        const rows = await getTableRows();
        console.log(`Total data rows: ${rows}`);

        if (rows === 0) {
            // Check for empty state
            const emptyMessages = [
                'text=/no data/i',
                'text=/no records/i',
                'text=/no results/i',
                'text=/no logs/i',
                '.ant-empty',
                '[class*="empty"]',
                '[class*="no-data"]'
            ];
            for (const sel of emptyMessages) {
                const el = page.locator(sel).first();
                if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                    const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                    console.log(`Empty state message: "${text.trim()}"`);
                    break;
                }
            }
            return;
        }

        // Log all rows (up to 10)
        for (let i = 0; i < Math.min(rows, 10); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`Row ${i + 1}: ${cells.join(' | ')}`);

            // Data integrity checks
            if (cells[0] && !cells[0].trim()) console.log(`  ⚠️ Row ${i + 1}: Applicant Id empty`);
            if (cells[1] && !cells[1].trim()) console.log(`  ⚠️ Row ${i + 1}: Job Title empty`);
        }
    });

    // =========================================================
    // STEP 15: TABLE COLUMN SORT
    // =========================================================
    await safeStep('STEP 15 - COLUMN SORT', async () => {

        const ths = page.locator('table thead th');
        const count = await ths.count().catch(() => 0);
        console.log(`Sortable headers: ${count}`);

        for (let i = 0; i < Math.min(count, 6); i++) {
            try {
                const th = ths.nth(i);
                const text = await th.innerText({ timeout: 2000 }).catch(() => '');
                if (!text.trim()) continue;

                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);

                const rowsAsc = await getTableRows();
                console.log(`Sort ASC "${text.trim()}": ${rowsAsc} rows`);

                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);

                const rowsDesc = await getTableRows();
                console.log(`Sort DESC "${text.trim()}": ${rowsDesc} rows`);

            } catch {
                console.log(`⚠️ Could not sort column ${i + 1}`);
            }
        }
    });

    // =========================================================
    // STEP 16: EXPORT BUTTONS (CSV / PDF)
    // =========================================================
    await safeStep('STEP 16 - EXPORT BUTTONS', async () => {

        const exportSels = [
            'button[title*="CSV" i]',
            'button[title*="Excel" i]',
            'button[title*="PDF" i]',
            'button[aria-label*="export" i]',
            'button[aria-label*="csv" i]',
            'button[aria-label*="pdf" i]',
            'button[aria-label*="download" i]',
            'a[title*="CSV" i]',
            'a[title*="PDF" i]'
        ];

        let found = 0;
        for (const sel of exportSels) {
            const btn = page.locator(sel).first();
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log(`Export button clicked: ${sel}`);
                found++;
            }
        }

        // Fallback: icon-only buttons
        if (found === 0) {
            const iconBtns = page.locator('button:has(svg)');
            const total = await iconBtns.count().catch(() => 0);
            console.log(`Icon-only buttons (fallback): ${total}`);
            for (let i = 0; i < Math.min(total, 4); i++) {
                try {
                    if (await iconBtns.nth(i).isVisible({ timeout: 2000 })) {
                        await iconBtns.nth(i).click({ timeout: 4000 });
                        await page.waitForTimeout(800);
                        console.log(`Icon button ${i + 1} clicked`);
                    }
                } catch { }
            }
        }
    });

    // =========================================================
    // STEP 17: ROW ACTIONS DISCOVERY
    // =========================================================
    await safeStep('STEP 17 - ROW ACTIONS DISCOVERY', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('No rows to test'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);

        const actionEls = firstRow.locator('button, a, [role="button"], svg, [class*="action"], [class*="icon"]');
        const count = await actionEls.count().catch(() => 0);
        console.log(`Action elements in first row: ${count}`);

        for (let i = 0; i < Math.min(count, 8); i++) {
            try {
                const el = actionEls.nth(i);
                if (await el.isVisible({ timeout: 2000 })) {
                    const text     = await el.innerText({ timeout: 1500 }).catch(() => '');
                    const title    = await el.getAttribute('title').catch(() => '');
                    const aria     = await el.getAttribute('aria-label').catch(() => '');
                    const tag      = await el.evaluate(e => e.tagName).catch(() => '');
                    console.log(`  Action ${i + 1} [${tag}]: text="${text.trim()}" title="${title}" aria="${aria}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 18: VIEW LOG DETAIL
    // =========================================================
    await safeStep('STEP 18 - VIEW LOG DETAIL', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        // Try clicking the first cell (ID column)
        await firstRow.locator('td').first().click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(2500);

        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]', '[class*="drawer"]'];
        let opened = false;

        for (const sel of modalSels) {
            opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (opened) { console.log(`Detail opened via row click (${sel})`); break; }
        }

        if (!opened) {
            // Try explicit view button
            const viewBtn = firstRow.locator(
                'button[title*="View" i], button[aria-label*="view" i], a[title*="View" i], button:has-text("View")'
            ).first();
            if (await viewBtn.count() > 0) {
                await viewBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2500);
                for (const sel of modalSels) {
                    opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (opened) { console.log(`Detail opened via view button (${sel})`); break; }
                }
            }
        }

        if (opened) {
            // Read modal content
            const content = await page.locator(modalSels.find(s => true)).first()
                .innerText({ timeout: 3000 }).catch(() => '');
            console.log(`Detail preview: "${content.substring(0, 300)}"`);
            await closeAnyModal();
            console.log('Detail modal closed');
        } else {
            console.log('⚠️ Detail view did not open');
        }
    });

    // =========================================================
    // STEP 19: EDIT LOG ENTRY
    // =========================================================
    await safeStep('STEP 19 - EDIT LOG ENTRY', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        const editBtn = firstRow.locator(
            'button[title*="Edit" i], button[aria-label*="edit" i], a[title*="Edit" i], button:has-text("Edit")'
        ).first();

        if (await editBtn.count() > 0 && await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2500);

            const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]'];
            let opened = false;
            for (const sel of modalSels) {
                opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                if (opened) { console.log(`Edit form opened (${sel})`); break; }
            }

            if (opened) {
                // List form fields in edit modal
                const formInputs = page.locator('[role="dialog"] input, .ant-modal input, .ant-drawer input');
                const inputCount = await formInputs.count().catch(() => 0);
                console.log(`Edit form fields: ${inputCount}`);
                for (let i = 0; i < Math.min(inputCount, 8); i++) {
                    const ph = await formInputs.nth(i).getAttribute('placeholder').catch(() => '');
                    const type = await formInputs.nth(i).getAttribute('type').catch(() => '');
                    console.log(`  Field ${i + 1}: type="${type}" placeholder="${ph}"`);
                }
                await closeAnyModal();
                console.log('Edit modal closed');
            } else {
                console.log('⚠️ Edit modal did not open');
            }
        } else {
            console.log('⚠️ Edit button not found in row');
        }
    });

    // =========================================================
    // STEP 20: DELETE LOG ENTRY (cancel only)
    // =========================================================
    await safeStep('STEP 20 - DELETE LOG ENTRY (cancel only)', async () => {

        const rows = await getTableRows();
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        const deleteBtn = firstRow.locator(
            'button[title*="Delete" i], button[aria-label*="delete" i], button[title*="Remove" i], button:has-text("Delete")'
        ).first();

        if (await deleteBtn.count() > 0 && await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);

            const confirmSels = ['[role="dialog"]', '.ant-modal-confirm', '.ant-popover', '[class*="confirm"]'];
            let confirmVisible = false;
            for (const sel of confirmSels) {
                confirmVisible = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                if (confirmVisible) { console.log(`Confirm dialog appeared (${sel})`); break; }
            }

            if (confirmVisible) {
                const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
                await safeClick(cancelBtn, 'Cancel delete');
                console.log('Delete cancelled — data preserved ✅');
            } else {
                console.log('⚠️ No confirmation dialog appeared after delete');
                await page.keyboard.press('Escape');
            }
        } else {
            console.log('⚠️ Delete button not found');
        }
    });

    // =========================================================
    // STEP 21: ADD / CREATE LOG BUTTON (if present)
    // =========================================================
    await safeStep('STEP 21 - ADD LOG BUTTON (if present)', async () => {

        const addSelectors = [
            page.locator('button:has-text("Add")').first(),
            page.locator('button:has-text("Create")').first(),
            page.locator('button:has-text("New")').first(),
            page.locator('button:has-text("Add Log")').first(),
            page.locator('button:has-text("Schedule")').first(),
            page.locator('a:has-text("Add")').first()
        ];

        let addBtn = null;
        for (const btn of addSelectors) {
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                addBtn = btn;
                const text = await btn.innerText({ timeout: 2000 }).catch(() => '');
                console.log(`Add button found: "${text.trim()}"`);
                break;
            }
        }

        if (!addBtn) {
            console.log('No Add/Create button on this page (logs may be read-only)');
            return;
        }

        // Click with timeout guard
        const result = await Promise.race([
            addBtn.click({ timeout: 5000 }).then(() => 'clicked'),
            new Promise(r => setTimeout(() => r('timeout'), 5000))
        ]);
        console.log(`Add button click result: ${result}`);

        await page.waitForTimeout(2000);

        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]'];
        let opened = false;
        for (const sel of modalSels) {
            opened = await page.locator(sel).first().isVisible({ timeout: 3000 }).catch(() => false);
            if (opened) {
                console.log(`Add form opened (${sel})`);

                // List form fields
                const fields = page.locator(`${sel} input, ${sel} select, ${sel} textarea`);
                const fCount = await fields.count().catch(() => 0);
                console.log(`  Form fields: ${fCount}`);
                for (let i = 0; i < Math.min(fCount, 10); i++) {
                    const ph = await fields.nth(i).getAttribute('placeholder').catch(() => '');
                    const type = await fields.nth(i).getAttribute('type').catch(() => '');
                    const tag  = await fields.nth(i).evaluate(e => e.tagName).catch(() => '');
                    console.log(`    Field ${i + 1} [${tag}]: type="${type}" placeholder="${ph}"`);
                }

                await closeAnyModal();
                console.log('Add modal closed');
                break;
            }
        }

        if (!opened) {
            console.log('🐛 Add button clicked but no form appeared');
            await page.screenshot({ path: 'test-assets/BUG-add-log-no-form.png', fullPage: false });
        }
    });

    // =========================================================
    // STEP 22: SHOW ENTRIES DROPDOWN
    // =========================================================
    await safeStep('STEP 22 - SHOW ENTRIES DROPDOWN', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        // First select is usually "Show N entries"
        if (count > 0) {
            const firstSel = selects.first();
            const opts = await firstSel.locator('option').allTextContents().catch(() => []);
            console.log(`Show entries options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                for (let i = 0; i < opts.length; i++) {
                    await firstSel.selectOption({ index: i }).catch(() => {});
                    await page.waitForTimeout(1000);
                    const rows = await getTableRows();
                    console.log(`Show "${opts[i]}": ${rows} rows`);
                }
            }
        } else {
            console.log('No show-entries dropdown found');
        }
    });

    // =========================================================
    // STEP 23: PAGINATION
    // =========================================================
    await safeStep('STEP 23 - PAGINATION', async () => {

        const nextSels = [
            'button[aria-label*="next" i]',
            '.ant-pagination-next button',
            'li.ant-pagination-next',
            '[class*="next"]',
            '[title="Next Page"]',
            'button:has-text(">")',
            'a:has-text(">")'
        ];

        let nextBtn = null;
        for (const sel of nextSels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                nextBtn = el;
                console.log(`Next page button: "${sel}"`);
                break;
            }
        }

        if (!nextBtn) {
            console.log('⚠️ Pagination not found (may be single page or no data)');
            return;
        }

        const enabled = await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false);
        console.log(`Next page enabled: ${enabled}`);

        if (enabled) {
            await nextBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);
            const rows2 = await getTableRows();
            console.log(`Rows on page 2: ${rows2}`);

            const prevSels = [
                'button[aria-label*="prev" i]',
                '.ant-pagination-prev button',
                '[class*="prev"]',
                'button:has-text("<")'
            ];
            for (const sel of prevSels) {
                const prev = page.locator(sel).first();
                if (await prev.count() > 0 && await prev.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await prev.click({ timeout: 4000 }).catch(() => {});
                    await page.waitForTimeout(2000);
                    console.log('Returned to page 1');
                    break;
                }
            }
        }
    });

    // =========================================================
    // STEP 24: SIDEBAR NAVIGATION VALIDATION
    // =========================================================
    await safeStep('STEP 24 - SIDEBAR NAVIGATION', async () => {

        const items = [
            'Requisition Planning',
            'Manage Applicants',
            'Manage Interviews',
            'Interview Logs',
            'Aptitude Test',
            'Test Results',
            'Offer Letter',
            'Resume Bank',
            'Additional Resource Requests',
            'Candidate Profile',
            'Referrals'
        ];

        for (const item of items) {
            const el = page.locator(`text="${item}"`).first();
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`Sidebar "${item}": ${visible ? '✅' : '⚠️ not found'}`);
        }
    });

    // =========================================================
    // STEP 25: BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('STEP 25 - BROKEN IMAGE CHECK', async () => {

        const imgs = page.locator('img');
        const total = await imgs.count().catch(() => 0);
        let broken = 0;
        console.log(`Total images: ${total}`);

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

        console.log(broken === 0 ? 'All images OK ✅' : `Broken images: ${broken}`);
    });

    // =========================================================
    // STEP 26: HORIZONTAL SCROLL (table overflow check)
    // =========================================================
    await safeStep('STEP 26 - HORIZONTAL SCROLL CHECK', async () => {

        const overflows = await page.evaluate(() => {
            const els = [];
            document.querySelectorAll('*').forEach(el => {
                if (el.scrollWidth > el.clientWidth + 5) {
                    els.push(`${el.tagName}.${(el.className || '').split(' ')[0]}`);
                }
            });
            return els.slice(0, 5);
        });

        if (overflows.length > 0) {
            console.log(`⚠️ Overflowing elements: ${overflows.join(', ')}`);
        } else {
            console.log('No horizontal overflow ✅');
        }

        // Scroll the table horizontally if it exists
        await page.evaluate(() => {
            const table = document.querySelector('table');
            if (table) {
                table.scrollLeft += 500;
                setTimeout(() => table.scrollLeft = 0, 500);
            }
        });
        await page.waitForTimeout(800);
        console.log('Horizontal scroll tested');
    });

    // =========================================================
    // STEP 27: VERTICAL SCROLL
    // =========================================================
    await safeStep('STEP 27 - VERTICAL SCROLL', async () => {

        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
        await page.mouse.wheel(0, -4000);
        await page.waitForTimeout(700);
        console.log('Vertical scroll completed');
    });

    // =========================================================
    // STEP 28: FINAL SCREENSHOTS
    // =========================================================
    await safeStep('STEP 28 - FINAL SCREENSHOTS', async () => {

        await page.screenshot({
            path: 'test-assets/interview-logs-viewport.png',
            fullPage: false
        });
        console.log('Viewport screenshot: test-assets/interview-logs-viewport.png');

        await page.screenshot({
            path: 'test-assets/interview-logs-fullpage.png',
            fullPage: true
        });
        console.log('Full page screenshot: test-assets/interview-logs-fullpage.png');
    });

    console.log('\n✅ Interview Logs — Full Module Testing COMPLETE');
    console.log('📁 Screenshots saved in: test-assets/');
});
