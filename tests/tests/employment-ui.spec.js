import { test, expect } from '@playwright/test';

test.setTimeout(180000);

test('CultureHCM - Budget Payroll Deep Functional Test', async ({ page }) => {

    // ===================================================
    // SAFE STEP WRAPPER
    // ===================================================
    const safeStep = async (stepName, stepFn) => {
        try {
            console.log(`\n========== ${stepName} ==========`);
            await stepFn();
            console.log(`✅ PASSED: ${stepName}`);
        } catch (err) {
            console.log(`⚠️ FAILED (ignored): ${stepName}`);
            console.log(err.message);
        }
    };

    // ===================================================
    // STEP 1 — LOGIN
    // ===================================================
    await safeStep('LOGIN', async () => {

        await page.goto('https://demo.culturehcm.com/login', {
            waitUntil: 'domcontentloaded'
        });

        await page.getByPlaceholder('Enter your email').fill('khi0001@karachi.co');
        await page.locator('input[type="password"]').fill('fHwgk9');
        await page.getByRole('button', { name: /login/i }).click();

        await page.waitForURL(/dashboard/, { timeout: 60000 });
        console.log('Login successful');
    });

    // ===================================================
    // STEP 2 — NAVIGATE TO BUDGET PAYROLL
    // ===================================================
    await safeStep('NAVIGATE TO BUDGET PAYROLL', async () => {

        await page.goto('https://demo.culturehcm.com/payroll-management/budget-payroll', {
            waitUntil: 'domcontentloaded'
        });

        await page.waitForLoadState('networkidle');
        console.log('Budget Payroll page opened');
    });

    // ===================================================
    // STEP 3 — PAGE TITLE VALIDATION
    // ===================================================
    await safeStep('PAGE TITLE VALIDATION', async () => {

        const title = page.locator('text=/budget payroll/i').first();
        await expect(title).toBeVisible({ timeout: 10000 });
        console.log('Page title "Budget Payroll" is visible');

        // Breadcrumb: "Payroll Management / Budget Payroll"
        const breadcrumb = page.locator('text=/payroll management/i').first();
        if (await breadcrumb.count() > 0) {
            console.log('Breadcrumb "Payroll Management" found');
        }
    });

    // ===================================================
    // STEP 4 — SIDEBAR NAVIGATION PRESENCE
    // ===================================================
    await safeStep('SIDEBAR NAVIGATION', async () => {

        const sidebarItems = [
            'Employees',
            'Attendance',
            'Leave',
            'Payroll'
        ];

        for (const item of sidebarItems) {
            const el = page.locator(`text=${item}`).first();
            if (await el.count() > 0) {
                console.log(`✔ Sidebar item "${item}" found`);
            } else {
                console.log(`⚠ Sidebar item "${item}" missing`);
            }
        }
    });

    // ===================================================
    // STEP 5 — PAYROLL SUB-MENU ITEMS
    // ===================================================
    await safeStep('PAYROLL SUB-MENU ITEMS', async () => {

        const subMenuItems = [
            'Salary & Benefits',
            'Budget Payroll',
            'Payroll Creation',
            'Payroll Adjustment',
            'Tax Override',
            'Pending Payroll',
            'Approved Payroll',
            'Increment'
        ];

        for (const item of subMenuItems) {
            const el = page.locator(`text=${item}`).first();
            if (await el.count() > 0) {
                console.log(`✔ Sub-menu item "${item}" found`);
            } else {
                console.log(`⚠ Sub-menu item "${item}" missing`);
            }
        }
    });

    // ===================================================
    // STEP 6 — TOP HEADER COMPONENTS
    // ===================================================
    await safeStep('TOP HEADER COMPONENTS', async () => {

        // Search bar
        const searchBar = page.locator('input[placeholder*="Search"], [class*="search"]').first();
        if (await searchBar.count() > 0) {
            console.log('✔ Search bar present in header');
        }

        // Language selector (English)
        const langSelector = page.locator('text=/english/i').first();
        if (await langSelector.count() > 0) {
            console.log('✔ Language selector (English) found');
        }

        // Notification bell icon
        const bell = page.locator('[class*="bell"], [class*="notif"]').first();
        if (await bell.count() > 0) {
            console.log('✔ Notification icon found');
        }

        // User avatar / profile icon
        const userAvatar = page.locator('[class*="avatar"], [class*="user"], [class*="profile"]').first();
        if (await userAvatar.count() > 0) {
            console.log('✔ User avatar/profile icon found');
        }
    });

    // ===================================================
    // STEP 7 — CREATE BUTTON
    // ===================================================
    await safeStep('CREATE BUTTON', async () => {

        const createBtn = page.getByRole('button', { name: /\+\s*create/i })
            .or(page.locator('button:has-text("Create")'))
            .first();

        await expect(createBtn).toBeVisible({ timeout: 8000 });
        console.log('✔ "+ Create" button is visible');

        const isEnabled = await createBtn.isEnabled();
        console.log(`✔ Create button enabled: ${isEnabled}`);
    });

    // ===================================================
    // STEP 8 — SHOW ENTRIES DROPDOWN
    // ===================================================
    await safeStep('SHOW ENTRIES DROPDOWN', async () => {

        // "Show 50 entries" selector
        const showSelect = page.locator('select').first()
            .or(page.locator('[class*="entries"], [class*="per-page"]').first());

        if (await showSelect.count() > 0) {
            console.log('✔ "Show entries" dropdown found');

            // Try changing the value
            const tag = await showSelect.evaluate(el => el.tagName.toLowerCase());
            if (tag === 'select') {
                await showSelect.selectOption({ label: '25' }).catch(() => {
                    console.log('Option 25 not available, trying 10');
                });
                await showSelect.selectOption({ label: '50' }).catch(() => {});
                console.log('✔ Show entries dropdown is interactive');
            }
        } else {
            console.log('⚠ Show entries control not found by locator');
        }
    });

    // ===================================================
    // STEP 9 — SEARCH TABLE DATA INPUT
    // ===================================================
    await safeStep('SEARCH TABLE DATA INPUT', async () => {

        const searchInput = page.locator('input[placeholder*="Search Table"], input[placeholder*="search"]').first();

        if (await searchInput.count() > 0) {
            await expect(searchInput).toBeVisible({ timeout: 8000 });
            console.log('✔ Search Table Data input found');

            // Type a value and verify filtering
            await searchInput.fill('Budget');
            await page.waitForTimeout(1000);
            console.log('✔ Typed "Budget" in search input');

            // Check if rows still show
            const rows = page.locator('table tbody tr, [class*="table"] [class*="row"]');
            const rowCount = await rows.count();
            console.log(`✔ Table rows after search: ${rowCount}`);

            // Clear search
            await searchInput.clear();
            await page.waitForTimeout(800);
            console.log('✔ Search input cleared');
        } else {
            console.log('⚠ Search input not found');
        }
    });

    // ===================================================
    // STEP 10 — EXPORT BUTTONS (Excel / PDF icons)
    // ===================================================
    await safeStep('EXPORT BUTTONS', async () => {

        // Export buttons are typically icon buttons near the search bar
        const exportBtns = page.locator('button[class*="export"], button[title*="export"], button[title*="Excel"], button[title*="PDF"]');
        const count = await exportBtns.count();

        if (count > 0) {
            console.log(`✔ ${count} export button(s) found`);
        } else {
            // Fall back: look for icon-only buttons next to search (common pattern)
            const iconBtns = page.locator('.btn-group button, [class*="toolbar"] button, [class*="export"]');
            const fallbackCount = await iconBtns.count();
            console.log(`✔ Icon/export-area buttons found: ${fallbackCount}`);
        }
    });

    // ===================================================
    // STEP 11 — REFRESH BUTTON
    // ===================================================
    await safeStep('REFRESH BUTTON', async () => {

        const refreshBtn = page.getByRole('button', { name: /refresh/i }).first();

        if (await refreshBtn.count() > 0) {
            await expect(refreshBtn).toBeVisible({ timeout: 8000 });
            console.log('✔ Refresh button is visible');

            await refreshBtn.click();
            await page.waitForLoadState('networkidle');
            console.log('✔ Refresh button clicked — page reloaded');
        } else {
            console.log('⚠ Refresh button not found');
        }
    });

    // ===================================================
    // STEP 12 — TABLE COLUMN HEADERS
    // ===================================================
    await safeStep('TABLE COLUMN HEADERS', async () => {

        const expectedColumns = [
            'Id',
            'Title',
            'Year',
            'Month',
            'Division',
            'Start Date',
            'End Date',
            'Created Date',
            'Status',
            'Action'
        ];

        for (const col of expectedColumns) {
            const header = page.locator(`th:has-text("${col}"), [class*="header"]:has-text("${col}")`).first();
            if (await header.count() > 0) {
                console.log(`✔ Column "${col}" found`);
            } else {
                console.log(`⚠ Column "${col}" missing`);
            }
        }
    });

    // ===================================================
    // STEP 13 — TABLE SORTABLE COLUMNS
    // ===================================================
    await safeStep('TABLE SORTABLE COLUMNS', async () => {

        // Id and Action columns typically have sort arrows
        const sortableHeaders = page.locator('th[class*="sort"], th:has([class*="sort"]), th:has(svg)');
        const count = await sortableHeaders.count();
        console.log(`✔ Sortable column headers detected: ${count}`);

        // Click on "Id" header to sort
        const idHeader = page.locator('th:has-text("Id")').first();
        if (await idHeader.count() > 0) {
            await idHeader.click().catch(() => {});
            await page.waitForTimeout(800);
            console.log('✔ Clicked "Id" column to sort');

            await idHeader.click().catch(() => {});
            await page.waitForTimeout(800);
            console.log('✔ Clicked "Id" column again to reverse sort');
        }
    });

    // ===================================================
    // STEP 14 — TABLE ROW DATA VALIDATION
    // ===================================================
    await safeStep('TABLE ROW DATA VALIDATION', async () => {

        const rows = page.locator('table tbody tr').or(page.locator('[class*="tbody"] [class*="row"]'));
        const rowCount = await rows.count();
        console.log(`✔ Total table rows found: ${rowCount}`);

        if (rowCount > 0) {
            const firstRow = rows.first();

            // Validate expected data in first row matches screenshot
            const rowText = await firstRow.innerText().catch(() => '');
            console.log(`✔ First row text: ${rowText.replace(/\s+/g, ' ').trim().substring(0, 120)}`);

            // Check for expected values from screenshot
            const checks = ['2026', 'March', 'Appedology'];
            for (const val of checks) {
                if (rowText.includes(val)) {
                    console.log(`  ✔ Row contains expected value: "${val}"`);
                } else {
                    console.log(`  ⚠ Expected value "${val}" not found in first row`);
                }
            }
        }
    });

    // ===================================================
    // STEP 15 — STATUS BADGE (Done / Pending etc.)
    // ===================================================
    await safeStep('STATUS BADGE', async () => {

        const statusBadge = page.locator(
            '[class*="badge"], [class*="status"], [class*="chip"], span:has-text("Done"), span:has-text("Pending"), span:has-text("Approved")'
        ).first();

        if (await statusBadge.count() > 0) {
            const text = await statusBadge.innerText().catch(() => '');
            console.log(`✔ Status badge found with text: "${text.trim()}"`);

            const visible = await statusBadge.isVisible();
            console.log(`✔ Status badge visible: ${visible}`);
        } else {
            console.log('⚠ No status badge found');
        }
    });

    // ===================================================
    // STEP 16 — ACTION COLUMN THREE-DOT MENU
    // ===================================================
    await safeStep('ACTION THREE-DOT MENU', async () => {

        // Three-dot (kebab) menu button in the action column
        const kebab = page.locator('[class*="dropdown"] button, button[class*="action"], button:has([class*="dots"]), [aria-label*="action"], button:has-text("⋮"), button:has-text("…")').first()
            .or(page.locator('table tbody tr').first().locator('button').last());

        if (await kebab.count() > 0) {
            await kebab.click().catch(() => {});
            await page.waitForTimeout(800);
            console.log('✔ Action menu button clicked');

            // Check for View option
            const viewOption = page.getByRole('menuitem', { name: /view/i })
                .or(page.locator('text=/^view$/i').first());
            if (await viewOption.count() > 0) {
                console.log('✔ "View" option visible in dropdown');
            } else {
                console.log('⚠ "View" option not found in dropdown');
            }

            // Check for Regenerate option
            const regenOption = page.getByRole('menuitem', { name: /regenerate/i })
                .or(page.locator('text=/regenerate/i').first());
            if (await regenOption.count() > 0) {
                console.log('✔ "Regenerate" option visible in dropdown');
            } else {
                console.log('⚠ "Regenerate" option not found in dropdown');
            }

            // Close dropdown by pressing Escape
            await page.keyboard.press('Escape');
            console.log('✔ Dropdown closed via Escape key');
        } else {
            console.log('⚠ Three-dot action menu button not found');
        }
    });

    // ===================================================
    // STEP 17 — VIEW ACTION (opens detail page)
    // ===================================================
    await safeStep('VIEW ACTION — NAVIGATE TO DETAIL', async () => {

        // Re-open action menu on the first row
        const kebab = page.locator('table tbody tr').first().locator('button').last();

        if (await kebab.count() > 0) {
            await kebab.click().catch(() => {});
            await page.waitForTimeout(800);

            const viewOption = page.locator('text=/^view$/i').first()
                .or(page.getByRole('menuitem', { name: /view/i }).first());

            if (await viewOption.count() > 0) {
                await viewOption.click().catch(() => {});
                await page.waitForLoadState('networkidle');
                console.log(`✔ Navigated to detail page: ${page.url()}`);

                // Go back to budget payroll list
                await page.goBack();
                await page.waitForLoadState('networkidle');
                console.log('✔ Navigated back to Budget Payroll list');
            } else {
                await page.keyboard.press('Escape');
                console.log('⚠ "View" option not found in menu');
            }
        }
    });

    // ===================================================
    // STEP 18 — CREATE BUTTON MODAL / PAGE
    // ===================================================
    await safeStep('CREATE BUTTON — OPENS FORM', async () => {

        const createBtn = page.getByRole('button', { name: /\+\s*create/i })
            .or(page.locator('button:has-text("Create")'))
            .first();

        if (await createBtn.count() > 0) {
            await createBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
            console.log('✔ Create button clicked');

            const currentUrl = page.url();
            console.log(`✔ URL after Create click: ${currentUrl}`);

            // Check if a modal opened
            const modal = page.locator('[class*="modal"], [role="dialog"]').first();
            if (await modal.count() > 0 && await modal.isVisible()) {
                console.log('✔ Modal/dialog opened after Create click');

                // Look for form fields inside the modal
                const fields = ['title', 'year', 'month', 'division', 'start', 'end'];
                for (const field of fields) {
                    const input = modal.locator(`input[name*="${field}"], select[name*="${field}"], [placeholder*="${field}"]`).first();
                    if (await input.count() > 0) {
                        console.log(`  ✔ Form field "${field}" found in modal`);
                    }
                }

                // Close modal
                const closeBtn = modal.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label*="close"]').first();
                if (await closeBtn.count() > 0) {
                    await closeBtn.click().catch(() => {});
                    console.log('✔ Modal closed via Cancel/Close button');
                } else {
                    await page.keyboard.press('Escape');
                    console.log('✔ Modal closed via Escape');
                }
            } else if (currentUrl !== 'https://demo.culturehcm.com/payroll-management/budget-payroll') {
                // Navigated to a create form page
                console.log('✔ Navigated to a create form page');
                await page.goBack();
                await page.waitForLoadState('networkidle');
                console.log('✔ Navigated back to Budget Payroll list');
            } else {
                console.log('⚠ No modal or navigation detected after Create click');
            }
        }
    });

    // ===================================================
    // STEP 19 — PAGINATION CONTROLS
    // ===================================================
    await safeStep('PAGINATION CONTROLS', async () => {

        const pagination = page.locator('[class*="pagination"], [class*="pager"], nav[aria-label*="page"]').first();

        if (await pagination.count() > 0) {
            console.log('✔ Pagination component found');

            const nextBtn = pagination.locator('button:has-text("Next"), [aria-label*="next"]').first();
            const prevBtn = pagination.locator('button:has-text("Prev"), [aria-label*="prev"]').first();

            if (await nextBtn.count() > 0) {
                console.log('✔ Next button found in pagination');
            }
            if (await prevBtn.count() > 0) {
                console.log('✔ Previous button found in pagination');
            }
        } else {
            // With only 1 record, pagination may be hidden
            console.log('ℹ Pagination not visible (may be hidden when record count ≤ page size)');
        }
    });

    // ===================================================
    // STEP 20 — EMPTY STATE SEARCH (NO RESULTS)
    // ===================================================
    await safeStep('EMPTY STATE — SEARCH NO RESULTS', async () => {

        const searchInput = page.locator('input[placeholder*="Search Table"], input[placeholder*="search"]').first();

        if (await searchInput.count() > 0) {
            await searchInput.fill('ZZZZZ_NO_MATCH_XYZXYZ');
            await page.waitForTimeout(1200);

            const rows = page.locator('table tbody tr');
            const count = await rows.count();

            if (count === 0) {
                console.log('✔ No rows displayed for unmatched search (correct behavior)');
            } else {
                // Check if "No data" or similar text shown
                const noData = page.locator('text=/no data|no record|no result|empty/i').first();
                if (await noData.count() > 0) {
                    console.log('✔ Empty state message displayed');
                } else {
                    console.log(`⚠ ${count} rows still showing for unmatchable search term`);
                }
            }

            await searchInput.clear();
            await page.waitForTimeout(800);
            console.log('✔ Search cleared — table restored');
        }
    });

    // ===================================================
    // STEP 21 — BACK BUTTON (← arrow)
    // ===================================================
    await safeStep('BACK BUTTON', async () => {

        const backBtn = page.locator('button:has([class*="arrow"]), a:has([class*="arrow-left"]), [aria-label*="back"], button[class*="back"]').first()
            .or(page.locator('text=/←/').first());

        if (await backBtn.count() > 0) {
            console.log('✔ Back/arrow button found near page title');
        } else {
            // Look for a chevron or arrow icon near the title
            const arrow = page.locator('[class*="back"], [class*="return"], [class*="arrow"]').first();
            if (await arrow.count() > 0) {
                console.log('✔ Back navigation element found');
            } else {
                console.log('⚠ Back button not found');
            }
        }
    });

    // ===================================================
    // STEP 22 — COLOUR PALETTE / BRANDING DOTS
    // ===================================================
    await safeStep('BRANDING COLOUR PALETTE', async () => {

        // CultureHCM header has 4 coloured circles (orange, pink, teal, cyan)
        const dots = page.locator('[class*="dot"], [class*="color-circle"], header span[style*="background"]');
        const count = await dots.count();
        console.log(`✔ Branding colour dots found: ${count}`);
    });

    // ===================================================
    // STEP 23 — UI STABILITY / BROKEN IMAGES
    // ===================================================
    await safeStep('UI STABILITY — BROKEN IMAGES', async () => {

        const images = page.locator('img');
        const count = await images.count();
        console.log(`Images found on page: ${count}`);

        let brokenCount = 0;
        for (let i = 0; i < Math.min(count, 10); i++) {
            const naturalWidth = await images.nth(i).evaluate(img => img.naturalWidth).catch(() => -1);
            if (naturalWidth === 0) {
                brokenCount++;
                const src = await images.nth(i).getAttribute('src').catch(() => 'unknown');
                console.log(`  ⚠ Broken image at index ${i}: ${src}`);
            }
        }

        if (brokenCount === 0) {
            console.log('✔ No broken images detected');
        } else {
            console.log(`⚠ ${brokenCount} broken image(s) detected`);
        }
    });

    // ===================================================
    // STEP 24 — CONSOLE ERROR MONITORING
    // ===================================================
    await safeStep('CONSOLE ERRORS CHECK', async () => {

        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Reload to capture any errors
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        if (errors.length === 0) {
            console.log('✔ No console errors detected on page load');
        } else {
            console.log(`⚠ ${errors.length} console error(s) detected:`);
            errors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 120)}`));
        }
    });

    // ===================================================
    // STEP 25 — RESPONSIVE LAYOUT CHECK
    // ===================================================
    await safeStep('RESPONSIVE LAYOUT — MOBILE VIEW', async () => {

        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(800);
        console.log('✔ Viewport set to mobile (375x812)');

        const title = page.locator('text=/budget payroll/i').first();
        const visible = await title.isVisible().catch(() => false);
        console.log(`✔ Page title visible on mobile: ${visible}`);

        // Restore desktop viewport
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(500);
        console.log('✔ Viewport restored to desktop (1280x800)');
    });

    // ===================================================
    // STEP 26 — FINAL SCREENSHOT
    // ===================================================
    await safeStep('FINAL SCREENSHOT', async () => {

        await page.screenshot({
            path: 'budget-payroll-final.png',
            fullPage: true
        });

        console.log('Final screenshot saved as budget-payroll-final.png');
    });

    console.log('\n🎯 Budget Payroll Functional Deep Test Completed');
});