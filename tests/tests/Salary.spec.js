import { test, expect } from '@playwright/test';

test.describe('CultureHCM - Salary & Benefits Module', () => {

    test.setTimeout(180000);

    test('Salary & Benefits Complete Testing', async ({ page }) => {

        page.setDefaultTimeout(60000);

        console.log('========== OPEN LOGIN PAGE ==========');

        await page.goto(
            'https://staging.culturehcm.com/login',
            { waitUntil: 'domcontentloaded' }
        );

        // Email
        const emailField = page.getByPlaceholder('Enter your email');

        await expect(emailField).toBeVisible();
        await emailField.fill('waseem-babar@hotmail.com');

        // Password
        const passwordField = page.locator('input').nth(1);

        await expect(passwordField).toBeVisible();
        await passwordField.fill('12345678');

        console.log('========== LOGIN ==========');

        await page.getByRole('button', { name: 'Login' }).click();

        // Ignore networkidle issues on staging
        await page.waitForTimeout(5000);

        // Verify login success
        await expect(page).not.toHaveURL(/login/i, {
            timeout: 60000
        });

        console.log('Login Successful');

        console.log('========== OPEN SALARY MODULE ==========');

        await page.goto(
            'https://staging.culturehcm.com/payroll-management/salary',
            {
                waitUntil: 'domcontentloaded'
            }
        );

        await expect(
            page.getByText('Salary & Benefits')
        ).toBeVisible({
            timeout: 60000
        });

        console.log('Salary Module Loaded');

        // Employee ID Filter
        const employeeIdInput =
            page.locator('input[placeholder="Employee ID"]');

        await expect(employeeIdInput).toBeVisible();

        // Employee Name Filter
        const employeeNameInput =
            page.locator('input[placeholder="Employee Name"]');

        await expect(employeeNameInput).toBeVisible();

        console.log('Search Filters Available');

        console.log('========== SEARCH EMPLOYEE ==========');

        await employeeNameInput.fill('Waseem');

        await page.getByRole('button', {
            name: /^SEARCH$/i
        }).click();

        await page.waitForTimeout(3000);

        console.log('Employee Search Completed');

        console.log('========== GLOBAL SEARCH ==========');

        const globalSearch =
            page.locator('input[placeholder="Search Table Data"]');

        await expect(globalSearch).toBeVisible();

        await globalSearch.fill('Waseem');

        await page.waitForTimeout(2000);

        console.log('Global Search Completed');

        console.log('========== TABLE VALIDATION ==========');

        const rows = page.locator('table tbody tr');

        await expect(rows.first()).toBeVisible({
            timeout: 30000
        });

        const rowCount = await rows.count();

        console.log(`Rows Found: ${rowCount}`);

        console.log('========== ACTION MENU ==========');

        const actionMenu =
            page.locator('table tbody tr')
                .first()
                .locator('td')
                .last();

        if (await actionMenu.isVisible()) {
            await actionMenu.click();
            await page.waitForTimeout(2000);

            console.log('Action Menu Opened');
        }

        console.log('========== RESET FILTER ==========');

        const resetButton = page.getByRole('button', {
            name: /^RESET$/i
        });

        if (await resetButton.isVisible()) {
            await resetButton.click();
            await page.waitForTimeout(2000);

            console.log('Reset Successful');
        }

        console.log('========== EXPORT BUTTONS ==========');

        const buttons = page.locator('button');

        const buttonCount = await buttons.count();

        for (let i = 0; i < buttonCount; i++) {

            const btn = buttons.nth(i);

            try {
                await btn.scrollIntoViewIfNeeded();

                if (await btn.isVisible()) {

                    const text = await btn.textContent();

                    console.log(`Button Found: ${text}`);

                }
            } catch {
                console.log(`Button ${i} skipped`);
            }
        }

        console.log('========== SCREENSHOT ==========');

        await page.screenshot({
            path: 'Salary-Benefits-Final.png',
            fullPage: true
        });

        console.log('========== TEST COMPLETED ==========');

    });

});