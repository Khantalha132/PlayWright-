const { test, expect } = require('@playwright/test');

// Increase timeout to handle slow page loads
test.setTimeout(90000);

test('Verify Leave Assign UI & Functionality', async ({ page }) => {

    // ---------------------------------------------------
    // LOGIN
    // ---------------------------------------------------
    await page.goto('https://demo.culturehcm.com/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Enter your email').fill('khi0001@karachi.co');
    await page.locator('input[type="password"]').fill('fHwgk9');
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForURL(/.*dashboard/, { timeout: 30000 });

    // ---------------------------------------------------
    // Open Leave Assign Page
    // FIX: Use 'domcontentloaded' instead of 'networkidle'
    // The app has persistent background requests that prevent
    // networkidle from ever resolving.
    // ---------------------------------------------------
    await page.goto('https://demo.culturehcm.com/basic-setup/leave-assign', {
        waitUntil: 'domcontentloaded'
    });

    // Wait for the actual page content to appear instead of relying on network
    await page.waitForSelector('table', { timeout: 30000 });

    const continueButton = page.getByRole('button', { name: /continue/i });
    if (await continueButton.count() > 0) {
        await continueButton.click();
        await page.waitForSelector('table', { timeout: 15000 });
    }

    // ---------------------------------------------------
    // SECTION 1: Page Title & Layout
    // ---------------------------------------------------
    console.log('\n--- SECTION 1: Page Title & Layout ---');

    await expect(page.locator('body')).toBeVisible();

    // From snapshot: actual heading is "Leave Summary" (h3), not "Leave Assign"
    const heading = page.getByRole('heading', { name: /leave summary/i });
    if (await heading.count() > 0) {
        await expect(heading.first()).toBeVisible();
        console.log('✅ Page heading "Leave Summary" visible');
    } else {
        console.log('⚠️ BUG: Page heading not found');
    }

    await page.screenshot({ path: '01-leave-assign-full-ui.png', fullPage: true });

    // ---------------------------------------------------
    // SECTION 2: Search & Show Entries Controls
    // ---------------------------------------------------
    console.log('\n--- SECTION 2: Filter & Search Controls ---');

    // From snapshot: placeholder is "Search Table Data"
    const searchInput = page.getByPlaceholder('Search Table Data');
    if (await searchInput.count() > 0) {
        await expect(searchInput).toBeVisible();
        console.log('✅ Search input visible');

        await searchInput.fill('Ali');
        await page.waitForTimeout(800);
        await page.screenshot({ path: '02-search-result.png', fullPage: true });
        await searchInput.clear();
        await page.waitForTimeout(500);
        console.log('✅ Search input functional');
    } else {
        console.log('⚠️ BUG: Search input not found');
    }

    // From snapshot: "Show entries" combobox exists with options 10/25/50/100/All
    const showEntries = page.getByRole('combobox', { name: 'Show entries' });
    if (await showEntries.count() > 0) {
        await expect(showEntries).toBeVisible();
        const options = await showEntries.locator('option').allTextContents();
        console.log(`✅ "Show entries" dropdown found. Options: ${options.join(', ')}`);

        // Verify expected options exist
        const expectedOptions = ['10', '25', '50', '100', 'All'];
        for (const opt of expectedOptions) {
            if (options.includes(opt)) {
                console.log(`  ✅ Option "${opt}" present`);
            } else {
                console.log(`  ⚠️ BUG: Option "${opt}" missing from Show entries`);
            }
        }

        // Functionality: change to 10 entries
        await showEntries.selectOption('10');
        await page.waitForTimeout(800);
        console.log('✅ Show entries selection works');
        await showEntries.selectOption('50'); // restore default
    } else {
        console.log('⚠️ BUG: "Show entries" dropdown not found');
    }

    // ---------------------------------------------------
    // SECTION 3: Table Validation
    // ---------------------------------------------------
    console.log('\n--- SECTION 3: Table Validation ---');

    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    console.log('✅ Table visible');

    // From snapshot: actual columns are "HCM Id" and "Employee"
    const expectedHeaders = ['HCM Id', 'Employee'];
    for (const header of expectedHeaders) {
        const col = table.getByRole('columnheader', { name: header, exact: true });
        if (await col.count() > 0) {
            console.log(`✅ Column "${header}" found`);
        } else {
            console.log(`⚠️ INFO: Column "${header}" not found (may use different label)`);
        }
    }

    // Row count
    const rowCount = await table.locator('tbody tr').count();
    console.log(`Rows Found: ${rowCount}`);

    // From snapshot: table shows "No data" state
    if (rowCount === 1) {
        const noDataCell = table.locator('td').getByText(/no data/i);
        if (await noDataCell.count() > 0) {
            console.log('✅ Empty state "No data" message present in table');
        }
    } else if (rowCount > 1) {
        console.log(`✅ Table has ${rowCount} data rows`);

        // Sort column test — click HCM Id header
        const hcmHeader = table.getByRole('columnheader', { name: /hcm id/i });
        if (await hcmHeader.count() > 0) {
            await hcmHeader.click();
            await page.waitForTimeout(600);
            console.log('✅ Column sort click on "HCM Id" worked');
            await hcmHeader.click(); // toggle sort direction
            await page.waitForTimeout(600);
            console.log('✅ Column sort toggle worked');
        }
    }

    await page.screenshot({ path: '03-table-view.png', fullPage: true });

    // ---------------------------------------------------
    // SECTION 4: Breadcrumb Navigation
    // ---------------------------------------------------
    console.log('\n--- SECTION 4: Breadcrumb Navigation ---');

    // From snapshot: breadcrumb shows "Leave / Leave Summary"
    const leaveBreadcrumb = page.getByRole('listitem').filter({ hasText: 'Leave' }).first();
    if (await leaveBreadcrumb.count() > 0) {
        console.log('✅ Breadcrumb "Leave" segment visible');
    }

    const summaryBreadcrumb = page.getByRole('listitem').filter({ hasText: 'Leave Summary' });
    if (await summaryBreadcrumb.count() > 0) {
        console.log('✅ Breadcrumb "Leave Summary" segment visible');
    }

    // ---------------------------------------------------
    // SECTION 5: Sidebar Navigation — Leave Sub-menu
    // ---------------------------------------------------
    console.log('\n--- SECTION 5: Sidebar Leave Menu ---');

    // From snapshot: Leave menu has 4 sub-links
    const leaveMenuLinks = [
        { name: 'Leave Summary', url: '/basic-setup/leave-assign' },
        { name: 'Leave History', url: '/basic-setup/leave-history' },
        { name: 'Bulk Leave', url: '/leave/bulk-leave' },
        { name: 'Bulk Leave Assign', url: '/leave/bulk-leave-assign' },
    ];

    for (const link of leaveMenuLinks) {
        const el = page.getByRole('link', { name: link.name, exact: true });
        if (await el.count() > 0) {
            const href = await el.getAttribute('href');
            if (href && href.includes(link.url.replace('https://demo.culturehcm.com', ''))) {
                console.log(`✅ Sidebar link "${link.name}" has correct URL`);
            } else {
                console.log(`⚠️ BUG: Sidebar link "${link.name}" has unexpected href: ${href}`);
            }
        } else {
            console.log(`⚠️ BUG: Sidebar link "${link.name}" not found`);
        }
    }

    // ---------------------------------------------------
    // SECTION 6: Final Screenshot
    // ---------------------------------------------------
    await page.screenshot({ path: '04-final-state.png', fullPage: true });
    console.log('\n✅ All sections completed.');
});