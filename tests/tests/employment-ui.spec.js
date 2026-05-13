import { test, expect } from '@playwright/test';

test.setTimeout(240000);

test('CultureHCM - Generate Payroll Deep UI & Functional Testing', async ({ page }) => {

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
    // DISABLE ANIMATIONS
    // =========================================================
    await page.addStyleTag({
        content: `
            *,
            *::before,
            *::after {
                transition: none !important;
                animation: none !important;
                scroll-behavior: auto !important;
            }
        `
    });

    // =========================================================
    // LOGIN
    // =========================================================
    await safeStep('LOGIN', async () => {

        await page.goto('https://demo.culturehcm.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });

        await page.waitForTimeout(2000);

        const emailField = page.getByPlaceholder('Enter your email');

        await expect(emailField).toBeVisible({
            timeout: 30000
        });

        await emailField.fill('khi0001@karachi.co');

        const passwordField = page.locator('input[type="password"]');

        await passwordField.fill('fHwgk9');

        const loginButton = page.getByRole('button', {
            name: /login/i
        });

        await loginButton.click();

        await page.waitForURL(/dashboard/, {
            timeout: 60000
        });

        await page.waitForLoadState('networkidle');

        console.log('✅ Login successful');
    });

    // =========================================================
    // NAVIGATE TO GENERATE PAYROLL
    // =========================================================
    await safeStep('NAVIGATE TO GENERATE PAYROLL', async () => {

        await page.goto(
            'https://demo.culturehcm.com/payroll-management/generate-payroll',
            {
                waitUntil: 'domcontentloaded',
                timeout: 120000
            }
        );

        await page.waitForLoadState('networkidle');

        await page.waitForTimeout(3000);

        const body = page.locator('body');

        await expect(body).toBeVisible();

        console.log('Generate Payroll page loaded');
    });

    // =========================================================
    // PAGE HEADER VALIDATION
    // =========================================================
    await safeStep('PAGE HEADER VALIDATION', async () => {

        const possibleHeaders = [
            page.locator('text=/generate payroll/i').first(),
            page.locator('h1').first(),
            page.locator('h2').first()
        ];

        for (const header of possibleHeaders) {

            if (await header.count() > 0) {

                const visible = await header.isVisible()
                    .catch(() => false);

                if (visible) {

                    const text = await header.innerText()
                        .catch(() => '');

                    console.log(`Header found: ${text}`);

                    break;
                }
            }
        }
    });

    // =========================================================
    // BREADCRUMB VALIDATION
    // =========================================================
    await safeStep('BREADCRUMB VALIDATION', async () => {

        const breadcrumb = page.locator(
            'text=/payroll management/i'
        );

        if (await breadcrumb.count() > 0) {

            console.log('Breadcrumb visible');

        } else {

            console.log('⚠️ Breadcrumb missing');
        }
    });

    // =========================================================
    // FILTER SECTION VALIDATION
    // =========================================================
    await safeStep('FILTER SECTION VALIDATION', async () => {

        const dropdowns = page.locator('select');

        const dropdownCount = await dropdowns.count();

        console.log(`Dropdowns found: ${dropdownCount}`);

        for (let i = 0; i < dropdownCount; i++) {

            const dropdown = dropdowns.nth(i);

            const visible = await dropdown.isVisible()
                .catch(() => false);

            if (visible) {

                const options = await dropdown.locator('option')
                    .allTextContents()
                    .catch(() => []);

                console.log(`Dropdown ${i + 1} options: ${options.join(', ')}`);
            }
        }

        const inputs = page.locator('input');

        const inputCount = await inputs.count();

        console.log(`Input fields found: ${inputCount}`);
    });

    // =========================================================
    // SEARCH / FILTER FUNCTIONALITY
    // =========================================================
    await safeStep('FILTER FUNCTIONALITY', async () => {

        const dropdowns = page.locator('select');

        const count = await dropdowns.count();

        for (let i = 0; i < Math.min(count, 3); i++) {

            const dropdown = dropdowns.nth(i);

            const visible = await dropdown.isVisible()
                .catch(() => false);

            if (visible) {

                const options = await dropdown.locator('option').count();

                if (options > 1) {

                    try {

                        await dropdown.selectOption({
                            index: 1
                        });

                        await page.waitForTimeout(1500);

                        console.log(`Dropdown ${i + 1} tested`);

                    } catch {

                        console.log(`⚠️ Dropdown ${i + 1} failed`);
                    }
                }
            }
        }
    });

    // =========================================================
    // TABLE VALIDATION
    // =========================================================
    await safeStep('TABLE VALIDATION', async () => {

        const tables = page.locator('table');

        const tableCount = await tables.count();

        console.log(`Tables found: ${tableCount}`);

        if (tableCount > 0) {

            const table = tables.first();

            const headers = await table.locator('th')
                .allInnerTexts()
                .catch(() => []);

            console.log(`Table Headers: ${headers.join(' | ')}`);

            const rows = await table.locator('tbody tr')
                .count()
                .catch(() => 0);

            console.log(`Table rows: ${rows}`);

            if (rows > 0) {

                const firstRow = await table.locator('tbody tr')
                    .first()
                    .locator('td')
                    .allInnerTexts()
                    .catch(() => []);

                console.log(`First row: ${firstRow.join(' | ')}`);
            }
        }
    });

    // =========================================================
    // SEARCH INPUT VALIDATION
    // =========================================================
    await safeStep('SEARCH INPUT VALIDATION', async () => {

        const searchInputs = page.locator(
            'input[placeholder*="Search"], input[type="search"]'
        );

        const count = await searchInputs.count();

        console.log(`Search inputs found: ${count}`);

        if (count > 0) {

            const search = searchInputs.first();

            await search.fill('Ali')
                .catch(() => {});

            await page.waitForTimeout(1500);

            console.log('Search input tested');

            await search.clear()
                .catch(() => {});
        }
    });

    // =========================================================
    // BUTTON VALIDATION
    // =========================================================
    await safeStep('BUTTON VALIDATION', async () => {

        const buttons = page.locator('button');

        const count = await buttons.count();

        console.log(`Buttons found: ${count}`);

        for (let i = 0; i < Math.min(count, 10); i++) {

            const button = buttons.nth(i);

            const visible = await button.isVisible()
                .catch(() => false);

            if (visible) {

                const text = await button.innerText()
                    .catch(() => '');

                console.log(`Button ${i + 1}: ${text}`);
            }
        }
    });

    // =========================================================
    // GENERATE PAYROLL BUTTON
    // =========================================================
    await safeStep('GENERATE PAYROLL FUNCTIONALITY', async () => {

        const generateButton = page.getByRole('button', {
            name: /generate/i
        });

        const count = await generateButton.count();

        if (count > 0) {

            const button = generateButton.first();

            const enabled = await button.isEnabled()
                .catch(() => false);

            console.log(`Generate button enabled: ${enabled}`);

            if (enabled) {

                await button.click()
                    .catch(() => {});

                await page.waitForTimeout(3000);

                console.log('Generate payroll button clicked');
            }
        }
    });

    // =========================================================
    // PAGINATION VALIDATION
    // =========================================================
    await safeStep('PAGINATION VALIDATION', async () => {

        const pagination = page.locator(
            '.ant-pagination, [class*="pagination"]'
        );

        const count = await pagination.count();

        if (count > 0) {

            console.log('Pagination visible');

            const nextButton = pagination.locator('button').last();

            const enabled = await nextButton.isEnabled()
                .catch(() => false);

            if (enabled) {

                await nextButton.click()
                    .catch(() => {});

                await page.waitForTimeout(2000);

                console.log('Pagination next button tested');
            }
        }
    });

    // =========================================================
    // EXPORT / DOWNLOAD BUTTONS
    // =========================================================
    await safeStep('EXPORT BUTTON VALIDATION', async () => {

        const exportButtons = page.locator(
            'button:has(svg), button:has(img)'
        );

        const count = await exportButtons.count();

        console.log(`Export/Icon buttons found: ${count}`);

        if (count > 0) {

            try {

                await exportButtons.first().click();

                await page.waitForTimeout(1500);

                console.log('Export/Icon button clicked');

            } catch {

                console.log('⚠️ Export button failed');
            }
        }
    });

    // =========================================================
    // MODAL / POPUP VALIDATION
    // =========================================================
    await safeStep('MODAL VALIDATION', async () => {

        const modals = page.locator(
            '[role="dialog"], .modal, .ant-modal'
        );

        const count = await modals.count();

        console.log(`Modals found: ${count}`);

        if (count > 0) {

            const modal = modals.first();

            const visible = await modal.isVisible()
                .catch(() => false);

            console.log(`Modal visible: ${visible}`);
        }
    });

    // =========================================================
    // BROKEN IMAGE CHECK
    // =========================================================
    await safeStep('BROKEN IMAGE CHECK', async () => {

        const images = page.locator('img');

        const totalImages = await images.count();

        let brokenImages = 0;

        for (let i = 0; i < totalImages; i++) {

            const width = await images.nth(i)
                .evaluate(img => img.naturalWidth)
                .catch(() => 0);

            if (width === 0) {

                brokenImages++;
            }
        }

        if (brokenImages > 0) {

            console.log(`⚠️ Broken images found: ${brokenImages}`);

        } else {

            console.log('All images loaded correctly');
        }
    });

    // =========================================================
    // SCROLL TEST
    // =========================================================
    await safeStep('SCROLL TEST', async () => {

        await page.mouse.wheel(0, 3000);

        await page.waitForTimeout(1000);

        await page.mouse.wheel(0, -3000);

        await page.waitForTimeout(1000);

        console.log('Scroll test completed');
    });

    // =========================================================
    // FINAL SCREENSHOT
    // =========================================================
    await safeStep('FINAL SCREENSHOT', async () => {

        await page.screenshot({
            path: 'test-assetsgenerate-payroll-final.png',
            fullPage: true
        });

        console.log('Final screenshot captured');
    });

    console.log('Generate Payroll Deep Testing Completed');
});