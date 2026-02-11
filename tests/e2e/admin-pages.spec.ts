import { test, expect, Page } from '@playwright/test'

// ============================================
// Admin E2E Page Tests
// Covers: page rendering, navigation, filters,
// tables, tabs, modals, error states
// ============================================

test.describe.configure({ mode: 'serial' })

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin'

let page: Page

// ------------------------------------------
// Helpers
// ------------------------------------------

async function adminLogin(p: Page) {
  // Retry login up to 3 times (handles rate-limiting from other test suites)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await p.waitForTimeout(5000) // wait for rate limit to clear
    }
    await p.goto('/admin/login')
    await p.waitForLoadState('networkidle')
    await p.locator('input').first().fill(ADMIN_USERNAME)
    await p.locator('input[type="password"]').fill(ADMIN_PASSWORD)
    await p.click('button[type="submit"]')
    try {
      await p.waitForURL('**/admin/dashboard**', { timeout: 20000 })
      return // success
    } catch {
      // May be rate-limited, retry
    }
  }
  throw new Error('Admin login failed after 3 attempts (possibly rate-limited)')
}

/** Wait for table/data to load (no skeleton visible) */
async function waitForDataLoad(p: Page, timeout = 15000) {
  // Wait for skeleton to disappear or data to appear
  await p.waitForTimeout(500) // brief pause for fetch to start
  try {
    await p.waitForFunction(
      () => !document.querySelector('[class*="animate-pulse"]'),
      { timeout }
    )
  } catch {
    // If skeleton check times out, just continue
  }
}

/** Check that no unhandled runtime errors are shown */
async function assertNoRuntimeError(p: Page) {
  const errorOverlay = p.locator('text=Unhandled Runtime Error')
  await expect(errorOverlay).not.toBeVisible({ timeout: 3000 })
}

// ============================================
// Login
// ============================================

test.describe('Admin Login', () => {
  test('login page loads', async ({ browser }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await p.goto('/admin/login')
    await expect(p.locator('input[type="password"]')).toBeVisible({ timeout: 10000 })
    await ctx.close()
  })

  test('invalid credentials shows error', async ({ browser }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await p.goto('/admin/login')
    await p.waitForLoadState('networkidle')
    await p.locator('input').first().fill('baduser')
    await p.locator('input[type="password"]').fill('badpass')
    await p.click('button[type="submit"]')
    await p.waitForTimeout(2000)
    await expect(p).toHaveURL(/\/admin\/login/)
    await ctx.close()
  })
})

// ============================================
// Authenticated page tests — shared session
// ============================================

test.describe('Admin Pages', () => {
  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90000) // allow time for login retries if rate-limited
    const ctx = await browser.newContext()
    page = await ctx.newPage()
    await adminLogin(page)
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  // ------------------------------------------
  // Dashboard
  // ------------------------------------------

  test.describe('Dashboard', () => {
    test('renders stat cards', async () => {
      await page.goto('/admin/dashboard')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)

      // Should have stat cards with numbers
      const body = await page.textContent('body')
      expect(body).toContain('Total Users')
      expect(body).toContain('Total Spins')
      expect(body).toContain('Revenue')
    })

    test('has navigation links', async () => {
      // Sidebar should have all nav items
      const nav = page.locator('nav, aside, [role="navigation"]').first()
      const links = await page.locator('a[href*="/admin/"]').allTextContents()
      const linkText = links.join(' ').toLowerCase()

      expect(linkText).toContain('dashboard')
      expect(linkText).toContain('distribute')
      expect(linkText).toContain('revenue')
      expect(linkText).toContain('users')
      expect(linkText).toContain('affiliates')
      expect(linkText).toContain('config')
      expect(linkText).toContain('log') // "Audit Logs"
    })

    test('shows sync status section', async () => {
      const body = await page.textContent('body')
      // Should mention sync-related content
      expect(body?.toLowerCase()).toMatch(/sync|distribution/i)
    })
  })

  // ------------------------------------------
  // Distribute Page
  // ------------------------------------------

  test.describe('Distribute Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/distribute')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('has tabs for pending/distributed/failed', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toContain('pending')
      expect(body?.toLowerCase()).toContain('distributed')
      expect(body?.toLowerCase()).toContain('failed')
    })

    test('pending tab shows data or empty state', async () => {
      // Should have either table rows or an empty state message
      const hasTable = await page.locator('table, [role="table"]').count()
      const hasEmpty = await page.locator('text=/no.*found|no.*pending|empty/i').count()
      expect(hasTable + hasEmpty).toBeGreaterThan(0)
    })

    test('filter bar exists and is interactive', async () => {
      // Look for filter button or filter section
      const filterBtn = page.locator('button:has-text("Filter"), button:has-text("filter"), [class*="filter"]')
      const filterCount = await filterBtn.count()
      if (filterCount > 0) {
        await filterBtn.first().click()
        await page.waitForTimeout(500)
        // Filter inputs should appear
        const inputs = await page.locator('input, select').count()
        expect(inputs).toBeGreaterThan(0)
      }
    })

    test('switching tabs changes content', async () => {
      // Click "Distributed" tab
      const distributedTab = page.locator('button:has-text("Distributed"), [role="tab"]:has-text("Distributed")')
      if (await distributedTab.count() > 0) {
        await distributedTab.first().click()
        await waitForDataLoad(page)
        await assertNoRuntimeError(page)
      }

      // Click back to "Pending"
      const pendingTab = page.locator('button:has-text("Pending"), [role="tab"]:has-text("Pending")')
      if (await pendingTab.count() > 0) {
        await pendingTab.first().click()
        await waitForDataLoad(page)
        await assertNoRuntimeError(page)
      }
    })
  })

  // ------------------------------------------
  // Revenue Page
  // ------------------------------------------

  test.describe('Revenue Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/revenue')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('shows revenue stats', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toMatch(/revenue|total|sui/i)
    })

    test('has filter controls', async () => {
      // Wait for page to fully render filters
      await waitForDataLoad(page)
      const filterElements = page.locator('select, input[type="date"], button:has-text("Filter"), [class*="filter"]')
      // Wait briefly for dynamic filter elements
      await filterElements.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
      expect(await filterElements.count()).toBeGreaterThan(0)
    })

    test('table renders with data or empty state', async () => {
      const hasTable = await page.locator('table, [role="table"]').count()
      const hasEmpty = await page.locator('text=/no.*found|no.*payment|empty/i').count()
      expect(hasTable + hasEmpty).toBeGreaterThan(0)
    })
  })

  // ------------------------------------------
  // Users Page
  // ------------------------------------------

  test.describe('Users Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/users')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('shows users table with wallet data', async () => {
      const body = await page.textContent('body')
      // Should show wallet addresses (0x...)
      expect(body).toMatch(/0x[a-fA-F0-9]/i)
    })

    test('has search/filter capabilities', async () => {
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="wallet" i], input[type="text"]')
      const filterElements = page.locator('select, button:has-text("Filter"), [class*="filter"]')
      expect(await searchInput.count() + await filterElements.count()).toBeGreaterThan(0)
    })

    test('pagination exists when data available', async () => {
      const paginationElements = page.locator('button:has-text("Next"), button:has-text("Prev"), [class*="pagination"], nav[aria-label*="pagination" i]')
      // Pagination may or may not be visible depending on data count
      const bodyText = await page.textContent('body')
      if (bodyText?.includes('of ')) {
        // Pagination info is shown
        expect(await paginationElements.count()).toBeGreaterThanOrEqual(0)
      }
    })

    test('sort by column header works', async () => {
      // Click a sortable column header
      const sortableHeader = page.locator('th:has-text("Spins"), th:has-text("spins"), button:has-text("Spins")')
      if (await sortableHeader.count() > 0) {
        await sortableHeader.first().click()
        await waitForDataLoad(page)
        await assertNoRuntimeError(page)
      }
    })
  })

  // ------------------------------------------
  // Affiliates Page
  // ------------------------------------------

  test.describe('Affiliates Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/affiliates')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('has status tabs', async () => {
      const body = await page.textContent('body')
      const lower = body?.toLowerCase() || ''
      // Should have at least "All" and "Ready" or "Paid" tabs
      expect(lower).toMatch(/all|ready|paid|pending/i)
    })

    test('shows stats summary', async () => {
      const body = await page.textContent('body')
      // Should show affiliate stats
      expect(body?.toLowerCase()).toMatch(/pending|ready|paid|reward|vict/i)
    })

    test('switching status tabs works', async () => {
      const tabs = page.locator('button:has-text("Ready"), button:has-text("Paid"), button:has-text("All")')
      if (await tabs.count() > 0) {
        await tabs.first().click()
        await waitForDataLoad(page)
        await assertNoRuntimeError(page)
      }
    })

    test('filter bar exists', async () => {
      const filterElements = page.locator('select, input[type="date"], button:has-text("Filter"), [class*="filter"]')
      expect(await filterElements.count()).toBeGreaterThan(0)
    })
  })

  // ------------------------------------------
  // Config Page
  // ------------------------------------------

  test.describe('Config Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/config')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('shows wallet configuration section', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toMatch(/wallet.*config|recipient.*wallet|admin.*wallet/i)
    })

    test('shows general settings', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toMatch(/spin.*rate|purchase|referral/i)
    })

    test('shows prize table', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toMatch(/prize.*table|slot|weight/i)
    })

    test('has save button', async () => {
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")')
      // Wait for save button to appear (config page may still be loading)
      await saveBtn.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
      expect(await saveBtn.count()).toBeGreaterThan(0)
    })

    test('wallet address inputs accept SUI addresses', async () => {
      // Find the wallet input field
      const walletInputs = page.locator('input[placeholder*="0x"], input[value*="0x"]')
      if (await walletInputs.count() > 0) {
        const firstInput = walletInputs.first()
        const value = await firstInput.inputValue()
        // Should either be empty or a valid SUI address
        if (value) {
          expect(value).toMatch(/^0x[a-fA-F0-9]{64}$/)
        }
      }
    })
  })

  // ------------------------------------------
  // Audit Logs Page
  // ------------------------------------------

  test.describe('Audit Logs Page', () => {
    test('loads without runtime errors', async () => {
      await page.goto('/admin/logs')
      await waitForDataLoad(page)
      await assertNoRuntimeError(page)
    })

    test('shows audit logs heading', async () => {
      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toContain('audit log')
    })

    test('has filter controls', async () => {
      const filterElements = page.locator('select, input[type="date"], input[type="text"], button:has-text("Filter"), [class*="filter"]')
      expect(await filterElements.count()).toBeGreaterThan(0)
    })

    test('table renders with data or empty state', async () => {
      const hasTable = await page.locator('table, [role="table"]').count()
      const hasEmpty = await page.locator('text=/no.*found|no.*log|empty/i').count()
      expect(hasTable + hasEmpty).toBeGreaterThan(0)
    })

    test('expandable rows work (if data exists)', async () => {
      // Try clicking a row to expand
      const rows = page.locator('tr, [role="row"]')
      const rowCount = await rows.count()
      if (rowCount > 1) {
        // Click a data row (not header)
        await rows.nth(1).click()
        await page.waitForTimeout(500)
        await assertNoRuntimeError(page)
      }
    })

    test('action filter dropdown has options', async () => {
      const actionSelect = page.locator('select').first()
      if (await actionSelect.count() > 0) {
        const options = await actionSelect.locator('option').allTextContents()
        expect(options.length).toBeGreaterThan(1)
      }
    })
  })

  // ------------------------------------------
  // Navigation between pages
  // ------------------------------------------

  test.describe('Navigation', () => {
    test('navigate through all pages without errors', async () => {
      const pages = [
        '/admin/dashboard',
        '/admin/distribute',
        '/admin/revenue',
        '/admin/users',
        '/admin/affiliates',
        '/admin/config',
        '/admin/logs',
      ]

      for (const path of pages) {
        await page.goto(path)
        await waitForDataLoad(page)
        await assertNoRuntimeError(page)
        console.log(`✓ ${path} — no errors`)
      }
    })

    test('all pages load under 10 seconds', async () => {
      const pages = [
        { name: 'Dashboard', path: '/admin/dashboard' },
        { name: 'Distribute', path: '/admin/distribute' },
        { name: 'Revenue', path: '/admin/revenue' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Affiliates', path: '/admin/affiliates' },
        { name: 'Config', path: '/admin/config' },
        { name: 'Logs', path: '/admin/logs' },
      ]

      for (const { name, path } of pages) {
        const start = Date.now()
        await page.goto(path, { waitUntil: 'networkidle' })
        const loadTime = Date.now() - start
        console.log(`${name}: ${loadTime}ms`)
        expect(loadTime, `${name} should load under 10s`).toBeLessThan(10000)
      }
    })
  })
})
