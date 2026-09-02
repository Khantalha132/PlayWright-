const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION & SETUP
// ============================================================

const BASE_URL = 'https://staging.culturehcm.com/expense/expense-policies';
const EMAIL = process.env.CULTURE_EMAIL || 'csg00102@info.clearstonegroup.com.au';
const PASSWORD = process.env.CULTURE_PASSWORD || 'ypW1sO';

const BUG_DIR = path.join(process.cwd(), 'test-results', 'bugs');
const BUG_REPORT_PATH = path.join(BUG_DIR, 'bug_report.txt');

const bugReports = [];

test.describe.configure({ mode: 'serial' });

test.describe('CultureHCM Expense Policy Automation Suite', () => {

    test.beforeAll(async () => {
        if (!fs.existsSync(BUG_DIR)) {
            fs.mkdirSync(BUG_DIR, { recursive: true });
        }
    });

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            const errorMsg = testInfo.error?.message || 'Unknown assertion/execution failure';
            const bugEntry = `[${testInfo.title}] -> STATUS: FAILED\n   Error Details: ${errorMsg.replace(/\n/g, ' ')}\n`;
            bugReports.push(bugEntry);

            const screenshotPath = path.join(BUG_DIR, `${testInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_FAIL.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        }
    });

    test.afterAll(async () => {
        let content = '==================================================\n';
        content += '      EXPENSE POLICY AUTOMATION BUG REPORT       \n';
        content += `      Generated: ${new Date().toISOString()}\n`;
        content += '==================================================\n\n';

        if (bugReports.length === 0) {
            content += 'All executed test cases passed successfully. No bugs logged.\n';
        } else {
            content += `Total Failures / Bugs Identified: ${bugReports.length}\n\n`;
            bugReports.forEach((bug, index) => {
                content += `${index + 1}. ${bug}\n`;
            });
        }

        fs.writeFileSync(BUG_REPORT_PATH, content, 'utf-8');
        console.log(`\nBug report compiled at: ${BUG_REPORT_PATH}`);
    });

    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        page.setDefaultTimeout(20000);
        page.setDefaultNavigationTimeout(30000);

        await safeNavigate(page, BASE_URL);
        await handleLoginIfRequired(page);
    });

    // ============================================================
    // TEST CASES (EXP-POL-001 TO EXP-POL-026)
    // ============================================================

    test('EXP-POL-001: Create policy with all valid fields', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Policy All Fields ${Date.now()}`);
        await fillField(page, 'Description', 'Fully populated test expense policy.');
        await setEffectiveDate(page, '2026-09-01');
        await fillAmount(page, 'Per Claim Limit', '2000');
        await fillAmount(page, 'Daily', '5000');
        await fillAmount(page, 'Monthly', '50000');
        await fillAmount(page, 'Yearly', '100000');
        await toggleSwitch(page, 'Receipt Mandatory', true);
        await toggleSwitch(page, 'Duplicate Claim Restriction', true);
        await toggleSwitch(page, 'Tax Applicability', true);
        await setStatus(page, true);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-002: Create policy with valid policy name only', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Name Only ${Date.now()}`);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-003: Create policy with blank policy name', async ({ page }) => {
        await openAddPolicyModal(page);
        await clearField(page, 'Policy Name');
        await savePolicy(page);
        await expectValidationError(page, /required|cannot be empty|please enter|policy name/i);
    });

    test('EXP-POL-004: Create policy with duplicate policy name', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', 'Medical Allowance');
        await savePolicy(page);
        await expectValidationError(page, /already exists|duplicate|unique/i);
    });

    test('EXP-POL-005: Enter valid description', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Desc Test ${Date.now()}`);
        await fillField(page, 'Description', 'Standard valid policy description text.');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-006: Enter description exceeding max length', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Long Desc ${Date.now()}`);
        await fillField(page, 'Description', 'E'.repeat(1001));
        await savePolicy(page);
        await expectValidationError(page, /exceed|maximum length|too long|limit/i);
    });

    test('EXP-POL-007: Set valid effective date', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Date Test ${Date.now()}`);
        await setEffectiveDate(page, '2026-10-01');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-008: Set invalid date format', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Invalid Date ${Date.now()}`);
        const dateInput = page.getByLabel(/effective date/i).or(page.locator("input[type='date']")).first();
        if (await dateInput.isVisible().catch(() => false)) {
            await dateInput.evaluate(el => el.type = 'text');
            await dateInput.fill('99/99/9999');
        }
        await savePolicy(page);
        await expectValidationError(page, /invalid date|format|valid date/i);
    });

    test('EXP-POL-009: Set maximum claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Max Limit ${Date.now()}`);
        await fillAmount(page, 'Per Claim Limit', '9999999');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-010: Enter negative maximum claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Neg Limit ${Date.now()}`);
        await fillAmount(page, 'Per Claim Limit', '-500');
        await savePolicy(page);
        await expectValidationError(page, /negative|greater than|invalid amount|must be/i);
    });

    test('EXP-POL-011: Enter zero maximum claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Zero Limit ${Date.now()}`);
        await fillAmount(page, 'Per Claim Limit', '0');
        await savePolicy(page);
        await expectValidationError(page, /greater than zero|invalid|cannot be 0/i);
    });

    test('EXP-POL-012: Enter alphabetic value in claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Alpha Limit ${Date.now()}`);
        await fillAmount(page, 'Per Claim Limit', 'ABC');
        await savePolicy(page);
        await expectValidationError(page, /numeric|number|invalid/i);
    });

    test('EXP-POL-013: Enter decimal claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Decimal Limit ${Date.now()}`);
        await fillAmount(page, 'Per Claim Limit', '1500.75');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-014: Set daily claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Daily Limit ${Date.now()}`);
        await fillAmount(page, 'Daily', '3000');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-015: Set monthly claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Monthly Limit ${Date.now()}`);
        await fillAmount(page, 'Monthly', '30000');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-016: Set yearly claim limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Yearly Limit ${Date.now()}`);
        await fillAmount(page, 'Yearly', '120000');
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-017: Set daily limit greater than monthly limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Daily > Monthly ${Date.now()}`);
        await fillAmount(page, 'Daily', '60000');
        await fillAmount(page, 'Monthly', '50000');
        await savePolicy(page);
        await expectValidationError(page, /daily.*less|monthly.*greater|invalid configuration/i);
    });

    test('EXP-POL-018: Set monthly limit greater than yearly limit', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Monthly > Yearly ${Date.now()}`);
        await fillAmount(page, 'Monthly', '150000');
        await fillAmount(page, 'Yearly', '100000');
        await savePolicy(page);
        await expectValidationError(page, /monthly.*less|yearly.*greater|invalid configuration/i);
    });

    test('EXP-POL-019: Enable Receipt Mandatory', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Receipt On ${Date.now()}`);
        await toggleSwitch(page, 'Receipt Mandatory', true);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-020: Disable Receipt Mandatory', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Receipt Off ${Date.now()}`);
        await toggleSwitch(page, 'Receipt Mandatory', false);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-021: Enable Duplicate Claim Restriction', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Dup Restrict On ${Date.now()}`);
        await toggleSwitch(page, 'Duplicate Claim Restriction', true);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-022: Disable Duplicate Claim Restriction', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Dup Restrict Off ${Date.now()}`);
        await toggleSwitch(page, 'Duplicate Claim Restriction', false);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-023: Enable Tax Applicability', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Tax On ${Date.now()}`);
        await toggleSwitch(page, 'Tax Applicability', true);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-024: Disable Tax Applicability', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Tax Off ${Date.now()}`);
        await toggleSwitch(page, 'Tax Applicability', false);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-025: Set policy Active', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Active Policy ${Date.now()}`);
        await setStatus(page, true);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

    test('EXP-POL-026: Set policy Inactive', async ({ page }) => {
        await openAddPolicyModal(page);
        await fillField(page, 'Policy Name', `Inactive Policy ${Date.now()}`);
        await setStatus(page, false);
        await savePolicy(page);
        await expectNoFormErrors(page);
    });

});

// ============================================================
// HELPER ACTIONS & RECOVERY
// ============================================================

async function safeNavigate(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        console.warn(`Navigation warning bypassed: ${e.message}`);
    }
}

async function handleLoginIfRequired(page) {
    const emailField = page.getByLabel('Email').or(page.getByPlaceholder('Email')).or(page.locator("input[type='email']"));
    if (await emailField.first().isVisible().catch(() => false)) {
        await emailField.first().fill(EMAIL);

        const passwordField = page.getByLabel('Password').or(page.getByPlaceholder('Password')).or(page.locator("input[type='password']"));
        if (await passwordField.first().isVisible().catch(() => false)) {
            await passwordField.first().fill(PASSWORD);
        }

        const loginBtn = page.getByRole('button', { name: /login|sign in/i }).or(page.getByText(/login|sign in/i));
        if (await loginBtn.first().isVisible().catch(() => false)) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                loginBtn.first().click()
            ]);
        }
    }
}

async function openAddPolicyModal(page) {
    const addBtn = page.getByRole('button', { name: /add policy|create policy|\+ policy/i })
                       .or(page.getByText(/add policy|\+ add/i));
    await expect(addBtn.first()).toBeVisible({ timeout: 15000 });
    await addBtn.first().click();
}

async function savePolicy(page) {
    const saveBtn = page.getByRole('button', { name: /save|submit|create/i })
                        .or(page.getByText(/save|submit/i));
    await saveBtn.first().click();
    await page.waitForTimeout(1000);
}

async function fillField(page, labelText, value) {
    const field = page.getByLabel(new RegExp(labelText, 'i'))
                      .or(page.getByPlaceholder(new RegExp(labelText, 'i')))
                      .or(page.locator(`input[name*='${labelText.toLowerCase().replace(/ /g, '')}']`));
    await field.first().fill(value);
}

async function clearField(page, labelText) {
    const field = page.getByLabel(new RegExp(labelText, 'i'))
                      .or(page.getByPlaceholder(new RegExp(labelText, 'i')));
    await field.first().fill('');
}

async function fillAmount(page, labelText, value) {
    const field = page.getByLabel(new RegExp(labelText, 'i'))
                      .or(page.getByPlaceholder(new RegExp(labelText, 'i')))
                      .or(page.locator(`input[placeholder*='${labelText}']`));
    await field.first().fill(value);
}

async function setEffectiveDate(page, dateStr) {
    const dateInput = page.getByLabel(/effective date/i)
                          .or(page.locator("input[type='date']"));
    if (await dateInput.first().isVisible().catch(() => false)) {
        await dateInput.first().fill(dateStr);
    }
}

async function toggleSwitch(page, labelText, enable) {
    const toggle = page.getByLabel(new RegExp(labelText, 'i'))
                       .or(page.locator(`xpath=//*[contains(text(), '${labelText}')]/following::input[1]`));
    if (await toggle.first().isVisible().catch(() => false)) {
        const isChecked = await toggle.first().isChecked().catch(() => false);
        if (isChecked !== enable) {
            await toggle.first().click();
        }
    }
}

async function setStatus(page, active) {
    await toggleSwitch(page, 'Active', active);
}

async function expectNoFormErrors(page) {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/error occurred|server error 500|failed to save/i);
}

async function expectValidationError(page, pattern) {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(pattern);
}