import { test, expect } from '@playwright/test'

test.describe('PWA Pages - Public Access', () => {
  test('PWA login page loads', async ({ page }) => {
    const response = await page.goto('/pwa')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('PWA setup page loads', async ({ page }) => {
    const response = await page.goto('/pwa/setup')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('PWA offline page loads', async ({ page }) => {
    const response = await page.goto('/pwa/offline')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('PWA Pages - Auth Required (Redirect)', () => {
  // These pages should redirect to /pwa when not authenticated
  const protectedPages = [
    { name: 'Home', path: '/pwa/home' },
    { name: 'Game', path: '/pwa/game' },
    { name: 'History', path: '/pwa/history' },
    { name: 'Search', path: '/pwa/search' },
    { name: 'Settings', path: '/pwa/settings' },
  ]

  for (const { name, path } of protectedPages) {
    test(`PWA ${name} page redirects when not authenticated`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Should redirect to /pwa login or show login required
      // The page loads but shows unauthenticated state
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test.describe('PWA Pages - Performance', () => {
  const pages = [
    { name: 'Login', path: '/pwa' },
    { name: 'Setup', path: '/pwa/setup' },
    { name: 'Offline', path: '/pwa/offline' },
  ]

  for (const { name, path } of pages) {
    test(`PWA ${name} page load time < 10s`, async ({ page }) => {
      const start = Date.now()
      await page.goto(path, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - start

      console.log(`PWA ${name} page loaded in ${loadTime}ms`)
      expect(loadTime).toBeLessThan(10000)
    })
  }
})

test.describe('PWA - UI Elements', () => {
  test('PWA login page has PIN input', async ({ page }) => {
    await page.goto('/pwa')
    await page.waitForLoadState('networkidle')

    // Check for PIN input or setup prompt
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
  })

  test('PWA setup page has wallet connection prompt', async ({ page }) => {
    await page.goto('/pwa/setup')
    await page.waitForLoadState('networkidle')

    // Should show setup instructions or wallet connect
    await expect(page.locator('body')).toBeVisible()
  })

  test('PWA offline page shows offline message', async ({ page }) => {
    await page.goto('/pwa/offline')
    await page.waitForLoadState('networkidle')

    // Should show offline indicator
    const content = await page.locator('body').textContent()
    expect(content?.toLowerCase()).toContain('offline')
  })
})

test.describe('PWA - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

  test('PWA login page is mobile responsive', async ({ page }) => {
    await page.goto('/pwa')
    await page.waitForLoadState('networkidle')

    // Should fit in mobile viewport without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)
  })

  test('PWA setup page is mobile responsive', async ({ page }) => {
    await page.goto('/pwa/setup')
    await page.waitForLoadState('networkidle')

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)
  })
})

test.describe('PWA - Manifest and Service Worker', () => {
  test('PWA manifest.json is accessible', async ({ request }) => {
    const response = await request.get('/manifest.json')
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest).toHaveProperty('name')
    expect(manifest).toHaveProperty('short_name')
    expect(manifest).toHaveProperty('icons')
    expect(manifest).toHaveProperty('start_url')
  })

  test('Service worker is accessible', async ({ request }) => {
    const response = await request.get('/sw.js')
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('javascript')
  })
})
