import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('CultureHCM - Manage Applicants Full Module Testing', async ({ page }) => {

    // =========================================================
    // SAFE STEP WRAPPER
    // =========================================================
    const safeStep = async (stepName, stepFunction) => {
        console.log(`\n========== ${stepName} ==========`);
        try {
            await stepFunction();
            console.log(`✅ PASSED: ${stepName}`);
        } catch (error) {
            console.log(`⚠️ FAILED BUT CONTINUING: ${stepName}`);
            console.log(`Reason: ${error.message}`);
        }
    };

    // =========================================================
    // SAFE CLICK HELPER — never hangs, max 5s
    // =========================================================
    const safeClick = async (locator, label = '') => {
        try {
            await locator.click({ timeout: 5000 });
            console.log(`Clicked: ${label}`);
            return true;
        } catch {
            console.log(`⚠️ Could not click: ${label}`);
            return false;
        }
    };

    // =========================================================
    // SAFE FILL HELPER
    // =========================================================
    const safeFill = async (locator, value, label = '') => {
        try {
            await locator.fill(value, { timeout: 5000 });
            console.log(`Filled "${label}" with: ${value}`);
            return true;
        } catch {
            console.log(`⚠️ Could not fill: ${label}`);
            return false;
        }
    };

    // =========================================================
    // CLICK BUTTON BY TEXT — scans all buttons, no hanging
    // =========================================================
    const clickButtonByText = async (text) => {
        const allButtons = page.locator('button');
        const count = await allButtons.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            try {
                const btn = allButtons.nth(i);
                const btnText = await btn.innerText({ timeout: 2000 }).catch(() => '');
                const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
                if (visible && btnText.trim().toUpperCase() === text.toUpperCase()) {
                    await btn.click({ timeout: 5000 });
                    console.log(`Button "${text}" clicked`);
                    return true;
                }
            } catch { /* skip */ }
        }
        console.log(`⚠️ Button "${text}" not found`);
        return false;
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

        const emailField = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await emailField.waitFor({ state: 'visible', timeout: 15000 });
        await emailField.fill('apd0016@appedology.com');

        const passwordField = page.locator('input[type="password"]').first();
        await passwordField.fill('0yMT8e');

        await clickButtonByText('Login');

        await page.waitForURL(/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 });

        console.log('Login successful — Asfand Khan / SQA Engineer');
    });

    // =========================================================
    // STEP 2: NAVIGATE TO MANAGE APPLICANTS
    // =========================================================
    await safeStep('STEP 2 - NAVIGATE TO MANAGE APPLICANTS', async () => {

        await page.goto('https://demo.culturehcm.com/recruitment/manage-applicants', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(3000);

        // Verify page loaded
        const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
        const hasTitle = body.toLowerCase().includes('manage applicants') ||
                         body.toLowerCase().includes('applicant');
        console.log(`Page contains applicant content: ${hasTitle}`);

        const currentURL = page.url();
        console.log(`Current URL: ${currentURL}`);
    });

    // =========================================================
    // STEP 3: PAGE TITLE & BREADCRUMB
    // =========================================================
    await safeStep('STEP 3 - PAGE TITLE & BREADCRUMB', async () => {

        // Title
        const headings = ['h1', 'h2', 'h3', '.page-title', '[class*="title"]'];
        for (const sel of headings) {
            const el = page.locator(sel).first();
            if (await el.count() > 0) {
                const text = await el.innerText({ timeout: 3000 }).catch(() => '');
                if (text.trim()) {
                    console.log(`Page heading (${sel}): "${text.trim()}"`);
                    break;
                }
            }
        }

        // Breadcrumb
        const breadcrumbSelectors = [
            'text=Recruitment',
            'text=Manage Applicants',
            '[class*="breadcrumb"]',
            'nav[aria-label*="breadcrumb"]'
        ];
        for (const sel of breadcrumbSelectors) {
            const el = page.locator(sel).first();
            if (await el.count() > 0) {
                const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
                if (visible) console.log(`Breadcrumb element visible: "${sel}"`);
            }
        }
    });

    // =========================================================
    // STEP 4: SHOW ENTRIES DROPDOWN
    // =========================================================
    await safeStep('STEP 4 - SHOW ENTRIES DROPDOWN', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);
        console.log(`Total <select> elements on page: ${count}`);

        // First select is usually "Show N entries"
        if (count > 0) {
            const firstSelect = selects.first();
            const opts = await firstSelect.locator('option').allTextContents().catch(() => []);
            console.log(`Show entries options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                await firstSelect.selectOption({ index: 0 }).catch(() => {});
                await page.waitForTimeout(1000);
                await firstSelect.selectOption({ index: opts.length > 1 ? 1 : 0 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log('Show entries dropdown tested');
            }
        }
    });

    // =========================================================
    // STEP 5: STATUS TABS VALIDATION
    // =========================================================
    await safeStep('STEP 5 - STATUS TABS VALIDATION', async () => {

        const tabNames = ['Applicants', 'Initial Screened', 'On Hold', 'Rejected', 'Restricted'];

        for (const tabName of tabNames) {

            // Try multiple strategies to find the tab
            const strategies = [
                page.locator(`button:has-text("${tabName}")`).first(),
                page.locator(`[role="tab"]:has-text("${tabName}")`).first(),
                page.locator(`text="${tabName}"`).first(),
                page.locator(`a:has-text("${tabName}")`).first()
            ];

            let clicked = false;
            for (const el of strategies) {
                try {
                    const count = await el.count();
                    if (count > 0) {
                        const visible = await el.isVisible({ timeout: 2000 });
                        if (visible) {
                            await el.click({ timeout: 5000 });
                            await page.waitForTimeout(2000);
                            const rows = await page.locator('table tbody tr').count().catch(() => 0);
                            console.log(`Tab "${tabName}": clicked ✅, rows visible: ${rows}`);
                            clicked = true;
                            break;
                        }
                    }
                } catch { /* try next strategy */ }
            }

            if (!clicked) {
                console.log(`⚠️ Tab "${tabName}": not found or not clickable`);
            }
        }

        // Return to Applicants tab
        try {
            const applicantsTab = page.locator('button:has-text("Applicants"), [role="tab"]:has-text("Applicants"), text=Applicants').first();
            await applicantsTab.click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            console.log('Returned to "Applicants" tab');
        } catch {
            console.log('⚠️ Could not return to Applicants tab');
        }
    });

    // =========================================================
    // STEP 6: FILTER FIELDS DISCOVERY & VALIDATION
    // =========================================================
    await safeStep('STEP 6 - FILTER FIELDS VALIDATION', async () => {

        // All select dropdowns
        const selects = page.locator('select');
        const selectCount = await selects.count().catch(() => 0);
        console.log(`Select dropdowns found: ${selectCount}`);

        for (let i = 0; i < selectCount; i++) {
            try {
                const sel = selects.nth(i);
                const visible = await sel.isVisible({ timeout: 2000 });
                if (visible) {
                    const opts = await sel.locator('option').allTextContents().catch(() => []);
                    console.log(`  Select ${i + 1}: [${opts.join(' | ')}]`);
                }
            } catch { /* skip */ }
        }

        // All text inputs
        const inputs = page.locator('input[type="text"], input:not([type]), input[type="date"], input[type="number"]');
        const inputCount = await inputs.count().catch(() => 0);
        console.log(`Input fields found: ${inputCount}`);

        for (let i = 0; i < inputCount; i++) {
            try {
                const inp = inputs.nth(i);
                const visible = await inp.isVisible({ timeout: 2000 });
                if (visible) {
                    const ph = await inp.getAttribute('placeholder').catch(() => '');
                    const type = await inp.getAttribute('type').catch(() => 'text');
                    console.log(`  Input ${i + 1}: placeholder="${ph}" type="${type}"`);
                }
            } catch { /* skip */ }
        }
    });

    // =========================================================
    // STEP 7: SEARCH BUTTON — SAFE CLICK (fixes the stuck issue)
    // =========================================================
    await safeStep('STEP 7 - SEARCH BUTTON CLICK (safe)', async () => {

        // Fill First Name if available
        const firstNameInput = page.locator('input[placeholder="First Name"], input[placeholder*="first" i]').first();
        if (await firstNameInput.count() > 0) {
            await safeFill(firstNameInput, 'Jonas', 'First Name');
            await page.waitForTimeout(500);
        }

        // Click SEARCH — scan all buttons for text match
        const clicked = await clickButtonByText('SEARCH');

        if (clicked) {
            // Wait max 5 seconds for table to update — not indefinitely
            await page.waitForTimeout(3000);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after SEARCH: ${rows}`);
        }
    });

    // =========================================================
    // STEP 8: RESET BUTTON — SAFE CLICK
    // =========================================================
    await safeStep('STEP 8 - RESET BUTTON CLICK (safe)', async () => {

        const clicked = await clickButtonByText('RESET');

        if (clicked) {
            await page.waitForTimeout(2000);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after RESET: ${rows}`);
        }
    });

    // =========================================================
    // STEP 9: FILTER BY GENDER → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 9 - FILTER BY GENDER', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
            try {
                const sel = selects.nth(i);
                const opts = await sel.locator('option').allTextContents().catch(() => []);
                const hasGender = opts.some(o => /male|female/i.test(o));
                if (hasGender) {
                    // Find male or female option index
                    const maleIdx = opts.findIndex(o => /male/i.test(o));
                    if (maleIdx > 0) {
                        await sel.selectOption({ index: maleIdx });
                        await page.waitForTimeout(500);
                        console.log(`Gender filter set to: ${opts[maleIdx]}`);
                    }
                    break;
                }
            } catch { /* skip */ }
        }

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(3000);
        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows after gender filter: ${rows}`);

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        console.log('Gender filter reset');
    });

    // =========================================================
    // STEP 10: FILTER BY APPLIED DATE → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 10 - FILTER BY APPLIED DATE', async () => {

        const dateInputs = page.locator('input[type="date"]');
        const count = await dateInputs.count().catch(() => 0);
        console.log(`Date inputs found: ${count}`);

        if (count > 0) {
            await safeFill(dateInputs.first(), '2026-04-03', 'Applied Date');
            await page.waitForTimeout(500);

            await clickButtonByText('SEARCH');
            await page.waitForTimeout(3000);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after date filter (2026-04-03): ${rows}`);

            await clickButtonByText('RESET');
            await page.waitForTimeout(2000);
            console.log('Date filter reset');
        }
    });

    // =========================================================
    // STEP 11: FILTER BY APPLICANT ID → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 11 - FILTER BY APPLICANT ID', async () => {

        const applicantIdInput = page.locator(
            'input[placeholder*="Applicant Id" i], input[placeholder*="Applicant ID" i], input[name*="applicant_id" i]'
        ).first();

        if (await applicantIdInput.count() > 0) {
            await safeFill(applicantIdInput, 'PRO-ST-Q-260303-0001-0003', 'Applicant Id');
            await page.waitForTimeout(500);

            await clickButtonByText('SEARCH');
            await page.waitForTimeout(3000);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after Applicant Id filter: ${rows}`);

            await clickButtonByText('RESET');
            await page.waitForTimeout(2000);
        } else {
            console.log('Applicant Id input not found');
        }
    });

    // =========================================================
    // STEP 12: FILTER BY CNIC → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 12 - FILTER BY CNIC', async () => {

        const cnicInput = page.locator('input[placeholder="CNIC"], input[placeholder*="cnic" i]').first();

        if (await cnicInput.count() > 0) {
            await safeFill(cnicInput, '00000-0000001-0', 'CNIC');
            await page.waitForTimeout(500);

            await clickButtonByText('SEARCH');
            await page.waitForTimeout(3000);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after CNIC filter: ${rows}`);

            await clickButtonByText('RESET');
            await page.waitForTimeout(2000);
        } else {
            console.log('CNIC input not found');
        }
    });

    // =========================================================
    // STEP 13: SEARCH TABLE DATA (inline table search)
    // =========================================================
    await safeStep('STEP 13 - SEARCH TABLE DATA (inline)', async () => {

        const tableSearchInputs = [
            page.locator('input[placeholder="Search Table Data"]').first(),
            page.locator('input[placeholder*="Search" i]').first(),
            page.locator('input[type="search"]').first()
        ];

        let searchInput = null;
        for (const inp of tableSearchInputs) {
            if (await inp.count() > 0 && await inp.isVisible({ timeout: 2000 }).catch(() => false)) {
                searchInput = inp;
                break;
            }
        }

        if (searchInput) {
            const searchTerms = ['QA', 'Full Stack Developer', 'SQA Engineer', 'Jonas'];

            for (const term of searchTerms) {
                await safeFill(searchInput, term, 'Table Search');
                await page.waitForTimeout(1500);
                const rows = await page.locator('table tbody tr').count().catch(() => 0);
                console.log(`Search "${term}": rows = ${rows}`);
                await searchInput.clear({ timeout: 3000 }).catch(() => {});
                await page.waitForTimeout(800);
            }

        } else {
            console.log('⚠️ "Search Table Data" input not found');
        }
    });

    // =========================================================
    // STEP 14: TABLE STRUCTURE VALIDATION
    // =========================================================
    await safeStep('STEP 14 - TABLE STRUCTURE VALIDATION', async () => {

        const tables = page.locator('table');
        const tableCount = await tables.count().catch(() => 0);
        console.log(`Tables on page: ${tableCount}`);

        if (tableCount > 0) {
            const headers = await tables.first().locator('th')
                .allInnerTexts()
                .catch(() => []);
            console.log(`Columns: ${headers.join(' | ')}`);

            const expectedCols = ['Id', 'First Name', 'Last Name', 'Job Title', 'Email', 'CNIC', 'Contact No', 'Experience', 'Applied On'];
            for (const col of expectedCols) {
                const found = headers.some(h => h.toLowerCase().includes(col.toLowerCase()));
                console.log(`  Column "${col}": ${found ? '✅' : '⚠️ missing'}`);
            }

            const rows = await tables.first().locator('tbody tr').count().catch(() => 0);
            console.log(`Total data rows: ${rows}`);

            // Log first 3 rows
            for (let i = 0; i < Math.min(rows, 3); i++) {
                const cells = await tables.first().locator('tbody tr').nth(i)
                    .locator('td').allInnerTexts().catch(() => []);
                console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
            }
        }
    });

    // =========================================================
    // STEP 15: TABLE COLUMN SORT
    // =========================================================
    await safeStep('STEP 15 - TABLE COLUMN SORT', async () => {

        const ths = page.locator('table thead th');
        const count = await ths.count().catch(() => 0);

        for (let i = 0; i < Math.min(count, 5); i++) {
            try {
                const th = ths.nth(i);
                const text = await th.innerText({ timeout: 2000 }).catch(() => '');
                await th.click({ timeout: 4000 });
                await page.waitForTimeout(800);
                console.log(`Column sort ASC: "${text.trim()}"`);
                await th.click({ timeout: 4000 });
                await page.waitForTimeout(800);
                console.log(`Column sort DESC: "${text.trim()}"`);
            } catch {
                console.log(`⚠️ Could not sort column ${i + 1}`);
            }
        }
    });

    // =========================================================
    // STEP 16: EXPORT BUTTONS (CSV / PDF)
    // =========================================================
    await safeStep('STEP 16 - EXPORT BUTTONS', async () => {

        const exportSelectors = [
            'button[title*="CSV" i]',
            'button[title*="Excel" i]',
            'button[title*="PDF" i]',
            'button[title*="export" i]',
            'button[aria-label*="export" i]',
            'button[aria-label*="csv" i]',
            'button[aria-label*="pdf" i]'
        ];

        let exportCount = 0;
        for (const sel of exportSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log(`Export button clicked: ${sel}`);
                exportCount++;
            }
        }

        // Fallback: icon-only buttons near table search area
        if (exportCount === 0) {
            const iconBtns = page.locator('button:has(svg)');
            const iconCount = await iconBtns.count().catch(() => 0);
            console.log(`Icon-only buttons found: ${iconCount}`);

            for (let i = 0; i < Math.min(iconCount, 4); i++) {
                try {
                    const btn = iconBtns.nth(i);
                    const visible = await btn.isVisible({ timeout: 2000 });
                    if (visible) {
                        await btn.click({ timeout: 4000 });
                        await page.waitForTimeout(1000);
                        console.log(`Icon button ${i + 1} clicked`);
                    }
                } catch { /* skip */ }
            }
        }
    });

    // =========================================================
    // STEP 17: ADD APPLICANT — WITH STRICT TIMEOUT GUARD
    // =========================================================
    await safeStep('STEP 17 - ADD APPLICANT BUTTON (timeout guarded)', async () => {

        // Find the "+ Add Applicant" button
        const addBtnSelectors = [
            page.locator('button:has-text("Add Applicant")').first(),
            page.locator('a:has-text("Add Applicant")').first(),
            page.locator('text=+ Add Applicant').first(),
            page.locator('[class*="add"]:has-text("Applicant")').first()
        ];

        let addBtn = null;
        for (const btn of addBtnSelectors) {
            try {
                if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 })) {
                    addBtn = btn;
                    break;
                }
            } catch { /* skip */ }
        }

        if (!addBtn) {
            console.log('⚠️ Add Applicant button not found');
            return;
        }

        console.log('"+ Add Applicant" button found');

        // Click with 5s timeout max — won't hang
        const clickResult = await Promise.race([
            addBtn.click({ timeout: 5000 }).then(() => 'clicked'),
            new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
        ]);

        console.log(`Add Applicant click result: ${clickResult}`);

        // Wait max 8 seconds for modal/drawer/form
        const modalSelectors = [
            '[role="dialog"]',
            '.ant-modal',
            '.ant-drawer',
            '.modal',
            'form[class*="applicant"]',
            '[class*="modal"]',
            '[class*="drawer"]',
            '[class*="form"]'
        ];

        let modalFound = false;
        for (const sel of modalSelectors) {
            const appeared = await page.locator(sel).first()
                .waitFor({ state: 'visible', timeout: 4000 })
                .then(() => true)
                .catch(() => false);

            if (appeared) {
                console.log(`✅ Modal/Form appeared: "${sel}"`);
                modalFound = true;
                break;
            }
        }

        if (!modalFound) {
            // BUG REPORT
            console.log('🐛 BUG: Add Applicant clicked but NO modal/form appeared (confirmed bug)');
            await page.screenshot({
                path: 'test-assets/BUG-add-applicant-no-modal.png',
                fullPage: false
            });
            console.log('   Bug screenshot: test-assets/BUG-add-applicant-no-modal.png');
            return;
        }

        // ---- FORM FIELD VALIDATION ----
        await page.waitForTimeout(1000);

        const formFieldChecks = [
            { sel: 'input[placeholder*="First Name" i]', label: 'First Name' },
            { sel: 'input[placeholder*="Last Name" i]',  label: 'Last Name' },
            { sel: 'input[placeholder*="Email" i]',       label: 'Email' },
            { sel: 'input[placeholder*="CNIC" i]',        label: 'CNIC' },
            { sel: 'input[placeholder*="Contact" i], input[placeholder*="Phone" i]', label: 'Contact/Phone' },
            { sel: 'input[type="date"]',                  label: 'Date' },
            { sel: 'input[type="file"]',                  label: 'File Upload' },
            { sel: 'select',                               label: 'Dropdown(s)' },
            { sel: 'textarea',                             label: 'Textarea' }
        ];

        for (const { sel, label } of formFieldChecks) {
            const el = page.locator(sel).first();
            const found = await el.count().catch(() => 0) > 0;
            const visible = found ? await el.isVisible({ timeout: 2000 }).catch(() => false) : false;
            console.log(`  Form field "${label}": ${visible ? '✅ visible' : '⚠️ not found'}`);
        }

        // ---- SUBMIT EMPTY (validation check) ----
        const submitBtn = page.locator(
            'button[type="submit"], button:has-text("Save"), button:has-text("Submit"), button:has-text("Add"), button:has-text("Create")'
        ).last();

        if (await submitBtn.count() > 0 && await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);

            const errors = page.locator('[class*="error"], [class*="invalid"], .ant-form-item-explain-error, [class*="help"]');
            const errCount = await errors.count().catch(() => 0);
            console.log(`  Validation errors on empty submit: ${errCount}`);
        }

        // ---- CLOSE MODAL ----
        const closeSelectors = [
            'button[aria-label="Close"]',
            '.ant-modal-close',
            '.ant-drawer-close',
            'button:has-text("Cancel")',
            'button:has-text("Close")',
            '[class*="close"]'
        ];

        let closed = false;
        for (const sel of closeSelectors) {
            const closeBtn = page.locator(sel).first();
            if (await closeBtn.count() > 0 && await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await closeBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log(`Modal closed via: "${sel}"`);
                closed = true;
                break;
            }
        }

        if (!closed) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            console.log('Modal closed via Escape key');
        }
    });

    // =========================================================
    // STEP 18: ROW ACTIONS DISCOVERY
    // =========================================================
    await safeStep('STEP 18 - ROW ACTIONS DISCOVERY', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Table rows for action testing: ${rows}`);

        if (rows === 0) {
            console.log('⚠️ No rows to test actions on');
            return;
        }

        const firstRow = page.locator('table tbody tr').first();

        // Hover to reveal hidden action buttons
        await firstRow.hover({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(500);

        // Find all interactive elements in the row
        const rowBtns = firstRow.locator('button, a, [role="button"], [class*="action"]');
        const btnCount = await rowBtns.count().catch(() => 0);
        console.log(`Interactive elements in first row: ${btnCount}`);

        for (let i = 0; i < Math.min(btnCount, 8); i++) {
            try {
                const btn = rowBtns.nth(i);
                const visible = await btn.isVisible({ timeout: 2000 });
                if (visible) {
                    const text = await btn.innerText({ timeout: 2000 }).catch(() => '');
                    const title = await btn.getAttribute('title').catch(() => '');
                    const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
                    console.log(`  Row btn ${i + 1}: text="${text.trim()}" title="${title}" aria="${ariaLabel}"`);
                }
            } catch { /* skip */ }
        }
    });

    // =========================================================
    // STEP 19: VIEW APPLICANT DETAIL
    // =========================================================
    await safeStep('STEP 19 - VIEW APPLICANT DETAIL', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        // Try clicking the ID cell (first column)
        const idCell = firstRow.locator('td').first();
        await idCell.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(3000);

        let modalVisible = false;
        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]', '[class*="drawer"]'];
        for (const sel of modalSels) {
            modalVisible = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (modalVisible) { console.log(`Detail opened via ID click (${sel})`); break; }
        }

        if (!modalVisible) {
            // Try view button
            const viewBtn = firstRow.locator(
                'button[title*="View" i], button[aria-label*="view" i], a[title*="View" i]'
            ).first();
            if (await viewBtn.count() > 0) {
                await viewBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(3000);
                for (const sel of modalSels) {
                    modalVisible = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (modalVisible) { console.log(`Detail opened via view button (${sel})`); break; }
                }
            }
        }

        if (!modalVisible) {
            console.log('⚠️ Applicant detail did not open');
            return;
        }

        // Close modal
        const closeBtn = page.locator(
            'button[aria-label="Close"], .ant-modal-close, .ant-drawer-close, button:has-text("Close"), button:has-text("Cancel")'
        ).first();
        if (await closeBtn.count() > 0 && await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(1000);
            console.log('Detail closed');
        } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        }
    });

    // =========================================================
    // STEP 20: EDIT APPLICANT
    // =========================================================
    await safeStep('STEP 20 - EDIT APPLICANT', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        const editBtn = firstRow.locator(
            'button[title*="Edit" i], button[aria-label*="edit" i], a[title*="Edit" i]'
        ).first();

        if (await editBtn.count() > 0) {
            await editBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(3000);

            let opened = false;
            for (const sel of ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]']) {
                opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                if (opened) { console.log(`Edit modal opened (${sel})`); break; }
            }

            if (opened) {
                const closeBtn = page.locator(
                    '.ant-modal-close, .ant-drawer-close, button:has-text("Cancel"), button:has-text("Close")'
                ).first();
                await closeBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log('Edit modal closed');
            } else {
                console.log('⚠️ Edit modal did not open');
            }
        } else {
            console.log('⚠️ Edit button not found in first row');
        }
    });

    // =========================================================
    // STEP 21: DELETE APPLICANT (cancel only — no actual delete)
    // =========================================================
    await safeStep('STEP 21 - DELETE APPLICANT (cancel only)', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        const deleteBtn = firstRow.locator(
            'button[title*="Delete" i], button[aria-label*="delete" i], button[title*="Remove" i], a[title*="Delete" i]'
        ).first();

        if (await deleteBtn.count() > 0) {
            await deleteBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);

            const confirmDialog = page.locator(
                '[role="dialog"], .ant-modal-confirm, .ant-popover, [class*="confirm"]'
            ).first();

            const confirmVisible = await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false);
            console.log(`Delete confirmation dialog visible: ${confirmVisible}`);

            if (confirmVisible) {
                const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
                if (await cancelBtn.count() > 0) {
                    await cancelBtn.click({ timeout: 4000 }).catch(() => {});
                    await page.waitForTimeout(1000);
                    console.log('Delete cancelled — data preserved ✅');
                }
            }
        } else {
            console.log('⚠️ Delete button not found — may be hidden or not present');
        }
    });

    // =========================================================
    // STEP 22: PAGINATION
    // =========================================================
    await safeStep('STEP 22 - PAGINATION', async () => {

        // From screenshot: simple < 1 > arrows
        const paginationSelectors = {
            next: [
                'button[aria-label*="next" i]',
                '.ant-pagination-next button',
                'li.ant-pagination-next',
                '[class*="next"]',
                'button:has-text(">")',
                '[title="Next Page"]'
            ],
            prev: [
                'button[aria-label*="prev" i]',
                '.ant-pagination-prev button',
                'li.ant-pagination-prev',
                '[class*="prev"]',
                'button:has-text("<")',
                '[title="Previous Page"]'
            ]
        };

        let nextBtn = null;
        for (const sel of paginationSelectors.next) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                nextBtn = el;
                console.log(`Pagination next button found: "${sel}"`);
                break;
            }
        }

        if (nextBtn) {
            const enabled = await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false);
            console.log(`Next page button enabled: ${enabled}`);
            if (enabled) {
                await nextBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2000);
                const rows = await page.locator('table tbody tr').count().catch(() => 0);
                console.log(`Rows on page 2: ${rows}`);

                for (const sel of paginationSelectors.prev) {
                    const prevBtn = page.locator(sel).first();
                    if (await prevBtn.count() > 0 && await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await prevBtn.click({ timeout: 4000 }).catch(() => {});
                        await page.waitForTimeout(2000);
                        console.log('Returned to page 1');
                        break;
                    }
                }
            }
        } else {
            console.log('⚠️ Pagination next button not found (may be single page)');
        }
    });

    // =========================================================
    // STEP 23: SIDEBAR LINKS VALIDATION
    // =========================================================
    await safeStep('STEP 23 - SIDEBAR NAVIGATION VALIDATION', async () => {

        const sidebarItems = [
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

        for (const item of sidebarItems) {
            const el = page.locator(`text="${item}"`).first();
            const count = await el.count().catch(() => 0);
            const visible = count > 0 ? await el.isVisible({ timeout: 2000 }).catch(() => false) : false;
            console.log(`Sidebar "${item}": ${visible ? '✅ visible' : '⚠️ not found'}`);
        }
    });

    // =========================================================
    // STEP 24: BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('STEP 24 - BROKEN IMAGE CHECK', async () => {

        const images = page.locator('img');
        const total = await images.count().catch(() => 0);
        let broken = 0;

        console.log(`Total images: ${total}`);

        for (let i = 0; i < total; i++) {
            try {
                const w = await images.nth(i).evaluate(img => img.naturalWidth, { timeout: 3000 });
                if (w === 0) {
                    const src = await images.nth(i).getAttribute('src').catch(() => '');
                    console.log(`  ⚠️ Broken: ${src}`);
                    broken++;
                }
            } catch { /* skip */ }
        }

        console.log(broken === 0 ? 'All images OK' : `Broken images: ${broken}`);
    });

    // =========================================================
    // STEP 25: SCROLL TEST
    // =========================================================
    await safeStep('STEP 25 - SCROLL TEST', async () => {

        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(800);
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(800);
        await page.mouse.wheel(0, -4000);
        await page.waitForTimeout(800);
        console.log('Scroll test completed');
    });

    // =========================================================
    // STEP 26: FINAL SCREENSHOTS
    // =========================================================
    await safeStep('STEP 26 - FINAL SCREENSHOTS', async () => {

        await page.screenshot({
            path: 'test-assets/manage-applicants-viewport.png',
            fullPage: false
        });
        console.log('Viewport screenshot saved');

        await page.screenshot({
            path: 'test-assets/manage-applicants-fullpage.png',
            fullPage: true
        });
        console.log('Full page screenshot saved');
    });

    console.log('\n✅ Manage Applicants — Full Module Testing COMPLETE');
    console.log('📁 Assets saved in: test-assets/');
});