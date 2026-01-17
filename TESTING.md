# Testing Guide

End-to-end testing for SuiDex Games using Playwright.

## Quick Start

```bash
# Run all tests (headless - fast)
pnpm test

# Run with browser visible
pnpm test:headed

# Run with slow motion (500ms delay)
npx playwright test --headed --slowmo 500
```

## Test Commands

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests headless |
| `pnpm test:headed` | Run with browser visible |
| `pnpm test:ui` | Open Playwright UI (interactive) |
| `pnpm test:user` | Run only user page tests |
| `pnpm test:admin` | Run only admin page tests |
| `pnpm test:report` | View HTML test report |

## Prerequisites

1. **Install dependencies** (already done):
   ```bash
   pnpm add -D @playwright/test
   npx playwright install chromium
   ```

2. **Dev server**: Tests auto-start dev server, or run manually:
   ```bash
   pnpm dev
   ```

3. **Admin credentials**: Set in environment or use defaults:
   ```bash
   ADMIN_USERNAME=admin ADMIN_PASSWORD=superadmin pnpm test
   ```

## Test Structure

```
tests/
└── e2e/
    ├── user-pages.spec.ts    # User-facing pages & APIs
    └── admin-pages.spec.ts   # Admin dashboard & APIs
```

## What's Tested

### User Pages (`user-pages.spec.ts`)

| Test | What it checks |
|------|----------------|
| Landing page loads | HTTP 200, page renders |
| Wheel page loads | HTTP 200, page renders |
| Leaderboard page loads | HTTP 200, page renders |
| Badges page loads | HTTP 200, page renders |
| Profile page loads | HTTP 200, page renders |
| Referral page loads | HTTP 200, page renders |
| Activity page loads | HTTP 200, page renders |

### User Performance

| Test | Threshold |
|------|-----------|
| All user pages | Load time < 10 seconds |

### User APIs

| API | Test |
|-----|------|
| `/api/config` | Returns `success: true` with `prizeTable` |
| `/api/leaderboard` | Returns `success: true` |
| `/api/activity` | Returns `success: true` |
| `/api/badges` | Returns `success: true` |
| `/api/auth/me` | Returns 401 without auth |
| `/api/spin` | Returns 401 without auth |
| `/api/spin/history` | Returns 401 without auth |

### Admin Pages (`admin-pages.spec.ts`)

| Test | What it checks |
|------|----------------|
| Login page loads | Password input visible |
| Invalid login fails | Stays on login page |
| Valid login works | Redirects to dashboard |
| All admin pages load | Dashboard, Users, Distribute, Revenue, Affiliates, Config |

### Admin Performance

| Test | Threshold |
|------|-----------|
| All admin pages | Load time < 10 seconds |

### Admin APIs

| API | Test |
|-----|------|
| `/api/admin/stats` | Returns 401 without auth |
| `/api/admin/users` | Returns 401 without auth |

## Running Specific Tests

```bash
# Run only user tests
pnpm test:user

# Run only admin tests
pnpm test:admin

# Run a specific test file
npx playwright test user-pages.spec.ts

# Run tests matching a pattern
npx playwright test -g "Login"

# Run with verbose output
npx playwright test --reporter=list
```

## Debugging Failed Tests

```bash
# Run with debug mode
npx playwright test --debug

# Run with trace on
npx playwright test --trace on

# View last test report
pnpm test:report
```

## Test Output

Successful run shows:
```
Running 28 tests using 4 workers

  ✓ Landing page loads (1.2s)
  ✓ Wheel page loads (1.1s)
  ✓ Admin dashboard flow - all pages load (12.8s)
  ...

  28 passed (40.3s)
```

Performance output:
```
Landing page loaded in 3511ms
Admin Dashboard loaded in 867ms
Admin Users loaded in 895ms
Admin Distribute loaded in 1089ms
Admin Revenue loaded in 865ms
Admin Affiliates loaded in 894ms
Admin Config loaded in 813ms
```

## Configuration

Edit `playwright.config.ts` to customize:

```typescript
// Change base URL
baseURL: 'http://localhost:3000',

// Change timeout
timeout: 30000,

// Run in different browsers
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

## Adding New Tests

1. Create test in `tests/e2e/`:
   ```typescript
   import { test, expect } from '@playwright/test'

   test('my new test', async ({ page }) => {
     await page.goto('/my-page')
     await expect(page.locator('h1')).toBeVisible()
   })
   ```

2. Run to verify:
   ```bash
   npx playwright test -g "my new test" --headed
   ```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run Playwright tests
  run: pnpm test
  env:
    ADMIN_USERNAME: ${{ secrets.ADMIN_USERNAME }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in `playwright.config.ts` |
| Browser not found | Run `npx playwright install chromium` |
| Dev server not starting | Run `pnpm dev` manually first |
| Admin login fails | Check credentials: `ADMIN_USERNAME` and `ADMIN_PASSWORD` |
| MongoDB errors | Ensure MongoDB is running and accessible |
