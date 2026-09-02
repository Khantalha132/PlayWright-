# Appedology Admin Panel — Playwright QA Test Suite

Full browser-based QA coverage for `https://adminpanel2.appedology.pk`  
**86 test cases** across 8 test files, organized by feature area.

---

## Project Structure

```
appedology-qa/
├── playwright.config.js          # Browser / project configuration
├── package.json
├── utils/
│   └── pages.js                  # Page Object Models + shared helpers
└── tests/
    ├── auth.setup.js             # One-time login → saves .auth/session.json
    ├── 01-login.spec.js          # Login page (24 tests)
    ├── 02-dashboard-navigation.spec.js  # Dashboard & nav (12 tests)
    ├── 03-forms.spec.js          # Forms management (16 tests)
    ├── 04-leads.spec.js          # Leads management (15 tests)
    ├── 05-exports-delivery.spec.js      # Exports & delivery (10 tests)
    ├── 06-user-profile.spec.js   # User management & profile (14 tests)
    ├── 07-accessibility-performance.spec.js  # A11y, perf, security (16 tests)
    └── 08-e2e-smoke.spec.js      # End-to-end happy paths (6 journeys)
```

---

## Quick Start

### 1. Install dependencies

```bash
cd appedology-qa
npm install
npx playwright install chromium
```

### 2. Run all tests

```bash
npm test
```

### 3. Run a specific suite

```bash
npm run test:login        # Login page only
npm run test:smoke        # E2E critical paths only
npm run test:forms        # Forms management
npm run test:leads        # Leads management
npm run test:exports      # Exports & delivery settings
npm run test:users        # User profile management
npm run test:a11y         # Accessibility & performance
npm run test:dashboard    # Dashboard & navigation
```

### 4. Run with visible browser (debug)

```bash
npm run test:headed       # Runs with browser window open
npm run test:debug        # Pauses at each step (step-through debugger)
```

### 5. View HTML report

```bash
npm run report
```

---

## Test Suite Summary

| File | Area | Tests | What's covered |
|------|------|-------|----------------|
| `01-login.spec.js` | Login | 24 | Page load, field validation, auth, remember-me, a11y, network security |
| `02-dashboard-navigation.spec.js` | Dashboard | 12 | Load, nav links, logout, back-button, responsive |
| `03-forms.spec.js` | Forms | 16 | List, search, pagination, detail, CRUD, delete confirm |
| `04-leads.spec.js` | Leads | 15 | List, search/filter/sort, detail, export, bulk actions |
| `05-exports-delivery.spec.js` | Exports | 10 | Export list, create, format options, delivery settings, validation |
| `06-user-profile.spec.js` | Users | 14 | Profile fields, password change, user list, roles |
| `07-accessibility-performance.spec.js` | A11y/Perf | 16 | ARIA, focus, broken images, console errors, LCP, security headers |
| `08-e2e-smoke.spec.js` | E2E | 6 | Full login→action→logout journeys |
| **Total** | | **~113** | |

---

## Configuration

Edit `playwright.config.js` to adjust:

| Setting | Default | Notes |
|---------|---------|-------|
| `baseURL` | `https://adminpanel2.appedology.pk` | Target application |
| `timeout` | 30 000 ms | Per-test timeout |
| `retries` | 1 | Auto-retry on flaky failure |
| `workers` | 1 | Sequential (avoids session conflicts) |
| `headless` | true | Set `false` to see the browser |

---

## Credentials

Set in `tests/auth.setup.js`:

```js
const CREDENTIALS = {
  email:    'admin@example.com',
  password: 'admin123',
};
```

To use environment variables instead:

```js
email:    process.env.ADMIN_EMAIL    ?? 'admin@example.com',
password: process.env.ADMIN_PASSWORD ?? 'admin123',
```

Then run:
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npm test
```

---

## How Auth Works

1. `auth.setup.js` runs **once** before all test projects.
2. It logs in and saves the browser storage state to `.auth/session.json`.
3. Every subsequent test starts with that session already loaded — no repeated logins.
4. Tests in `01-login.spec.js` and `08-e2e-smoke.spec.js` deliberately **clear** the session to test the unauthenticated flows.

---

## Handling "Soft" vs "Hard" Assertions

- **Hard assertions** (`expect(...)`) fail the test immediately — used for critical correctness checks.
- **Soft warnings** (`console.warn(...)`) log an issue without failing — used for optional features or UI inconsistencies that need a human decision (e.g. missing security headers, no bulk-action toolbar).

Review `console.warn` output in the HTML report under each test's "Standard Output" section.

---

## Extending the Suite

To add tests for a new page/feature:

1. Create `tests/09-myfeature.spec.js`
2. Use `const { BASE } = require('../utils/pages')` for the base URL
3. Add a Page Object to `utils/pages.js` if it's a page you'll test repeatedly
4. Add a `test:myfeature` script entry in `package.json`

---

## CI / CD Integration (GitHub Actions example)

```yaml
name: Playwright QA

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
        env:
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
