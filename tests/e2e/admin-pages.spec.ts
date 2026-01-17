import { test, expect, Page, BrowserContext } from '@playwright/test'

// Run admin tests serially to avoid concurrent login issues
test.describe.configure({ mode: 'serial' })

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin'

async function adminLogin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForLoadState('networkidle')

  const usernameInput = page.locator('input').first()
  const passwordInput = page.locator('input[type="password"]')

  await usernameInput.fill(ADMIN_USERNAME)
  await passwordInput.fill(ADMIN_PASSWORD)
  await page.click('button[type="submit"]')

  // Wait for redirect
  await page.waitForURL('**/admin/dashboard**', { timeout: 20000 })
}

test.describe('Admin - Login', () => {
  test('Login page loads', async ({ page }) => {
    const response = await page.goto('/admin/login')
    expect(response?.status()).toBe(200)
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 })
  })

  test('Login with invalid credentials fails', async ({ page }) => {
    await page.goto('/admin/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input').first().fill('wronguser')
    await page.locator('input[type="password"]').fill('wrongpass')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('Login with valid credentials', async ({ page }) => {
    await adminLogin(page)
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})

// Use a single login for all dashboard tests
test.describe('Admin - All Pages', () => {
  test.setTimeout(120000)

  test('Admin dashboard flow - all pages load', async ({ page }) => {
    // Login once
    await adminLogin(page)

    // Test Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    console.log('Dashboard loaded')

    // Test Users
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    console.log('Users page loaded')

    // Test Distribute
    await page.goto('/admin/distribute')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    console.log('Distribute page loaded')

    // Test Revenue
    await page.goto('/admin/revenue')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    console.log('Revenue page loaded')

    // Test Affiliates
    await page.goto('/admin/affiliates')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    console.log('Affiliates page loaded')

    // Test Config
    await page.goto('/admin/config')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
    console.log('Config page loaded')
  })

  test('Admin pages performance', async ({ page }) => {
    await adminLogin(page)

    const pages = [
      { name: 'Dashboard', path: '/admin/dashboard' },
      { name: 'Users', path: '/admin/users' },
      { name: 'Distribute', path: '/admin/distribute' },
      { name: 'Revenue', path: '/admin/revenue' },
      { name: 'Affiliates', path: '/admin/affiliates' },
      { name: 'Config', path: '/admin/config' },
    ]

    for (const { name, path } of pages) {
      const start = Date.now()
      await page.goto(path, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - start
      console.log(`Admin ${name} loaded in ${loadTime}ms`)
      expect(loadTime).toBeLessThan(10000)
    }
  })
})

test.describe('Admin - API Auth', () => {
  test('Admin stats API requires auth', async ({ request }) => {
    const response = await request.get('/api/admin/stats')
    expect(response.status()).toBe(401)
  })

  test('Admin users API requires auth', async ({ request }) => {
    const response = await request.get('/api/admin/users')
    expect(response.status()).toBe(401)
  })
})
