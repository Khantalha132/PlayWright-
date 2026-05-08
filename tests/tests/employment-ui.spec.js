const { test, expect } = require('@playwright/test');

test.describe('Employment Module - Credentials Management UI Testing', () => {

  test('Validate Credentials Management UI and Navigation', async ({ page }) => {
    // ---------------------------------------------------
    // 1. SETUP & LOGIN
    // ---------------------------------------------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Start at the login page to establish a fresh session
    await page.goto('https://demo.culturehcm.com/login');

    await page.getByPlaceholder('Enter your email').fill('khi0001@karachi.co');
    await page.locator('input[type="password"]').fill('fHwgk9');
    await page.getByRole('button', { name: /login/i }).click();

    // FIX: Wait for any dashboard variant (like employee-dashboard) to load
    await page.waitForURL(/.*dashboard/); 

    // ---------------------------------------------------
    // 2. NAVIGATION TO TARGET MODULE
    // ---------------------------------------------------
    // FIX: Use 'networkidle' to ensure the table data is fully fetched before proceeding
    await page.goto('https://demo.culturehcm.com/employee/credentials-management', { 
      waitUntil: 'networkidle' 
    });
    
    await expect(page).toHaveURL(/.*credentials-management/);

    // ---------------------------------------------------
    // 3. UI VALIDATION
    // ---------------------------------------------------
    // Verify the page heading (flexible regex to avoid strict string errors)
    const pageHeading = page.getByRole('heading', { name: /Credential/i }).first();
    await expect(pageHeading).toBeVisible({ timeout: 10000 });

    // Verify the credentials data table is present
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // FIX: Updated headers to match the ACTUAL columns found in your UI snapshot
    // Removed 'Email', 'Username', and 'Status' as they are not present in this specific table
    const headers = ['HCM ID', 'Name', 'Created', 'Action'];
    
    for (const header of headers) {
      // Validates that each specific column header exists and is visible
      await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') }).first()).toBeVisible();
    }

    // ---------------------------------------------------
    // 4. FINAL CAPTURE
    // ---------------------------------------------------
    await page.screenshot({ path: `credentials-ui-final-${Date.now()}.png`, fullPage: true });
    
    console.log('Credentials Management UI Testing Completed Successfully');
  });
});