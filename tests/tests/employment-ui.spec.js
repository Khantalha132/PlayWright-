const { test, expect } = require('@playwright/test');

test.describe('Employment Module - Consolidated UI Testing', () => {

  test('Validate Employment List UI and Navigation', async ({ page }) => {
    // 1. SETUP & LOGIN
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://demo.culturehcm.com/login');

    await page.getByPlaceholder('Enter your email').fill('khi0001@karachi.co');
    await page.locator('input[type="password"]').fill('fHwgk9');
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for any dashboard variant to load to confirm session
    await page.waitForURL(/.*dashboard/); 

    // 2. NAVIGATION TO TARGET MODULE
    // 'networkidle' is the "secret sauce" here—it waits until the page stops loading data
    await page.goto('https://demo.culturehcm.com/employee/list-employee', { 
      waitUntil: 'networkidle' 
    });
    
    await expect(page).toHaveURL(/.*list-employee/);

    // 3. UI VALIDATION
    // We give the heading up to 10 seconds to appear just in case the server is slow
    const pageHeading = page.getByRole('heading', { name: /Employee/i }).first();
    await expect(pageHeading).toBeVisible({ timeout: 10000 });

    // Verify the data table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Validate standard table headers
    const headers = ['Emp. ID', 'Name', 'Designation', 'Status', 'Department', 'Action'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') }).first()).toBeVisible();
    }

    // 4. FINAL CAPTURE
    await page.screenshot({ path: `employment-ui-success-${Date.now()}.png`, fullPage: true });
    
    console.log('UI Testing Completed Successfully');
  });
});