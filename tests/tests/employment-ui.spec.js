const { test, expect } = require('@playwright/test');

test.describe('Employment Module - Promotion UI Verification', () => {

  test('Verify Promotion List UI Elements and Data Table', async ({ page }) => {
    // ---------------------------------------------------
    // 1. SETUP & LOGIN
    // ---------------------------------------------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://demo.culturehcm.com/login');

    await page.getByPlaceholder('Enter your email').fill('khi0001@karachi.co');
    await page.locator('input[type="password"]').fill('fHwgk9');
    await page.getByRole('button', { name: /login/i }).click();

    // Ensure session is set by waiting for the dashboard
    await page.waitForURL(/.*dashboard/);

    // ---------------------------------------------------
    // 2. NAVIGATION & STABILITY
    // ---------------------------------------------------
    await page.goto('https://demo.culturehcm.com/employee/promotion', { 
      waitUntil: 'load' 
    });
    
    // Wait for the table container to be visible
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // ---------------------------------------------------
    // 3. UI ELEMENT VERIFICATION (Static Elements)
    // ---------------------------------------------------
    // Verify the "+ Add New" button exists
    await expect(page.getByRole('link', { name: /Add New/i })).toBeVisible();
    
    // Verify Search Table Data input exists
    await expect(page.getByPlaceholder('Search Table Data')).toBeVisible();

    // Verify Column Headers
    const headers = ['Id', 'Employee', 'Current Designation', 'New Designation', 'Promotion Date', 'Action'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') }).first()).toBeVisible();
    }

    // ---------------------------------------------------
    // 4. CONDITIONAL DATA & EXPORT VERIFICATION
    // ---------------------------------------------------
    const noData = page.locator('text=No data');
    
    if (await noData.isVisible()) {
      console.log('Table is currently empty. Skipping data row and export icon verification.');
    } else {
      // These elements usually only render when data is present
      const excelButton = page.locator('text=').last();
      const pdfButton = page.locator('text=').last();

      // Verify visibility of export buttons if data exists
      await expect(excelButton).toBeVisible();
      await expect(pdfButton).toBeVisible();

      // Verify the specific data row
      const tableRow = table.locator('tr').filter({ hasText: 'Mr Daniel Reeve' });
      await expect(tableRow).toBeVisible();
      await expect(tableRow).toContainText(/developer/i);
    }

    // ---------------------------------------------------
    // 5. FINAL CAPTURE
    // ---------------------------------------------------
    await page.screenshot({ path: `promotion-ui-status-${Date.now()}.png`, fullPage: true });
    console.log('UI structure verification completed.');
  });
});