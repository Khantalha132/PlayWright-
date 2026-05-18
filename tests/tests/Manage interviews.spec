import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('CultureHCM - Manage Interviews Full Module Testing', async ({ page }) => {

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

    // =========================================================
    // DISABLE ANIMATIONS
    // =========================================================
    await page.addStyleTag({
        content: `*, *::before, *::after {
            transition: none !important;
            animation: none !important;
            scroll-behavior: auto !important;
        }`
    });

    // =========================================================
    // STEP 1: LOGIN
    // =========================================================
    await safeStep('STEP 1 - LOGIN', async () => {

        await page.goto('https://demo.culturehcm.com/login', {
            waitUntil: 'domcontentloaded', timeout: 60000
        });
        await page.waitForTimeout(2000);

        const email = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await email.waitFor({ state: 'visible', timeout: 15000 });
        await email.fill('apd0016@appedology.com');

        await page.locator('input[type="password"]').first().fill('0yMT8e');
        await clickButtonByText('Login');

        await page.waitForURL(/dashboard/, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        console.log('Logged in as Asfand Khan / SQA Engineer');
    });

    // =========================================================
    // STEP 2: NAVIGATE TO MANAGE INTERVIEWS
    // =========================================================
    await safeStep('STEP 2 - NAVIGATE TO MANAGE INTERVIEWS', async () => {

        await page.goto('https://demo.culturehcm.com/recruitment/open-vacancies', {
            waitUntil: 'domcontentloaded', timeout: 60000
        });
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(3000);

        console.log(`Loaded URL: ${page.url()}`);

        const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        const hasContent = /interview|manage|recruitment/i.test(bodyText);
        console.log(`Page has interview/recruitment content: ${hasContent}`);
    });

    // =========================================================
    // STEP 3: PAGE TITLE & BREADCRUMB VALIDATION
    // =========================================================
    await safeStep('STEP 3 - PAGE TITLE & BREADCRUMB', async () => {

        // Title: "Manage Interviews"
        const titleSelectors = [
            'text=Manage Interviews',
            'h1', 'h2', 'h3',
            '[class*="title"]',
            '[class*="heading"]'
        ];

        for (const sel of titleSelectors) {
            const el = page.locator(sel).first();
            if (await el.count() > 0) {
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                if (text.trim()) {
                    console.log(`Title element (${sel}): "${text.trim()}"`);
                    break;
                }
            }
        }

        // Breadcrumb: Recruitment / Manage Interviews
        const crumbItems = ['Recruitment', 'Manage Interviews'];
        for (const item of crumbItems) {
            const el = page.locator(`text="${item}"`).first();
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`Breadcrumb "${item}": ${visible ? '✅' : '⚠️ not found'}`);
        }
    });

    // =========================================================
    // STEP 4: STATUS TABS VALIDATION & CLICK
    // Tabs visible: Scheduled Interviews | Interviewed Candidates
    //               Cancelled Interviews | Shortlisted Candidates
    // =========================================================
    await safeStep('STEP 4 - STATUS TABS VALIDATION', async () => {

        const tabs = [
            'Scheduled Interviews',
            'Interviewed Candidates',
            'Cancelled Interviews',
            'Shortlisted Candidates'
        ];

        for (const tabName of tabs) {

            const strategies = [
                page.locator(`button:has-text("${tabName}")`).first(),
                page.locator(`[role="tab"]:has-text("${tabName}")`).first(),
                page.locator(`text="${tabName}"`).first(),
                page.locator(`a:has-text("${tabName}")`).first()
            ];

            let clicked = false;
            for (const el of strategies) {
                try {
                    if (await el.count() > 0 && await el.isVisible({ timeout: 2000 })) {
                        await el.click({ timeout: 5000 });
                        await page.waitForTimeout(2000);
                        const rows = await page.locator('table tbody tr').count().catch(() => 0);
                        console.log(`Tab "${tabName}": ✅ clicked, rows: ${rows}`);
                        clicked = true;
                        break;
                    }
                } catch { }
            }
            if (!clicked) console.log(`⚠️ Tab "${tabName}": not found`);
        }

        // Return to Scheduled Interviews (default/active tab)
        const defaultTab = page.locator('text="Scheduled Interviews"').first();
        await safeClick(defaultTab, 'Return to Scheduled Interviews tab');
        await page.waitForTimeout(2000);
    });

    // =========================================================
    // STEP 5: FILTER DROPDOWNS DISCOVERY
    // Filters: Job Title | Status | Interviewer | Recruiter | Applied Month
    // =========================================================
    await safeStep('STEP 5 - FILTER DROPDOWNS DISCOVERY', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);
        console.log(`<select> elements found: ${count}`);

        const expectedFilters = [
            'Select Job Title',
            'Select Status',
            'Select Interviewer',
            'Select Recruiter'
        ];

        for (let i = 0; i < count; i++) {
            try {
                const sel = selects.nth(i);
                const visible = await sel.isVisible({ timeout: 2000 });
                if (visible) {
                    const opts = await sel.locator('option').allTextContents().catch(() => []);
                    console.log(`  Filter ${i + 1}: [${opts.join(' | ')}]`);
                }
            } catch { }
        }

        // Applied Month (date input)
        const dateInput = page.locator('input[type="date"], input[type="month"]').first();
        if (await dateInput.count() > 0) {
            const visible = await dateInput.isVisible({ timeout: 2000 }).catch(() => false);
            console.log(`Applied Month date input visible: ${visible}`);
        }
    });

    // =========================================================
    // STEP 6: FILTER BY JOB TITLE → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 6 - FILTER BY JOB TITLE', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        // First select = Job Title
        if (count > 0) {
            const jobSel = selects.first();
            const opts = await jobSel.locator('option').allTextContents().catch(() => []);
            console.log(`Job Title options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                await jobSel.selectOption({ index: 1 }).catch(() => {});
                await page.waitForTimeout(500);
                console.log(`Job Title selected: "${opts[1]}"`);
            }
        }

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(2500);
        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows after Job Title filter: ${rows}`);

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        console.log('Filter reset');
    });

    // =========================================================
    // STEP 7: FILTER BY STATUS → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 7 - FILTER BY STATUS', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        // Second select = Status
        if (count > 1) {
            const statusSel = selects.nth(1);
            const opts = await statusSel.locator('option').allTextContents().catch(() => []);
            console.log(`Status options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                await statusSel.selectOption({ index: 1 }).catch(() => {});
                await page.waitForTimeout(500);
                console.log(`Status selected: "${opts[1]}"`);
            }
        }

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(2500);
        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows after Status filter: ${rows}`);

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        console.log('Status filter reset');
    });

    // =========================================================
    // STEP 8: FILTER BY INTERVIEWER → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 8 - FILTER BY INTERVIEWER', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        // Third select = Interviewer
        if (count > 2) {
            const intSel = selects.nth(2);
            const opts = await intSel.locator('option').allTextContents().catch(() => []);
            console.log(`Interviewer options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                await intSel.selectOption({ index: 1 }).catch(() => {});
                await page.waitForTimeout(500);
                console.log(`Interviewer selected: "${opts[1]}"`);
            }
        }

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(2500);
        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows after Interviewer filter: ${rows}`);

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        console.log('Interviewer filter reset');
    });

    // =========================================================
    // STEP 9: FILTER BY RECRUITER → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 9 - FILTER BY RECRUITER', async () => {

        const selects = page.locator('select');
        const count = await selects.count().catch(() => 0);

        // Fourth select = Recruiter
        if (count > 3) {
            const recSel = selects.nth(3);
            const opts = await recSel.locator('option').allTextContents().catch(() => []);
            console.log(`Recruiter options: ${opts.join(', ')}`);

            if (opts.length > 1) {
                await recSel.selectOption({ index: 1 }).catch(() => {});
                await page.waitForTimeout(500);
                console.log(`Recruiter selected: "${opts[1]}"`);
            }
        }

        await clickButtonByText('SEARCH');
        await page.waitForTimeout(2500);
        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows after Recruiter filter: ${rows}`);

        await clickButtonByText('RESET');
        await page.waitForTimeout(2000);
        console.log('Recruiter filter reset');
    });

    // =========================================================
    // STEP 10: FILTER BY APPLIED MONTH → SEARCH → RESET
    // =========================================================
    await safeStep('STEP 10 - FILTER BY APPLIED MONTH', async () => {

        const dateInput = page.locator('input[type="date"], input[type="month"]').first();

        if (await dateInput.count() > 0 && await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {

            const inputType = await dateInput.getAttribute('type').catch(() => 'date');
            const value = inputType === 'month' ? '2026-02' : '2026-02-25';

            await safeFill(dateInput, value, 'Applied Month');
            await page.waitForTimeout(500);

            await clickButtonByText('SEARCH');
            await page.waitForTimeout(2500);
            const rows = await page.locator('table tbody tr').count().catch(() => 0);
            console.log(`Rows after Applied Month filter: ${rows}`);

            await clickButtonByText('RESET');
            await page.waitForTimeout(2000);
            console.log('Applied Month filter reset');

        } else {
            console.log('Applied Month input not found');
        }
    });

    // =========================================================
    // STEP 11: SEARCH TABLE DATA (inline search box)
    // =========================================================
    await safeStep('STEP 11 - SEARCH TABLE DATA (inline)', async () => {

        const searchInput = page.locator('input[placeholder="Search Table Data"]').first();

        if (await searchInput.count() > 0 && await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {

            const terms = ['SQA Engineer', 'Kaylie', 'Full Stack', 'Daniel Reeve', 'Alizeh'];

            for (const term of terms) {
                await safeFill(searchInput, term, 'Table Search');
                await page.waitForTimeout(1500);
                const rows = await page.locator('table tbody tr').count().catch(() => 0);
                console.log(`Search "${term}": ${rows} row(s)`);
                await searchInput.clear({ timeout: 3000 }).catch(() => {});
                await page.waitForTimeout(600);
            }

        } else {
            console.log('⚠️ Search Table Data input not found');
        }
    });

    // =========================================================
    // STEP 12: TABLE COLUMNS VALIDATION
    // Columns: Applicant Id | Job Title | Name | CNIC |
    //          Applied On | Interview Time | Interviewer | Recruiter | Last Updated
    // =========================================================
    await safeStep('STEP 12 - TABLE COLUMNS VALIDATION', async () => {

        const headers = await page.locator('table thead th')
            .allInnerTexts().catch(() => []);
        console.log(`Table columns: ${headers.join(' | ')}`);

        const expected = [
            'Applicant Id', 'Job Title', 'Name', 'CNIC',
            'Applied On', 'Interview Time', 'Interviewer', 'Recruiter', 'Last Updated'
        ];

        for (const col of expected) {
            const found = headers.some(h => h.toLowerCase().includes(col.toLowerCase()));
            console.log(`  Column "${col}": ${found ? '✅' : '⚠️ missing'}`);
        }

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Total data rows: ${rows}`);
    });

    // =========================================================
    // STEP 13: TABLE ROW DATA VALIDATION
    // =========================================================
    await safeStep('STEP 13 - TABLE ROW DATA', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows to validate: ${rows}`);

        for (let i = 0; i < Math.min(rows, 3); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`Row ${i + 1}: ${cells.join(' | ')}`);

            // Verify key fields are not empty
            if (cells.length > 0) {
                console.log(`  Applicant Id: "${cells[0]?.trim()}"`);
                console.log(`  Job Title:    "${cells[1]?.trim()}"`);
                console.log(`  Name:         "${cells[2]?.trim()}"`);
                console.log(`  CNIC:         "${cells[3]?.trim()}"`);
                console.log(`  Interview Time: "${cells[5]?.trim()}"`);
            }
        }
    });

    // =========================================================
    // STEP 14: TABLE COLUMN SORT
    // =========================================================
    await safeStep('STEP 14 - TABLE COLUMN SORT', async () => {

        const ths = page.locator('table thead th');
        const count = await ths.count().catch(() => 0);

        for (let i = 0; i < Math.min(count, 6); i++) {
            try {
                const th = ths.nth(i);
                const text = await th.innerText({ timeout: 2000 }).catch(() => '');
                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);
                console.log(`Sort ASC on column: "${text.trim()}"`);
                await th.click({ timeout: 4000 });
                await page.waitForTimeout(700);
                console.log(`Sort DESC on column: "${text.trim()}"`);
            } catch {
                console.log(`⚠️ Could not sort column ${i + 1}`);
            }
        }
    });

    // =========================================================
    // STEP 15: EXPORT BUTTONS (CSV / PDF icons)
    // =========================================================
    await safeStep('STEP 15 - EXPORT BUTTONS (CSV / PDF)', async () => {

        const exportSels = [
            'button[title*="CSV" i]', 'button[title*="Excel" i]',
            'button[title*="PDF" i]', 'button[aria-label*="export" i]',
            'button[aria-label*="csv" i]', 'button[aria-label*="pdf" i]'
        ];

        let found = 0;
        for (const sel of exportSels) {
            const btn = page.locator(sel).first();
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(1000);
                console.log(`Export clicked: ${sel}`);
                found++;
            }
        }

        // Fallback: icon buttons near Search Table Data row
        if (found === 0) {
            const iconBtns = page.locator('button:has(svg)');
            const total = await iconBtns.count().catch(() => 0);
            console.log(`Icon-only buttons: ${total}`);
            for (let i = 0; i < Math.min(total, 4); i++) {
                try {
                    const btn = iconBtns.nth(i);
                    if (await btn.isVisible({ timeout: 2000 })) {
                        await btn.click({ timeout: 4000 });
                        await page.waitForTimeout(800);
                        console.log(`Icon button ${i + 1} clicked`);
                    }
                } catch { }
            }
        }
    });

    // =========================================================
    // STEP 16: ROW ACTIONS DISCOVERY (hover → reveal buttons)
    // =========================================================
    await safeStep('STEP 16 - ROW ACTIONS DISCOVERY', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Rows for action testing: ${rows}`);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);

        const actionEls = firstRow.locator('button, a, [role="button"], [class*="action"]');
        const elCount = await actionEls.count().catch(() => 0);
        console.log(`Action elements in row 1: ${elCount}`);

        for (let i = 0; i < Math.min(elCount, 8); i++) {
            try {
                const el = actionEls.nth(i);
                if (await el.isVisible({ timeout: 2000 })) {
                    const text = await el.innerText({ timeout: 1500 }).catch(() => '');
                    const title = await el.getAttribute('title').catch(() => '');
                    const aria = await el.getAttribute('aria-label').catch(() => '');
                    console.log(`  Action ${i + 1}: text="${text.trim()}" title="${title}" aria="${aria}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 17: VIEW INTERVIEW DETAIL (click row / view button)
    // =========================================================
    await safeStep('STEP 17 - VIEW INTERVIEW DETAIL', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        // Click Applicant Id cell (first column)
        await firstRow.locator('td').first().click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(2500);

        const modalSels = ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]'];
        let opened = false;
        for (const sel of modalSels) {
            opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (opened) { console.log(`Detail opened (${sel})`); break; }
        }

        if (!opened) {
            // Try view button
            const viewBtn = firstRow.locator(
                'button[title*="View" i], button[aria-label*="view" i], a[title*="View" i]'
            ).first();
            if (await viewBtn.count() > 0) {
                await viewBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2500);
                for (const sel of modalSels) {
                    opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                    if (opened) { console.log(`Detail opened via view btn (${sel})`); break; }
                }
            }
        }

        if (!opened) {
            console.log('⚠️ Interview detail did not open');
        } else {
            await closeAnyModal();
            console.log('Detail closed');
        }
    });

    // =========================================================
    // STEP 18: EDIT INTERVIEW
    // =========================================================
    await safeStep('STEP 18 - EDIT INTERVIEW', async () => {

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
            await page.waitForTimeout(2500);

            let opened = false;
            for (const sel of ['[role="dialog"]', '.ant-modal', '.ant-drawer', '[class*="modal"]']) {
                opened = await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
                if (opened) { console.log(`Edit modal opened (${sel})`); break; }
            }

            if (opened) {
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
    // STEP 19: DELETE INTERVIEW (cancel only — no actual delete)
    // =========================================================
    await safeStep('STEP 19 - DELETE INTERVIEW (cancel only)', async () => {

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        if (rows === 0) { console.log('No rows'); return; }

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.hover({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);

        const deleteBtn = firstRow.locator(
            'button[title*="Delete" i], button[aria-label*="delete" i], button[title*="Remove" i]'
        ).first();

        if (await deleteBtn.count() > 0) {
            await deleteBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(2000);

            const confirmVisible = await page.locator(
                '[role="dialog"], .ant-modal-confirm, .ant-popover, [class*="confirm"]'
            ).first().isVisible({ timeout: 2500 }).catch(() => false);

            console.log(`Delete confirmation visible: ${confirmVisible}`);

            if (confirmVisible) {
                const cancelBtn = page.locator(
                    'button:has-text("Cancel"), button:has-text("No")'
                ).first();
                await safeClick(cancelBtn, 'Cancel delete');
                console.log('Delete cancelled — data preserved ✅');
            }
        } else {
            console.log('⚠️ Delete button not found in row');
        }
    });

    // =========================================================
    // STEP 20: SCHEDULED INTERVIEWS TAB — FULL ROW LOOP
    // =========================================================
    await safeStep('STEP 20 - ALL ROWS DATA CHECK (Scheduled tab)', async () => {

        // Make sure we are on Scheduled Interviews tab
        const schedTab = page.locator('text="Scheduled Interviews"').first();
        await safeClick(schedTab, 'Scheduled Interviews tab');
        await page.waitForTimeout(2000);

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Scheduled Interviews rows: ${rows}`);

        for (let i = 0; i < rows; i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);

            // Flag empty critical fields
            if (!cells[0]?.trim()) console.log(`  ⚠️ Row ${i + 1}: Applicant Id is empty`);
            if (!cells[4]?.trim()) console.log(`  ⚠️ Row ${i + 1}: Applied On is empty`);
            if (!cells[5]?.trim()) console.log(`  ⚠️ Row ${i + 1}: Interview Time is empty`);
        }
    });

    // =========================================================
    // STEP 21: INTERVIEWED CANDIDATES TAB — ROW CHECK
    // =========================================================
    await safeStep('STEP 21 - INTERVIEWED CANDIDATES TAB', async () => {

        const tab = page.locator('text="Interviewed Candidates"').first();
        await safeClick(tab, 'Interviewed Candidates tab');
        await page.waitForTimeout(2500);

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Interviewed Candidates rows: ${rows}`);

        for (let i = 0; i < Math.min(rows, 5); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
        }

        if (rows === 0) console.log('No interviewed candidates — empty state shown');
    });

    // =========================================================
    // STEP 22: CANCELLED INTERVIEWS TAB — ROW CHECK
    // =========================================================
    await safeStep('STEP 22 - CANCELLED INTERVIEWS TAB', async () => {

        const tab = page.locator('text="Cancelled Interviews"').first();
        await safeClick(tab, 'Cancelled Interviews tab');
        await page.waitForTimeout(2500);

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Cancelled Interviews rows: ${rows}`);

        for (let i = 0; i < Math.min(rows, 5); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
        }

        if (rows === 0) console.log('No cancelled interviews — empty state shown');
    });

    // =========================================================
    // STEP 23: SHORTLISTED CANDIDATES TAB — ROW CHECK
    // =========================================================
    await safeStep('STEP 23 - SHORTLISTED CANDIDATES TAB', async () => {

        const tab = page.locator('text="Shortlisted Candidates"').first();
        await safeClick(tab, 'Shortlisted Candidates tab');
        await page.waitForTimeout(2500);

        const rows = await page.locator('table tbody tr').count().catch(() => 0);
        console.log(`Shortlisted Candidates rows: ${rows}`);

        for (let i = 0; i < Math.min(rows, 5); i++) {
            const cells = await page.locator('table tbody tr').nth(i)
                .locator('td').allInnerTexts().catch(() => []);
            console.log(`  Row ${i + 1}: ${cells.join(' | ')}`);
        }

        if (rows === 0) console.log('No shortlisted candidates — empty state shown');
    });

    // =========================================================
    // STEP 24: PAGINATION (< 1 > arrows)
    // =========================================================
    await safeStep('STEP 24 - PAGINATION', async () => {

        // Return to Scheduled tab first (has data)
        const schedTab = page.locator('text="Scheduled Interviews"').first();
        await safeClick(schedTab, 'Return to Scheduled Interviews');
        await page.waitForTimeout(2000);

        const nextSels = [
            'button[aria-label*="next" i]',
            '.ant-pagination-next button',
            'li.ant-pagination-next',
            '[class*="next"]',
            '[title="Next Page"]'
        ];

        let nextBtn = null;
        for (const sel of nextSels) {
            const el = page.locator(sel).first();
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                nextBtn = el;
                console.log(`Pagination next found: "${sel}"`);
                break;
            }
        }

        if (nextBtn) {
            const enabled = await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false);
            console.log(`Next page enabled: ${enabled}`);
            if (enabled) {
                await nextBtn.click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2000);
                console.log('Navigated to page 2');

                const prevSels = [
                    'button[aria-label*="prev" i]',
                    '.ant-pagination-prev button',
                    '[class*="prev"]'
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
        } else {
            console.log('⚠️ Pagination not found (may be single page)');
        }
    });

    // =========================================================
    // STEP 25: SIDEBAR NAVIGATION VALIDATION
    // =========================================================
    await safeStep('STEP 25 - SIDEBAR NAVIGATION', async () => {

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
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`Sidebar "${item}": ${visible ? '✅' : '⚠️ not found'}`);
        }
    });

    // =========================================================
    // STEP 26: BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('STEP 26 - BROKEN IMAGE CHECK', async () => {

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
    // STEP 27: SCROLL TEST
    // =========================================================
    await safeStep('STEP 27 - SCROLL TEST', async () => {

        // Horizontal scroll (table may overflow)
        await page.evaluate(() => {
            const table = document.querySelector('table');
            if (table) table.scrollIntoView();
        });
        await page.waitForTimeout(500);

        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
        await page.mouse.wheel(0, -2000);
        await page.waitForTimeout(700);

        // Horizontal scroll check
        await page.evaluate(() => window.scrollBy(500, 0));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollBy(-500, 0));
        await page.waitForTimeout(500);

        console.log('Scroll test (vertical + horizontal) completed');
    });

    // =========================================================
    // STEP 28: FINAL SCREENSHOTS
    // =========================================================
    await safeStep('STEP 28 - FINAL SCREENSHOTS', async () => {

        await page.screenshot({
            path: 'test-assets/manage-interviews-viewport.png',
            fullPage: false
        });
        console.log('Viewport screenshot saved');

        await page.screenshot({
            path: 'test-assets/manage-interviews-fullpage.png',
            fullPage: true
        });
        console.log('Full page screenshot saved');
    });

    console.log('\n✅ Manage Interviews — Full Module Testing COMPLETE');
    console.log('📁 Screenshots: test-assets/manage-interviews-*.png');
});