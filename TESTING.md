# Testing Guide

End-to-end and API testing for SuiDex Games using Playwright.

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
| `pnpm test:pwa` | Run only PWA tests |
| `pnpm test:api` | Run only API tests |
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
├── e2e/
│   ├── user-pages.spec.ts      # User-facing pages & APIs
│   ├── admin-pages.spec.ts     # Admin dashboard & APIs
│   ├── pwa-pages.spec.ts       # PWA pages & manifest
│   ├── pwa-api.spec.ts         # PWA API endpoints
│   └── additional-pages.spec.ts # Docs, profiles, referral redirects
└── api/
    ├── referral.spec.ts        # Referral API tests
    ├── payment.spec.ts         # Payment API tests
    └── profile.spec.ts         # Profile & user search API tests
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
| Docs page loads | HTTP 200, page renders |

### User Performance

| Test | Threshold |
|------|-----------|
| All user pages (8 total) | Load time < 10 seconds |

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

---

### PWA Pages (`pwa-pages.spec.ts`)

| Test | What it checks |
|------|----------------|
| PWA login page loads | HTTP 200, page renders |
| PWA setup page loads | HTTP 200, page renders |
| PWA offline page loads | HTTP 200, offline message shown |
| PWA protected pages redirect | Home, Game, History, Search, Settings |
| PWA mobile responsive | No horizontal overflow on mobile |
| Manifest.json accessible | Returns valid manifest with icons |
| Service worker accessible | Returns JavaScript file |

### PWA Performance

| Test | Threshold |
|------|-----------|
| PWA Login, Setup, Offline | Load time < 10 seconds |

---

### PWA API (`pwa-api.spec.ts`)

| API | Test |
|-----|------|
| `POST /api/pwa/link` | Returns 401 without auth |
| `POST /api/pwa/auth` | Validates input, returns 400/401 |
| `POST /api/pwa/refresh` | Validates token, returns 400/401 |
| `GET /api/pwa/status` | Returns 401 without auth |
| `POST /api/pwa/unlink` | Returns 401 without auth |
| `POST /api/pwa/push/subscribe` | Returns 401 without auth |
| `GET /api/pwa/push/status` | Returns 401 without auth |
| `POST /api/pwa/push/test` | Returns 401 without auth |
| `POST /api/pwa/transfer` | Returns 401 without auth |
| `GET /api/pwa/transfer/:token` | Validates token format |

---

### Additional Pages (`additional-pages.spec.ts`)

| Test | What it checks |
|------|----------------|
| Docs page loads | HTTP 200, navigation sections visible |
| Docs page has sidebar | Desktop sidebar visible |
| Docs page has mobile menu | Mobile menu button visible |
| Docs page performance | Load time < 10 seconds |
| User profile page | Handles valid/invalid slugs |
| PWA user profile page | Loads correctly |
| Referral redirect | Redirects to wheel page |

---

### Referral API (`tests/api/referral.spec.ts`)

| API | Test |
|-----|------|
| `POST /api/referral/apply` | Returns 401 without auth |
| `GET /api/referral/earnings` | Returns 401 without auth |
| `GET /api/referral/link` | Returns 401 without auth |
| `GET /api/referral/stats` | Returns 401 without auth |
| Input validation | Rejects empty/invalid codes |
| Tweet endpoints | Validates reward IDs |

---

### Payment API (`tests/api/payment.spec.ts`)

| API | Test |
|-----|------|
| `POST /api/payment/claim` | Returns 401 without auth |
| `GET /api/payment/scan` | Returns 401 without auth |
| Input validation | Rejects invalid txHash format |
| Input validation | Rejects zero/negative amounts |

---

### Profile API (`tests/api/profile.spec.ts`)

| API | Test |
|-----|------|
| `GET /api/profile` | Returns 401 without auth |
| `PUT /api/profile` | Returns 401 without auth |
| `GET /api/users/search` | Returns search results (public) |
| `GET /api/users/:identifier` | Returns user or 404 (public) |
| Input validation | Rejects too long display name/bio |
| Input validation | Rejects invalid slug characters |

---

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

---

## Running Specific Tests

```bash
# Run only user tests
pnpm test:user

# Run only admin tests
pnpm test:admin

# Run only PWA tests
npx playwright test pwa

# Run only API tests
npx playwright test tests/api/

# Run a specific test file
npx playwright test user-pages.spec.ts

# Run tests matching a pattern
npx playwright test -g "Login"

# Run tests matching multiple patterns
npx playwright test -g "PWA|API"

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

# Run specific test with headed mode
npx playwright test -g "PWA login" --headed
```

## Test Output

Successful run shows:
```
Running 70+ tests using 4 workers

  ✓ Landing page loads (1.2s)
  ✓ Wheel page loads (1.1s)
  ✓ PWA login page loads (0.8s)
  ✓ PWA manifest.json is accessible (0.2s)
  ✓ Admin dashboard flow - all pages load (12.8s)
  ...

  70 passed (60.5s)
```

Performance output:
```
Landing page loaded in 3511ms
Docs page loaded in 1234ms
PWA Login page loaded in 867ms
Admin Dashboard loaded in 895ms
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

// Mobile testing
projects: [
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
],
```

## Adding New Tests

1. Create test in appropriate directory:
   ```typescript
   // tests/e2e/my-feature.spec.ts
   import { test, expect } from '@playwright/test'

   test('my new test', async ({ page }) => {
     await page.goto('/my-page')
     await expect(page.locator('h1')).toBeVisible()
   })
   ```

2. For API tests:
   ```typescript
   // tests/api/my-api.spec.ts
   import { test, expect } from '@playwright/test'

   test('API returns correct data', async ({ request }) => {
     const response = await request.get('/api/my-endpoint')
     expect(response.status()).toBe(200)

     const data = await response.json()
     expect(data.success).toBe(true)
   })
   ```

3. Run to verify:
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

## Test Categories Summary

| Category | File(s) | Test Count |
|----------|---------|------------|
| User Pages | `user-pages.spec.ts` | ~24 |
| Admin Pages | `admin-pages.spec.ts` | ~7 |
| PWA Pages | `pwa-pages.spec.ts` | ~15 |
| PWA API | `pwa-api.spec.ts` | ~15 |
| Additional Pages | `additional-pages.spec.ts` | ~10 |
| Referral API | `referral.spec.ts` | ~8 |
| Payment API | `payment.spec.ts` | ~8 |
| Profile API | `profile.spec.ts` | ~12 |
| **Total** | **8 files** | **~99 tests** |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in `playwright.config.ts` |
| Browser not found | Run `npx playwright install chromium` |
| Dev server not starting | Run `pnpm dev` manually first |
| Admin login fails | Check credentials: `ADMIN_USERNAME` and `ADMIN_PASSWORD` |
| MongoDB errors | Ensure MongoDB is running and accessible |
| PWA tests failing | Ensure manifest.json and sw.js exist in public/ |
| API tests 500 errors | Check server logs for database connection issues |
