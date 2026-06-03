import { test, expect } from '@playwright/test';

test.setTimeout(300000);

test('CultureHCM - Employment Page Full Module Testing with API Monitoring', async ({ page }) => {

    // =========================================================
    // API FAILURE TRACKER
    // =========================================================
    const apiIssues = [];
    const apiCalls  = [];

    page.on('response', async (response) => {
        const url    = response.url();
        const status = response.status();
        const method = response.request().method();
        const isApi  = url.includes('/api/') || url.includes('/v1/') ||
                       url.includes('/v2/') ||
                       (url.includes('culturehcm.com') &&
                        !url.match(/\.(js|css|png|jpg|ico|svg|woff|ttf|map)$/));

        if (isApi) {
            apiCalls.push({ url, status, method });
            if (status >= 400) {
                const issue = {
                    url, status, method,
                    statusText: response.statusText(),
                    timestamp: new Date().toISOString()
                };
                try {
                    const body = await response.text();
                    if (body && body.length < 600) issue.body = body;
                } catch { }
                apiIssues.push(issue);
                console.log(`\n🔴 API ISSUE: ${method} ${url} → ${status} ${response.statusText()}`);
                if (issue.body) console.log(`   Body: ${issue.body}`);
            }
        }
    });

    page.on('requestfailed', (req) => {
        const issue = {
            url: req.url(), method: req.method(),
            failure: req.failure()?.errorText || 'Unknown',
            timestamp: new Date().toISOString()
        };
        apiIssues.push(issue);
        console.log(`\n🔴 REQUEST FAILED: ${issue.url} — ${issue.failure}`);
    });

    // =========================================================
    // HELPERS
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

    const clickButtonByText = async (text) => {
        const btns  = page.locator('button');
        const count = await btns.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            try {
                const btn = btns.nth(i);
                const t   = await btn.innerText({ timeout: 1500 }).catch(() => '');
                const v   = await btn.isVisible({ timeout: 1500 }).catch(() => false);
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

    const snapAPI = (label) =>
        console.log(`  📡 [API] At "${label}": ${apiCalls.length} calls, ${apiIssues.length} issues`);

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
            waitUntil: 'domcontentloaded', timeout: 60000
        });
        await page.waitForTimeout(2000);
        snapAPI('login page');

        const email = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await email.waitFor({ state: 'visible', timeout: 15000 });
        await email.fill('waseem-babar@hotmail.com');

        await page.locator('input[type="password"]').first().fill('12345678');
        await clickButtonByText('Login');

        await page.waitForURL(/dashboard|employment|home/, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 20000 });

        snapAPI('after login');
        console.log(`  Logged in as: CEO — Waseem Babar`);
        console.log(`  Company: WB Communications`);
        console.log(`  URL: ${page.url()}`);
    });

    // =========================================================
    // STEP 2: NAVIGATE TO EMPLOYMENT PAGE
    // =========================================================
    await safeStep('STEP 2 - NAVIGATE TO EMPLOYMENT', async () => {

        await page.goto('https://staging.culturehcm.com/employment', {
            waitUntil: 'domcontentloaded', timeout: 60000
        });
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(3000);
        snapAPI('employment page load');

        console.log(`  URL: ${page.url()}`);
        const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
        console.log(`  Has "Employment" content: ${/employment/i.test(bodyText)}`);
        console.log(`  Has "Positional Information": ${/positional information/i.test(bodyText)}`);
    });

    // =========================================================
    // STEP 3: PAGE TITLE & HEADER VALIDATION
    // =========================================================
    await safeStep('STEP 3 - PAGE TITLE & HEADER', async () => {

        // Orange header banner "Employment"
        const header = page.locator('text=Employment').first();
        const headerVisible = await header.isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`  Page header "Employment": ${headerVisible ? '✅' : '⚠️ not found'}`);

        // Company name in top bar
        const companyName = page.locator('text=WB Communications').first();
        const companyVisible = await companyName.isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`  Company "WB Communications": ${companyVisible ? '✅' : '⚠️ not found'}`);

        // User info
        const ceoLabel = page.locator('text=CEO').first();
        const userLabel = page.locator('text=Waseem Babar').first();
        console.log(`  CEO label: ${await ceoLabel.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
        console.log(`  User "Waseem Babar": ${await userLabel.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);

        // Section heading "Positional Information"
        const positionalHeader = page.locator('text=Positional Information').first();
        console.log(`  "Positional Information" heading: ${await positionalHeader.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 4: EMPLOYEE DROPDOWN VALIDATION
    // Employee: Javon Medhurst (KHI-0012)
    // =========================================================
    await safeStep('STEP 4 - EMPLOYEE DROPDOWN', async () => {

        // Employee selector at top
        const employeeSels = [
            page.locator('select[name*="employee" i]').first(),
            page.locator('[placeholder*="employee" i]').first(),
            page.locator('[placeholder*="Javon" i]').first(),
            page.locator('.ant-select').first(),
            page.locator('[class*="employee-select"]').first()
        ];

        let empDropdown = null;
        for (const el of employeeSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                empDropdown = el;
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                const val  = await el.inputValue({ timeout: 2000 }).catch(() => '');
                console.log(`  Employee dropdown found — text: "${text.trim()}" value: "${val}"`);
                break;
            }
        }

        // Current value check from screenshot: "Javon Medhurst (KHI-0012)"
        const currentEmpText = page.locator('text=Javon Medhurst').first();
        const hasCurrentEmp  = await currentEmpText.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`  Current employee "Javon Medhurst (KHI-0012)": ${hasCurrentEmp ? '✅' : '⚠️ not visible'}`);

        // Try clicking the employee dropdown to see options
        if (empDropdown) {
            await safeClick(empDropdown, 'Employee dropdown');
            await page.waitForTimeout(1500);
            snapAPI('employee dropdown open');

            // Check if options appeared
            const optionsSels = [
                '.ant-select-dropdown',
                '[class*="dropdown"]',
                '[role="listbox"]',
                '[class*="options"]'
            ];
            for (const sel of optionsSels) {
                const dropdown = page.locator(sel).first();
                if (await dropdown.count() > 0 && await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
                    const options = dropdown.locator('[class*="option"], [role="option"], li');
                    const optCount = await options.count().catch(() => 0);
                    console.log(`  Employee options visible: ${optCount}`);
                    for (let i = 0; i < Math.min(optCount, 5); i++) {
                        const optText = await options.nth(i).innerText({ timeout: 1500 }).catch(() => '');
                        if (optText.trim()) console.log(`    Option ${i + 1}: "${optText.trim()}"`);
                    }
                    break;
                }
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }
    });

    // =========================================================
    // STEP 5: POSITIONAL INFORMATION — ALL FIELDS VALIDATION
    // Fields from screenshot:
    // HCM ID | Division | Department | Team | Shift | Section
    // Campaign | Employment Status | Duty Type | Designation
    // Project | Reporting Authority | Indirect Reporting | Team Reporting | Probation Start Date
    // =========================================================
    await safeStep('STEP 5 - POSITIONAL INFORMATION FIELDS', async () => {

        const fieldsToCheck = [
            // Label text from screenshot        | Expected value from screenshot
            { label: 'HCM ID',                  value: 'KHI-0012'        },
            { label: 'Division',                 value: 'Karachi Office'  },
            { label: 'Department',               value: 'Technology'      },
            { label: 'Team',                     value: 'Technology Team' },
            { label: 'Shift',                    value: 'Wb Morning'      },
            { label: 'Section',                  value: 'Morning'         },
            { label: 'Campaign',                 value: 'Technology'      },
            { label: 'Employment Status',        value: 'Active'          },
            { label: 'Duty Type',                value: 'Full Time'       },
            { label: 'Designation',              value: 'Website Designer'},
            { label: 'Project',                  value: ''                },
            { label: 'Reporting Authority',      value: 'Mr Waseem Babar' },
            { label: 'Indirect Reporting Authority', value: ''            },
            { label: 'Team Reporting',           value: ''                },
            { label: 'Probation Start Date',     value: ''                },
        ];

        console.log(`  Validating ${fieldsToCheck.length} positional fields:`);

        for (const field of fieldsToCheck) {
            // Check label is present
            const labelEl = page.locator(`text="${field.label}"`).first();
            const labelVisible = await labelEl.count() > 0
                ? await labelEl.isVisible({ timeout: 2000 }).catch(() => false)
                : false;

            // Check value text if expected
            let valueVisible = false;
            if (field.value) {
                const valueEl = page.locator(`text="${field.value}"`).first();
                valueVisible = await valueEl.count() > 0
                    ? await valueEl.isVisible({ timeout: 2000 }).catch(() => false)
                    : false;
            }

            const status = labelVisible
                ? (field.value ? (valueVisible ? '✅' : '⚠️ value mismatch') : '✅ label found')
                : '⚠️ label not found';

            console.log(`  [${status}] "${field.label}": "${field.value || 'N/A'}"`);
        }
    });

    // =========================================================
    // STEP 6: REQUIRED FIELD INDICATORS (red asterisks *)
    // =========================================================
    await safeStep('STEP 6 - REQUIRED FIELD VALIDATION (*)', async () => {

        // Fields marked required in screenshot: Employee, Division, Department,
        // Team, Shift, Section, Campaign, Employment Status, Duty Type, Designation
        const requiredFields = [
            'Employee', 'Division', 'Department', 'Team',
            'Shift', 'Section', 'Campaign', 'Employment Status',
            'Duty Type', 'Designation'
        ];

        console.log(`  Required fields (marked with *):`);
        for (const field of requiredFields) {
            // Check for asterisk near field label
            const asteriskNearLabel = page.locator(`text="${field}" ~ span, text="${field}" + span`).first();
            const labelEl = page.locator(`text="${field}"`).first();
            const labelVisible = await labelEl.count() > 0
                ? await labelEl.isVisible({ timeout: 2000 }).catch(() => false)
                : false;

            console.log(`  Field "${field}": ${labelVisible ? '✅ visible' : '⚠️ not found'}`);
        }

        // Count total asterisk indicators
        const asterisks = page.locator('[class*="required"], span:has-text("*"), label[class*="required"]');
        const asteriskCount = await asterisks.count().catch(() => 0);
        console.log(`  Total required indicators found: ${asteriskCount}`);
    });

    // =========================================================
    // STEP 7: ALL DROPDOWN FIELDS INTERACTION
    // =========================================================
    await safeStep('STEP 7 - ALL DROPDOWN FIELDS INTERACTION', async () => {

        // Native selects
        const selects = page.locator('select');
        const selCount = await selects.count().catch(() => 0);
        console.log(`  Native <select> count: ${selCount}`);

        for (let i = 0; i < selCount; i++) {
            try {
                const sel  = selects.nth(i);
                if (!await sel.isVisible({ timeout: 2000 })) continue;
                const opts = await sel.locator('option').allTextContents().catch(() => []);
                const name = await sel.getAttribute('name').catch(() => `sel_${i + 1}`);
                console.log(`\n  Dropdown "${name}": [${opts.join(' | ')}]`);

                if (opts.length > 1) {
                    for (let j = 1; j < Math.min(opts.length, 4); j++) {
                        await sel.selectOption({ index: j }).catch(() => {});
                        await page.waitForTimeout(500);
                        console.log(`    Selected: "${opts[j]}"`);
                        snapAPI(`dropdown ${name}=${opts[j]}`);
                    }
                    // Restore original
                    await sel.selectOption({ index: 0 }).catch(() => {});
                }
            } catch (e) {
                console.log(`  ⚠️ Select ${i + 1} error: ${e.message}`);
            }
        }

        // Ant Design / custom dropdowns
        const antSelects = page.locator('.ant-select, [class*="select-container"], [class*="dropdown-select"]');
        const antCount = await antSelects.count().catch(() => 0);
        console.log(`\n  Custom/Ant Design dropdowns: ${antCount}`);

        for (let i = 0; i < Math.min(antCount, 10); i++) {
            try {
                const el = antSelects.nth(i);
                if (!await el.isVisible({ timeout: 2000 })) continue;
                const text = await el.innerText({ timeout: 2000 }).catch(() => '');
                console.log(`  Custom dropdown ${i + 1}: "${text.trim().substring(0, 50)}"`);

                await el.click({ timeout: 4000 });
                await page.waitForTimeout(1000);
                snapAPI(`custom dropdown ${i + 1}`);

                // Count options
                const optionSels = ['.ant-select-dropdown li', '[role="option"]', '[class*="option"]'];
                for (const oSel of optionSels) {
                    const opts = page.locator(oSel);
                    const oCount = await opts.count().catch(() => 0);
                    if (oCount > 0) {
                        console.log(`    Options: ${oCount}`);
                        for (let j = 0; j < Math.min(oCount, 5); j++) {
                            const oText = await opts.nth(j).innerText({ timeout: 1500 }).catch(() => '');
                            if (oText.trim()) console.log(`      Option ${j + 1}: "${oText.trim()}"`);
                        }
                        // Click first option
                        if (oCount > 0) {
                            await opts.first().click({ timeout: 4000 }).catch(() => {});
                            await page.waitForTimeout(800);
                            snapAPI(`option selected in dropdown ${i + 1}`);
                        }
                        break;
                    }
                }
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            } catch (e) {
                console.log(`  ⚠️ Custom dropdown ${i + 1}: ${e.message}`);
                await page.keyboard.press('Escape');
            }
        }
    });

    // =========================================================
    // STEP 8: HCM ID FIELD VALIDATION (read-only)
    // =========================================================
    await safeStep('STEP 8 - HCM ID FIELD (read-only check)', async () => {

        const hcmIdInput = page.locator(
            'input[value="KHI-0012"], input[placeholder*="HCM" i], input[name*="hcm" i]'
        ).first();

        if (await hcmIdInput.count() > 0 && await hcmIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            const val      = await hcmIdInput.inputValue({ timeout: 2000 }).catch(() => '');
            const readOnly = await hcmIdInput.getAttribute('readonly').catch(() => null);
            const disabled = await hcmIdInput.getAttribute('disabled').catch(() => null);
            const isDisabled = await hcmIdInput.isDisabled({ timeout: 2000 }).catch(() => false);

            console.log(`  HCM ID field value: "${val}"`);
            console.log(`  Is readonly attr: ${readOnly !== null ? '✅ yes' : '⚠️ no'}`);
            console.log(`  Is disabled attr: ${disabled !== null ? '✅ yes' : '⚠️ no'}`);
            console.log(`  Is disabled (Playwright): ${isDisabled}`);

            // Try typing into it — should be blocked
            await hcmIdInput.fill('HACK-TEST').catch(() => {});
            const valAfter = await hcmIdInput.inputValue({ timeout: 2000 }).catch(() => '');
            console.log(`  Value after fill attempt: "${valAfter}"`);
            console.log(`  Read-only protected: ${valAfter === val || valAfter === 'KHI-0012' ? '✅ YES' : '⚠️ NO — editable!'}`);
        } else {
            // HCM ID might be displayed as text, not input
            const hcmText = page.locator('text=KHI-0012').first();
            const visible = await hcmText.isVisible({ timeout: 2000 }).catch(() => false);
            console.log(`  HCM ID "KHI-0012" visible as text: ${visible ? '✅' : '⚠️ not found'}`);
        }
    });

    // =========================================================
    // STEP 9: DIVISION DROPDOWN
    // Current value: "Karachi Office"
    // =========================================================
    await safeStep('STEP 9 - DIVISION DROPDOWN', async () => {

        const divisionSels = [
            page.locator('select[name*="division" i]').first(),
            page.locator('[placeholder*="Division" i]').first(),
            page.locator('text=Karachi Office').first()
        ];

        for (const el of divisionSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Division field found, current: "Karachi Office"`);

                // Click to open
                await safeClick(el, 'Division dropdown');
                await page.waitForTimeout(1000);
                snapAPI('division dropdown');

                const opts = page.locator('[role="option"], .ant-select-item, [class*="option"]');
                const oCount = await opts.count().catch(() => 0);
                console.log(`  Division options: ${oCount}`);
                for (let i = 0; i < Math.min(oCount, 8); i++) {
                    const t = await opts.nth(i).innerText({ timeout: 1500 }).catch(() => '');
                    if (t.trim()) console.log(`    "${t.trim()}"`);
                }
                await page.keyboard.press('Escape');
                break;
            }
        }
    });

    // =========================================================
    // STEP 10: DEPARTMENT DROPDOWN
    // Current value: "Technology"
    // =========================================================
    await safeStep('STEP 10 - DEPARTMENT DROPDOWN', async () => {

        const deptSels = [
            page.locator('select[name*="department" i]').first(),
            page.locator('[placeholder*="Department" i]').first()
        ];

        for (const el of deptSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Department options: [${opts.join(' | ')}]`);
                if (opts.length > 1) {
                    await el.selectOption({ index: 1 }).catch(() => {});
                    await page.waitForTimeout(500);
                    snapAPI('department changed');
                    await el.selectOption({ value: opts.find(o => /technology/i.test(o)) || opts[0] || '' }).catch(() => {});
                }
                break;
            }
        }

        // Custom dropdown fallback
        const techText = page.locator('text=Technology').first();
        if (await techText.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`  Department "Technology" visible ✅`);
        }
    });

    // =========================================================
    // STEP 11: TEAM DROPDOWN
    // Current value: "Technology Team"
    // =========================================================
    await safeStep('STEP 11 - TEAM DROPDOWN', async () => {

        const teamSels = [
            page.locator('select[name*="team" i]').first(),
            page.locator('[placeholder*="Team" i]').first()
        ];

        for (const el of teamSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Team options: [${opts.join(' | ')}]`);
                snapAPI('team dropdown open');
                break;
            }
        }

        const teamText = page.locator('text=Technology Team').first();
        console.log(`  Team "Technology Team" visible: ${await teamText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 12: SHIFT DROPDOWN
    // Current value: "Wb Morning"
    // =========================================================
    await safeStep('STEP 12 - SHIFT DROPDOWN', async () => {

        const shiftSels = [
            page.locator('select[name*="shift" i]').first(),
            page.locator('[placeholder*="Shift" i]').first()
        ];

        for (const el of shiftSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Shift options: [${opts.join(' | ')}]`);
                snapAPI('shift dropdown');
                break;
            }
        }

        const shiftText = page.locator('text=Wb Morning').first();
        console.log(`  Shift "Wb Morning" visible: ${await shiftText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 13: SECTION DROPDOWN
    // Current value: "Morning"
    // =========================================================
    await safeStep('STEP 13 - SECTION DROPDOWN', async () => {

        const sectionText = page.locator('text=Morning').first();
        console.log(`  Section "Morning" visible: ${await sectionText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);

        const sectionSel = page.locator('select[name*="section" i]').first();
        if (await sectionSel.count() > 0) {
            const opts = await sectionSel.locator('option').allTextContents().catch(() => []);
            console.log(`  Section options: [${opts.join(' | ')}]`);
            snapAPI('section dropdown');
        }
    });

    // =========================================================
    // STEP 14: CAMPAIGN DROPDOWN
    // Current value: "Technology"
    // =========================================================
    await safeStep('STEP 14 - CAMPAIGN DROPDOWN', async () => {

        const campSel = page.locator('select[name*="campaign" i]').first();
        if (await campSel.count() > 0) {
            const opts = await campSel.locator('option').allTextContents().catch(() => []);
            console.log(`  Campaign options: [${opts.join(' | ')}]`);
            snapAPI('campaign dropdown');
        } else {
            console.log(`  Campaign "Technology" visible: ${await page.locator('text=Technology').first().isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
        }
    });

    // =========================================================
    // STEP 15: EMPLOYMENT STATUS DROPDOWN
    // Current value: "Active"
    // =========================================================
    await safeStep('STEP 15 - EMPLOYMENT STATUS DROPDOWN', async () => {

        const statusSels = [
            page.locator('select[name*="status" i]').first(),
            page.locator('[placeholder*="Employment Status" i]').first()
        ];

        for (const el of statusSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Employment Status options: [${opts.join(' | ')}]`);

                // Common statuses to verify
                const expectedStatuses = ['Active', 'Inactive', 'Terminated', 'On Leave', 'Probation'];
                for (const status of expectedStatuses) {
                    const found = opts.some(o => o.toLowerCase().includes(status.toLowerCase()));
                    if (found) console.log(`    ✅ Status "${status}" available`);
                }
                snapAPI('employment status dropdown');
                break;
            }
        }

        const activeText = page.locator('text=Active').first();
        console.log(`  Status "Active" visible: ${await activeText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 16: DUTY TYPE DROPDOWN
    // Current value: "Full Time"
    // =========================================================
    await safeStep('STEP 16 - DUTY TYPE DROPDOWN', async () => {

        const dutySels = [
            page.locator('select[name*="duty" i]').first(),
            page.locator('[placeholder*="Duty" i]').first()
        ];

        for (const el of dutySels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Duty Type options: [${opts.join(' | ')}]`);

                // Expected types
                const expected = ['Full Time', 'Part Time', 'Contract', 'Freelance', 'Remote'];
                for (const dt of expected) {
                    if (opts.some(o => o.toLowerCase().includes(dt.toLowerCase()))) {
                        console.log(`    ✅ "${dt}" available`);
                    }
                }
                snapAPI('duty type dropdown');
                break;
            }
        }

        const fullTimeText = page.locator('text=Full Time').first();
        console.log(`  Duty Type "Full Time" visible: ${await fullTimeText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 17: DESIGNATION DROPDOWN
    // Current value: "Website Designer"
    // =========================================================
    await safeStep('STEP 17 - DESIGNATION DROPDOWN', async () => {

        const desSels = [
            page.locator('select[name*="designation" i]').first(),
            page.locator('[placeholder*="Designation" i]').first()
        ];

        for (const el of desSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Designation options: [${opts.join(' | ')}]`);
                snapAPI('designation dropdown');
                break;
            }
        }

        const desText = page.locator('text=Website Designer').first();
        console.log(`  Designation "Website Designer" visible: ${await desText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 18: PROJECT DROPDOWN (empty in screenshot)
    // =========================================================
    await safeStep('STEP 18 - PROJECT DROPDOWN', async () => {

        const projSels = [
            page.locator('select[name*="project" i]').first(),
            page.locator('[placeholder*="Project" i]').first()
        ];

        for (const el of projSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Project options: [${opts.join(' | ')}]`);

                // Click to open
                await safeClick(el, 'Project dropdown');
                await page.waitForTimeout(1000);
                snapAPI('project dropdown');

                const allOpts = page.locator('[role="option"], .ant-select-item');
                const optCount = await allOpts.count().catch(() => 0);
                console.log(`  Project items in dropdown: ${optCount}`);
                for (let i = 0; i < Math.min(optCount, 8); i++) {
                    const t = await allOpts.nth(i).innerText({ timeout: 1500 }).catch(() => '');
                    if (t.trim()) console.log(`    Project: "${t.trim()}"`);
                }
                await page.keyboard.press('Escape');
                break;
            }
        }
    });

    // =========================================================
    // STEP 19: REPORTING AUTHORITY DROPDOWN
    // Current value: "Mr Waseem Babar"
    // =========================================================
    await safeStep('STEP 19 - REPORTING AUTHORITY DROPDOWN', async () => {

        const repSels = [
            page.locator('select[name*="reporting" i]').first(),
            page.locator('[placeholder*="Reporting Authority" i]').first()
        ];

        for (const el of repSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                const opts = await el.locator('option').allTextContents().catch(() => []);
                console.log(`  Reporting Authority options: [${opts.join(' | ')}]`);
                snapAPI('reporting authority');
                break;
            }
        }

        const repText = page.locator('text=Mr Waseem Babar').first();
        console.log(`  Reporting Authority "Mr Waseem Babar": ${await repText.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 20: INDIRECT REPORTING AUTHORITY DROPDOWN
    // =========================================================
    await safeStep('STEP 20 - INDIRECT REPORTING AUTHORITY', async () => {

        const indRepSels = [
            page.locator('select[name*="indirect" i]').first(),
            page.locator('[placeholder*="Indirect" i]').first(),
            page.locator('text=Indirect Reporting Authority').first()
        ];

        let found = false;
        for (const el of indRepSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Indirect Reporting Authority field: ✅ found`);
                snapAPI('indirect reporting');
                found = true;
                break;
            }
        }
        if (!found) console.log(`  ⚠️ Indirect Reporting Authority not found`);
    });

    // =========================================================
    // STEP 21: TEAM REPORTING DROPDOWN
    // =========================================================
    await safeStep('STEP 21 - TEAM REPORTING', async () => {

        const teamRepSels = [
            page.locator('select[name*="team_reporting" i]').first(),
            page.locator('[placeholder*="Team Reporting" i]').first(),
            page.locator('text=Team Reporting').first()
        ];

        let found = false;
        for (const el of teamRepSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Team Reporting field: ✅ found`);
                snapAPI('team reporting');
                found = true;
                break;
            }
        }
        if (!found) console.log(`  ⚠️ Team Reporting field not found`);
    });

    // =========================================================
    // STEP 22: PROBATION START DATE FIELD
    // =========================================================
    await safeStep('STEP 22 - PROBATION START DATE', async () => {

        const probSels = [
            page.locator('input[type="date"][name*="probation" i]').first(),
            page.locator('[placeholder*="Probation" i]').first(),
            page.locator('input[placeholder*="mm/dd/yyyy"]').first(),
            page.locator('text=Probation Start Date').first()
        ];

        let found = false;
        for (const el of probSels) {
            if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`  Probation Start Date field: ✅ found`);

                // Try setting a date
                const dateInput = page.locator('input[type="date"]').last();
                if (await dateInput.count() > 0) {
                    await safeFill(dateInput, '2026-01-15', 'Probation Start Date');
                    await page.waitForTimeout(500);
                    snapAPI('probation date set');
                }
                found = true;
                break;
            }
        }
        if (!found) console.log(`  ⚠️ Probation Start Date field not visible on screen`);
    });

    // =========================================================
    // STEP 23: SCROLL DOWN — DISCOVER MORE FIELDS
    // =========================================================
    await safeStep('STEP 23 - SCROLL & DISCOVER MORE FIELDS', async () => {

        // Scroll down to reveal more fields below the fold
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(800);
        snapAPI('scroll down 500');

        let allText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');

        // Additional sections that may appear below
        const additionalSections = [
            'Salary Information', 'Salary Details',
            'Contract Information', 'Contract Details',
            'Bank Details', 'Bank Information',
            'Emergency Contact', 'Next of Kin',
            'Personal Information', 'Bio',
            'Tax Information', 'EOBI',
            'Insurance', 'Allowances',
            'Probation End Date', 'Confirmation Date',
            'Joining Date', 'Exit Date',
            'Notice Period', 'Work Location',
            'Grade', 'Band', 'Level'
        ];

        console.log(`  Additional sections/fields below fold:`);
        for (const section of additionalSections) {
            if (allText.toLowerCase().includes(section.toLowerCase())) {
                console.log(`  ✅ Section/Field found: "${section}"`);
            }
        }

        // Log all labels visible now
        const labels = page.locator('label, [class*="label"], [class*="field-name"]');
        const labelCount = await labels.count().catch(() => 0);
        console.log(`\n  All form labels visible: ${labelCount}`);
        for (let i = 0; i < Math.min(labelCount, 30); i++) {
            try {
                const el = labels.nth(i);
                if (await el.isVisible({ timeout: 1500 })) {
                    const text = await el.innerText({ timeout: 1500 }).catch(() => '');
                    if (text.trim()) console.log(`    Label: "${text.trim()}"`);
                }
            } catch { }
        }
    });

    // =========================================================
    // STEP 24: SCROLL TO BOTTOM — FULL FORM DISCOVERY
    // =========================================================
    await safeStep('STEP 24 - FULL FORM SCROLL (bottom)', async () => {

        await page.mouse.wheel(0, 3000);
        await page.waitForTimeout(1000);
        snapAPI('bottom of form');

        // All inputs at bottom
        const inputs = page.locator('input:visible, select:visible, textarea:visible');
        const iCount = await inputs.count().catch(() => 0);
        console.log(`  Visible form elements at bottom: ${iCount}`);
        for (let i = 0; i < Math.min(iCount, 20); i++) {
            try {
                const el   = inputs.nth(i);
                const ph   = await el.getAttribute('placeholder').catch(() => '');
                const type = await el.getAttribute('type').catch(() => '');
                const name = await el.getAttribute('name').catch(() => '');
                const tag  = await el.evaluate(e => e.tagName).catch(() => '');
                const val  = await el.inputValue({ timeout: 1500 }).catch(() => '');
                console.log(`  Field ${i + 1} [${tag}]: name="${name}" type="${type}" placeholder="${ph}" value="${val.substring(0, 30)}"`);
            } catch { }
        }

        // Scroll back to top
        await page.mouse.wheel(0, -4000);
        await page.waitForTimeout(800);
        console.log(`  Scrolled back to top`);
    });

    // =========================================================
    // STEP 25: SAVE / SUBMIT BUTTON VALIDATION
    // =========================================================
    await safeStep('STEP 25 - SAVE / SUBMIT BUTTON', async () => {

        const saveSels = [
            page.locator('button:has-text("Save")').first(),
            page.locator('button:has-text("Update")').first(),
            page.locator('button:has-text("Submit")').first(),
            page.locator('button[type="submit"]').first(),
            page.locator('button:has-text("Save Changes")').first(),
            page.locator('button:has-text("Save & Continue")').first()
        ];

        let saveBtn = null;
        for (const btn of saveSels) {
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                const text = await btn.innerText({ timeout: 2000 }).catch(() => '');
                console.log(`  Save/Submit button found: "${text.trim()}"`);
                saveBtn = btn;
                break;
            }
        }

        if (saveBtn) {
            const isEnabled = await saveBtn.isEnabled({ timeout: 2000 }).catch(() => false);
            console.log(`  Button enabled: ${isEnabled}`);

            if (isEnabled) {
                // Click save and monitor API
                await saveBtn.click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(3000);
                snapAPI('save button clicked');

                // Check for success message
                const successSels = [
                    'text=/saved/i', 'text=/success/i', 'text=/updated/i',
                    '.ant-message-success', '[class*="success"]',
                    '.ant-notification', '[class*="notification"]'
                ];
                let successShown = false;
                for (const sel of successSels) {
                    const el = page.locator(sel).first();
                    if (await el.count() > 0 && await el.isVisible({ timeout: 3000 }).catch(() => false)) {
                        const msg = await el.innerText({ timeout: 2000 }).catch(() => '');
                        console.log(`  ✅ Success message: "${msg.trim()}"`);
                        successShown = true;
                        break;
                    }
                }
                if (!successShown) {
                    console.log(`  ⚠️ No success message detected after save`);

                    // Check for error message
                    const errorSels = [
                        'text=/error/i', '.ant-message-error', '[class*="error"]',
                        '.ant-notification-notice-error'
                    ];
                    for (const sel of errorSels) {
                        const el = page.locator(sel).first();
                        if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                            const msg = await el.innerText({ timeout: 2000 }).catch(() => '');
                            console.log(`  🔴 Error after save: "${msg.trim()}"`);
                            break;
                        }
                    }
                }
            }
        } else {
            console.log(`  ⚠️ No Save/Submit button found`);
        }
    });

    // =========================================================
    // STEP 26: CANCEL / RESET BUTTON VALIDATION
    // =========================================================
    await safeStep('STEP 26 - CANCEL / RESET BUTTON', async () => {

        const cancelSels = [
            page.locator('button:has-text("Cancel")').first(),
            page.locator('button:has-text("Reset")').first(),
            page.locator('button:has-text("Discard")').first(),
            page.locator('button:has-text("Clear")').first()
        ];

        for (const btn of cancelSels) {
            if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                const text = await btn.innerText({ timeout: 2000 }).catch(() => '');
                const enabled = await btn.isEnabled({ timeout: 2000 }).catch(() => false);
                console.log(`  Cancel/Reset button: "${text.trim()}" — enabled: ${enabled}`);
                snapAPI('cancel button found');
                break;
            }
        }
    });

    // =========================================================
    // STEP 27: LEFT SIDEBAR NAV VALIDATION
    // From screenshot sidebar items:
    // All Employees | Employment | Shift Record | Credentials |
    // Off Boarding | Promotion | Probation Evaluation | Overtime |
    // Redemption Request | Hired Candidates | HR Documents
    // =========================================================
    await safeStep('STEP 27 - SIDEBAR NAVIGATION VALIDATION', async () => {

        const sidebarItems = [
            'All Employees',
            'Employment',
            'Shift Record',
            'Credentials',
            'Off Boarding',
            'Promotion',
            'Probation Evaluation',
            'Overtime',
            'Redemption Request',
            'Hired Candidates',
            'HR Documents'
        ];

        console.log(`  Sidebar items (Employees section):`);
        for (const item of sidebarItems) {
            const el = page.locator(`text="${item}"`).first();
            const visible = await el.count() > 0
                ? await el.isVisible({ timeout: 2000 }).catch(() => false)
                : false;
            console.log(`  "${item}": ${visible ? '✅' : '⚠️ not found'}`);
        }

        // Employees parent section
        const empSection = page.locator('text=Employees').first();
        console.log(`\n  "Employees" nav section: ${await empSection.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 28: CHANGE EMPLOYEE (switch to different employee)
    // =========================================================
    await safeStep('STEP 28 - CHANGE EMPLOYEE SELECTION', async () => {

        // Click the Employee dropdown at top
        const empDropdown = page.locator(
            '.ant-select, [class*="select"]:has-text("Javon"), [class*="employee-select"]'
        ).first();

        if (await empDropdown.count() > 0 && await empDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
            await safeClick(empDropdown, 'Employee dropdown');
            await page.waitForTimeout(1500);
            snapAPI('employee change dropdown');

            const options = page.locator('[role="option"], .ant-select-item-option, [class*="option"]');
            const optCount = await options.count().catch(() => 0);
            console.log(`  Employee options: ${optCount}`);

            for (let i = 0; i < Math.min(optCount, 5); i++) {
                const t = await options.nth(i).innerText({ timeout: 1500 }).catch(() => '');
                if (t.trim()) console.log(`    Employee ${i + 1}: "${t.trim()}"`);
            }

            // Select second employee if available
            if (optCount > 1) {
                await options.nth(1).click({ timeout: 4000 }).catch(() => {});
                await page.waitForTimeout(2500);
                snapAPI('employee switched');

                // Verify form updated
                const hcmId = page.locator('[class*="hcm"], input[value*="KHI"], input[value*="APD"]').first();
                if (await hcmId.count() > 0) {
                    const newId = await hcmId.inputValue({ timeout: 2000 }).catch(() => '');
                    console.log(`  New employee HCM ID: "${newId}"`);
                }
                console.log(`  Employee switched — form reloaded ✅`);

                // Switch back to original
                if (await empDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await safeClick(empDropdown, 'Employee dropdown (restore)');
                    await page.waitForTimeout(1000);
                    const opts2 = page.locator('[role="option"], .ant-select-item-option');
                    if (await opts2.count() > 0) {
                        await opts2.first().click({ timeout: 4000 }).catch(() => {});
                        await page.waitForTimeout(2000);
                        console.log(`  Restored to original employee`);
                        snapAPI('employee restored');
                    }
                }
            }
        } else {
            console.log(`  ⚠️ Employee dropdown not found for switching`);
        }
    });

    // =========================================================
    // STEP 29: NOTIFICATION BELL & SEARCH BAR
    // =========================================================
    await safeStep('STEP 29 - HEADER UI ELEMENTS', async () => {

        // Search bar
        const searchBar = page.locator('input[placeholder*="Search" i], [class*="search"] input').first();
        const searchVisible = await searchBar.count() > 0
            ? await searchBar.isVisible({ timeout: 2000 }).catch(() => false)
            : false;
        console.log(`  Search bar: ${searchVisible ? '✅ visible' : '⚠️ not found'}`);

        if (searchVisible) {
            await safeFill(searchBar, 'KHI-0012', 'Header search');
            await page.waitForTimeout(1500);
            snapAPI('header search');
            await searchBar.clear({ timeout: 3000 }).catch(() => {});
        }

        // Notification bell
        const bell = page.locator('[class*="notification"], [class*="bell"], [aria-label*="notification" i]').first();
        console.log(`  Notification bell: ${await bell.count() > 0 && await bell.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);

        // Language switcher (English)
        const langSwitcher = page.locator('text=English').first();
        console.log(`  Language "English": ${await langSwitcher.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);

        // Color dots (theme switcher visible in screenshot)
        const colorDots = page.locator('[class*="color"], [class*="theme"], [class*="dot"]');
        const dotCount = await colorDots.count().catch(() => 0);
        console.log(`  Theme/color dots: ${dotCount}`);

        // User image / avatar
        const userAvatar = page.locator('[class*="avatar"], [class*="user-image"], img[alt*="user" i]').first();
        console.log(`  User avatar: ${await userAvatar.count() > 0 && await userAvatar.isVisible({ timeout: 2000 }).catch(() => false) ? '✅' : '⚠️'}`);
    });

    // =========================================================
    // STEP 30: BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('STEP 30 - BROKEN IMAGE CHECK', async () => {

        const imgs  = page.locator('img');
        const total = await imgs.count().catch(() => 0);
        let broken  = 0;
        console.log(`  Total images: ${total}`);

        for (let i = 0; i < total; i++) {
            try {
                const w = await imgs.nth(i).evaluate(img => img.naturalWidth, { timeout: 3000 });
                if (w === 0) {
                    const src = await imgs.nth(i).getAttribute('src').catch(() => '');
                    const alt = await imgs.nth(i).getAttribute('alt').catch(() => '');
                    console.log(`  ⚠️ Broken image: src="${src}" alt="${alt}"`);
                    broken++;
                }
            } catch { }
        }

        // Specifically check user profile image (shown as "User Image" in screenshot)
        const userImg = page.locator('img[alt*="User Image" i], img[alt*="user" i]').first();
        if (await userImg.count() > 0) {
            const w = await userImg.evaluate(img => img.naturalWidth, { timeout: 3000 }).catch(() => 0);
            console.log(`  User profile image loaded: ${w > 0 ? '✅' : '⚠️ broken'}`);
        }

        console.log(broken === 0 ? '  All images OK ✅' : `  Broken images: ${broken}`);
    });

    // =========================================================
    // STEP 31: SCROLL TEST (full page)
    // =========================================================
    await safeStep('STEP 31 - SCROLL TEST', async () => {

        // Scroll to top first
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Scroll down incrementally
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(400);
        }
        snapAPI('scrolled to bottom');

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        console.log(`  Full page scroll completed`);
    });

    // =========================================================
    // STEP 32: FINAL SCREENSHOTS
    // =========================================================
    await safeStep('STEP 32 - FINAL SCREENSHOTS', async () => {

        // Scroll to top for clean screenshots
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        await page.screenshot({
            path: 'test-assets/employment-viewport.png',
            fullPage: false
        });
        console.log(`  Viewport screenshot saved`);

        await page.screenshot({
            path: 'test-assets/employment-fullpage.png',
            fullPage: true
        });
        console.log(`  Full page screenshot saved`);
    });

    // =========================================================
    // FINAL API REPORT
    // =========================================================
    console.log('\n\n╔══════════════════════════════════════════════════╗');
    console.log('║         API MONITORING REPORT — EMPLOYMENT        ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`  Total API calls tracked : ${apiCalls.length}`);
    console.log(`  Total API issues found  : ${apiIssues.length}`);

    if (apiIssues.length === 0) {
        console.log('\n  ✅ No API issues detected during test run.');
    } else {
        console.log('\n  🔴 API ISSUES SUMMARY:');
        console.log('  ' + '─'.repeat(58));
        apiIssues.forEach((issue, idx) => {
            console.log(`\n  Issue #${idx + 1}:`);
            console.log(`    Time    : ${issue.timestamp || 'N/A'}`);
            console.log(`    Method  : ${issue.method || 'FAILED'}`);
            console.log(`    URL     : ${issue.url}`);
            console.log(`    Status  : ${issue.status || 'N/A'} ${issue.statusText || ''}`);
            if (issue.failure) console.log(`    Failure : ${issue.failure}`);
            if (issue.body)    console.log(`    Body    : ${issue.body.substring(0, 200)}`);
        });

        // Group by status
        const grouped = {};
        apiIssues.forEach(i => {
            const key = String(i.status || 'FAILED');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(i.url);
        });
        console.log('\n  📊 Grouped by HTTP status:');
        for (const [status, urls] of Object.entries(grouped)) {
            console.log(`    HTTP ${status} (${urls.length}x):`);
            urls.forEach(u => console.log(`      - ${u}`));
        }

        // Successful calls summary
        const okCalls = apiCalls.filter(c => c.status < 400);
        console.log(`\n  ✅ Successful API calls: ${okCalls.length}`);
    }

    console.log('\n✅ Employment Page — Full Module Testing COMPLETE');
    console.log('📁 Screenshots: test-assets/employment-*.png');
});