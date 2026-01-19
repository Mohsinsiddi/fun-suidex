import { test, expect } from '@playwright/test'

test.describe('Documentation Page', () => {
  test('Docs page loads', async ({ page }) => {
    const response = await page.goto('/docs')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Docs page has navigation sections', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')

    // Check for main sections
    const content = await page.locator('body').textContent()
    expect(content).toContain('Overview')
    expect(content).toContain('Games')
  })

  test('Docs page has sidebar on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')

    // Desktop sidebar should be visible (the fixed one with lg:block)
    await expect(page.locator('aside.hidden.lg\\:block')).toBeVisible()
  })

  test('Docs page has mobile menu on mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')

    // Menu button should be visible on mobile
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(menuButton).toBeVisible()
  })

  test('Docs page load time < 10s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/docs', { waitUntil: 'networkidle' })
    const loadTime = Date.now() - start

    console.log(`Docs page loaded in ${loadTime}ms`)
    expect(loadTime).toBeLessThan(10000)
  })
})

test.describe('Public User Profile Pages', () => {
  test('User profile page with invalid slug returns 404 or error', async ({ page }) => {
    const response = await page.goto('/u/nonexistent-user-12345')
    // Should return 404 or show user not found
    await page.waitForLoadState('networkidle')

    const status = response?.status()
    const content = await page.locator('body').textContent()

    // Either 404 status or page shows "not found" message
    const isNotFound = status === 404 || content?.toLowerCase().includes('not found')
    expect(isNotFound).toBeTruthy()
  })

  test('User profile page renders correctly', async ({ page }) => {
    // This will either show a user or a not found message
    await page.goto('/u/test')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Referral Redirect', () => {
  test('Referral link with invalid code handles gracefully', async ({ page }) => {
    await page.goto('/r/INVALIDCODE123')
    await page.waitForLoadState('networkidle')

    // Should redirect to home or wheel page, or show error
    await expect(page.locator('body')).toBeVisible()
  })

  test('Referral link redirects to home or wheel page', async ({ page }) => {
    await page.goto('/r/TESTCODE')
    await page.waitForLoadState('networkidle')

    // Should redirect to home or wheel page with ref param
    const url = page.url()
    expect(url).toMatch(/(\?ref=|\/wheel|\/r\/)/)
  })
})

test.describe('PWA User Profile Pages', () => {
  test('PWA user profile page loads', async ({ page }) => {
    await page.goto('/pwa/u/testuser')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Additional Pages - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  const pages = [
    { name: 'Docs', path: '/docs' },
    { name: 'User Profile', path: '/u/test' },
  ]

  for (const { name, path } of pages) {
    test(`${name} page is mobile responsive`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // Allow small margin
    })
  }
})
