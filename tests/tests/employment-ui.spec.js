const { test, expect } = require('@playwright/test');

test.describe('Promotion Module - Stable UI Testing', () => {

  test('Verify Promotion UI & Detect UI Bugs', async ({ page }) => {

    // ---------------------------------------------------
    // Increase Timeout for Heavy Enterprise UI
    // ---------------------------------------------------
    test.setTimeout(120000);

    // ---------------------------------------------------
    // Browser Setup
    // ---------------------------------------------------
    await page.setViewportSize({
      width: 1920,
      height: 1080
    });

    // ---------------------------------------------------
    // Console Error Tracking
    // ---------------------------------------------------
    page.on('console', msg => {

      if (msg.type() === 'error') {

        console.log(`
        Console Error:
        ${msg.text()}
        `);

      }

    });

    // ---------------------------------------------------
    // API Failure Tracking
    // ---------------------------------------------------
    page.on('response', response => {

      if (response.status() >= 400) {

        console.log(`
        API Failure:
        ${response.status()}
        URL:
        ${response.url()}
        `);

      }

    });

    // ---------------------------------------------------
    // LOGIN
    // ---------------------------------------------------
    await page.goto('https://demo.culturehcm.com/login');

    await page.getByPlaceholder('Enter your email')
      .fill('khi0001@karachi.co');

    await page.locator('input[type="password"]')
      .fill('fHwgk9');

    await page.getByRole('button', {
      name: /login/i
    }).click();

    // Wait Dashboard Load
    await page.waitForURL(/.*dashboard/);

    // ---------------------------------------------------
    // Open Promotion Page
    // ---------------------------------------------------
    await page.goto(
      'https://demo.culturehcm.com/employee/promotion',
      {
        waitUntil: 'networkidle'
      }
    );

    // ---------------------------------------------------
    // Handle Feature Popup (if appears)
    // ---------------------------------------------------
    const continueButton = page.getByRole('button', {
      name: /continue/i
    });

    if (await continueButton.count() > 0) {

      await continueButton.click();

      console.log('Feature Popup Closed');

    }

    // ---------------------------------------------------
    // Main Page Validation
    // ---------------------------------------------------
    await expect(page.locator('body'))
      .toBeVisible();

    // ---------------------------------------------------
    // Full Page Screenshot
    // ---------------------------------------------------
    await page.screenshot({
      path: '01-full-ui.png',
      fullPage: true
    });

    // ---------------------------------------------------
    // Verify Heading
    // ---------------------------------------------------
    await expect(
      page.getByRole('heading', {
        name: /promotion/i
      })
    ).toBeVisible();

    // ---------------------------------------------------
    // Verify Add New Button
    // ---------------------------------------------------
    const addButton = page.getByRole('link', {
      name: /add new/i
    });

    await expect(addButton)
      .toBeVisible();

    // ---------------------------------------------------
    // Verify Search Input
    // ---------------------------------------------------
    const searchInput = page.getByPlaceholder(
      'Search Table Data'
    );

    await expect(searchInput)
      .toBeVisible();

    // ---------------------------------------------------
    // Table Validation
    // ---------------------------------------------------
    const table = page.locator('table');

    await expect(table)
      .toBeVisible();

    // ---------------------------------------------------
    // Verify Table Headers
    // ---------------------------------------------------
    const headers = [
      'Id',
      'Employee',
      'Current Designation',
      'New Designation',
      'Promotion Date',
      'Action'
    ];

    for (const header of headers) {

      const column = page.getByRole(
        'columnheader',
        {
          name: new RegExp(header, 'i')
        }
      );

      await expect(column.first())
        .toBeVisible();

      console.log(`Header Verified: ${header}`);

    }

    // ---------------------------------------------------
    // Search Functionality Test
    // ---------------------------------------------------
    await searchInput.fill('Daniel');

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '02-search-result.png',
      fullPage: true
    });

    // Validate Result
    const row = table.locator('tbody tr');

    await expect(row.first())
      .toContainText(/Daniel/i);

    // Clear Search
    await searchInput.clear();

    // ---------------------------------------------------
    // Verify Data Rows
    // ---------------------------------------------------
    const rows = table.locator('tbody tr');

    const rowCount = await rows.count();

    console.log(`Rows Found: ${rowCount}`);

    if (rowCount > 0) {

      const firstRow = rows.first();

      await expect(firstRow)
        .toBeVisible();

      console.log('Table Data Available');

    } else {

      console.log('No Table Data Found');

    }

    // ---------------------------------------------------
    // Export Button Validation
    // ---------------------------------------------------
    const exportIcons = page.locator('svg');

    const exportCount = await exportIcons.count();

    console.log(`Export Icons Found: ${exportCount}`);

    // ---------------------------------------------------
    // Visible Buttons Validation
    // ---------------------------------------------------
    const buttons = page.locator('button:visible');

    const buttonCount = await buttons.count();

    console.log(`Visible Buttons: ${buttonCount}`);

    for (let i = 0; i < buttonCount; i++) {

      const button = buttons.nth(i);

      try {

        const text = await button.textContent();

        console.log(`Button Found: ${text}`);

      } catch (error) {

        console.log('Invalid Button Skipped');

      }

    }

    // ---------------------------------------------------
    // Visible Inputs Validation
    // ---------------------------------------------------
    const inputs = page.locator('input:visible');

    const inputCount = await inputs.count();

    console.log(`Visible Inputs: ${inputCount}`);

    for (let i = 0; i < inputCount; i++) {

      const input = inputs.nth(i);

      try {

        const enabled = await input.isEnabled();

        if (enabled) {

          console.log(`Input ${i + 1} Verified`);

        }

      } catch (error) {

        console.log('Hidden Input Skipped');

      }

    }

    // ---------------------------------------------------
    // Pagination Validation
    // ---------------------------------------------------
    const pagination = page.locator('button');

    const nextButton = page.getByRole('button', {
      name: /right/i
    });

    if (await nextButton.count() > 0) {

      console.log('Pagination Available');

    } else {

      console.log('Pagination Missing');

    }

    // ---------------------------------------------------
    // Scroll Testing
    // ---------------------------------------------------
    await page.mouse.wheel(0, 2500);

    await page.waitForTimeout(2000);

    await page.mouse.wheel(0, -2500);

    // ---------------------------------------------------
    // Responsive Mobile Testing
    // ---------------------------------------------------
    await page.setViewportSize({
      width: 375,
      height: 812
    });

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '03-mobile-ui.png',
      fullPage: true
    });

    // ---------------------------------------------------
    // Tablet Testing
    // ---------------------------------------------------
    await page.setViewportSize({
      width: 768,
      height: 1024
    });

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '04-tablet-ui.png',
      fullPage: true
    });

    // ---------------------------------------------------
    // Back to Desktop
    // ---------------------------------------------------
    await page.setViewportSize({
      width: 1920,
      height: 1080
    });

    // ---------------------------------------------------
    // Final Screenshot
    // ---------------------------------------------------
    await page.screenshot({
      path: '05-final-ui.png',
      fullPage: true
    });

    console.log('================================');
    console.log('Promotion UI Testing Completed');
    console.log('================================');

  });

});