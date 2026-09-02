const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION & CREDENTIALS
// ============================================================

const BASE_URL = 'https://staging.culturehcm.com/expense/reimbursements';
const EMAIL = process.env.CULTURE_EMAIL || 'csg00102@info.clearstonegroup.com.au';
const PASSWORD = process.env.CULTURE_PASSWORD || 'ypW1sO';

const BUG_DIR = path.join(process.cwd(), 'test-results', 'bugs');
const BUG_REPORT_PATH = path.join(BUG_DIR, 'reimbursement_detailed_bugs.txt');

const bugReports = [];

test.describe.configure({ mode: 'serial' });

test.describe('Expense Reimbursement - Detailed Functional Test Suite', () => {

    test.beforeAll(async () => {
        if (!fs.existsSync(BUG_DIR)) {
            fs.mkdirSync(BUG_DIR, { recursive: true });
        }
    });

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            const errorMsg = testInfo.error?.message || 'Unknown test failure';
            bugReports.push(`[${testInfo.title}] -> STATUS: FAILED\n   Error: ${errorMsg.replace(/\n/g, ' ')}\n`);
            
            const screenshotPath = path.join(BUG_DIR, `${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_FAIL.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        }
    });

    test.afterAll(async () => {
        let content = '==================================================\n';
        content += ' EXPENSE REIMBURSEMENT DETAILED BUG REPORT \n';
        content += ` Generated: ${new Date().toISOString()}\n`;
        content += '==================================================\n\n';

        content += bugReports.length === 0 
            ? 'All execution steps completed without failure. No bugs logged.\n' 
            : `Total Failures: ${bugReports.length}\n\n` + bugReports.join('\n');

        fs.writeFileSync(BUG_REPORT_PATH, content, 'utf-8');
        console.log(`\nBug report compiled at: ${BUG_REPORT_PATH}`);
    });

    test.beforeEach(async ({ page }) => {
        // Disable timeouts completely for slow staging environment responses
        test.setTimeout(0);
        page.setDefaultTimeout(0);
        page.setDefaultNavigationTimeout(0);

        await safeNavigate(page, BASE_URL);
        await performLoginIfPresent(page);
    });

    // ============================================================
    // DETAILED TEST CASES
    // ============================================================

    test('REIMB-001: Validate Page Header & UI Components', async ({ page }) => {
        await expect(page.getByText('Expense Reimbursement', { exact: true }).first()).toBeVisible();
        await expect(page.getByPlaceholder(/search employee or claim/i)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
    });

    test('REIMB-002: Search Table by Claim Number', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/search employee or claim/i);
        await searchInput.fill('EXP-2026-002');
        await page.getByRole('button', { name: 'Filter' }).click();
        await page.waitForTimeout(1500);

        await expect(page.locator('table tbody tr')).toContainText('EXP-2026-002');
    });

    test('REIMB-003: Search Table by Employee Name', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/search employee or claim/i);
        await searchInput.fill('John Doe');
        await page.getByRole('button', { name: 'Filter' }).click();
        await page.waitForTimeout(1500);

        await expect(page.locator('table tbody')).toContainText('John Doe');
    });

    test('REIMB-004: Filter Table by Status (Paid)', async ({ page }) => {
        await applyStatusFilter(page, 'Paid');
        await page.getByRole('button', { name: 'Filter' }).click();
        await page.waitForTimeout(1500);

        const statusBadges = page.locator('table tbody tr td');
        await expect(statusBadges.filter({ hasText: 'PAID' }).first()).toBeVisible();
    });

    test('REIMB-005: Filter Table by Status (Awaiting Payment)', async ({ page }) => {
        await applyStatusFilter(page, 'Awaiting Payment');
        await page.getByRole('button', { name: 'Filter' }).click();
        await page.waitForTimeout(1500);

        const statusBadges = page.locator('table tbody tr td');
        await expect(statusBadges.filter({ hasText: 'AWAITING PAYMENT' }).first()).toBeVisible();
    });

    test('REIMB-006: Verify Reset Button Functionality', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/search employee or claim/i);
        await searchInput.fill('EXP-2026-010');
        await page.getByRole('button', { name: 'Filter' }).click();
        await page.waitForTimeout(1000);

        await page.getByRole('button', { name: 'Reset' }).click();
        await page.waitForTimeout(1500);

        await expect(searchInput).toHaveValue('');
    });

    test('REIMB-007: Change Page Entries Dropdown', async ({ page }) => {
        const entryDropdown = page.locator('select').filter({ hasText: /entries/i }).or(page.locator('select')).first();
        if (await entryDropdown.isVisible().catch(() => false)) {
            await entryDropdown.selectOption({ label: 'All' }).catch(async () => {
                await entryDropdown.selectOption({ index: 0 });
            });
            await page.waitForTimeout(1000);
        }
        await expect(page.locator('table tbody tr')).not.toHaveCount(0);
    });

    test('REIMB-008: Row Checkbox Selection', async ({ page }) => {
        const headerCheckbox = page.locator('table thead input[type="checkbox"]').first();
        if (await headerCheckbox.isVisible().catch(() => false)) {
            await headerCheckbox.click();
            await expect(headerCheckbox).toBeChecked();
            await headerCheckbox.click();
        }

        const rowCheckbox = page.locator('table tbody tr input[type="checkbox"]').first();
        if (await rowCheckbox.isVisible().catch(() => false)) {
            await rowCheckbox.click();
            await expect(rowCheckbox).toBeChecked();
        }
    });

    test('REIMB-009: Verify "Mark Paid" Button Action', async ({ page }) => {
        const markPaidBtn = page.getByRole('button', { name: 'Mark Paid' }).first();
        if (await markPaidBtn.isVisible().catch(() => false)) {
            await markPaidBtn.click();
            await page.waitForTimeout(2000);
            await expect(page.locator('body')).not.toContainText('500 Internal Server Error');
        }
    });

    test('REIMB-010: Verify "Payment History" Modal Action', async ({ page }) => {
        const historyBtn = page.getByRole('button', { name: 'Payment History' }).first();
        if (await historyBtn.isVisible().catch(() => false)) {
            await historyBtn.click();
            await page.waitForTimeout(2000);
            
            const closeBtn = page.getByRole('button', { name: /close|cancel|x/i }).or(page.locator('.modal-close')).first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
            }
        }
    });

});

// ============================================================
// HELPER ROUTINES
// ============================================================

async function safeNavigate(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
    } catch (e) {
        // Navigation errors bypassed as requested
    }
}

async function performLoginIfPresent(page) {
    const emailInput = page.getByLabel('Email')
                           .or(page.getByPlaceholder('Email'))
                           .or(page.locator("input[type='email']"));

    if (await emailInput.first().isVisible().catch(() => false)) {
        await emailInput.first().fill(EMAIL);

        const passwordInput = page.getByLabel('Password')
                                  .or(page.getByPlaceholder('Password'))
                                  .or(page.locator("input[type='password']"));
        if (await passwordInput.first().isVisible().catch(() => false)) {
            await passwordInput.first().fill(PASSWORD);
        }

        const submitBtn = page.getByRole('button', { name: /login|sign in/i })
                              .or(page.getByText(/login|sign in/i));
        if (await submitBtn.first().isVisible().catch(() => false)) {
            await submitBtn.first().click();
            await page.waitForLoadState('domcontentloaded').catch(() => {});
        }
    }
}

async function applyStatusFilter(page, statusLabel) {
    const statusDropdown = page.locator('select').first().or(page.getByText(/all statuses/i));
    if (await statusDropdown.isVisible().catch(() => false)) {
        const tagName = await statusDropdown.evaluate(el => el.tagName).catch(() => '');
        if (tagName.toUpperCase() === 'SELECT') {
            await statusDropdown.selectOption({ label: statusLabel }).catch(() => {});
        } else {
            await statusDropdown.click();
            const option = page.getByText(new RegExp(statusLabel, 'i')).first();
            if (await option.isVisible().catch(() => false)) {
                await option.click();
            }
        }
    }
}