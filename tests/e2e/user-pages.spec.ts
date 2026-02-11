import { test, expect } from '@playwright/test'

test.describe('User Pages - Public', () => {
  test('Landing page loads', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Wheel page loads', async ({ page }) => {
    const response = await page.goto('/wheel')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Leaderboard page loads', async ({ page }) => {
    const response = await page.goto('/leaderboard')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Badges page loads', async ({ page }) => {
    const response = await page.goto('/badges')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Profile page loads', async ({ page }) => {
    const response = await page.goto('/profile')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Referral page loads', async ({ page }) => {
    const response = await page.goto('/referral')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Activity page loads', async ({ page }) => {
    const response = await page.goto('/activity')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Docs page loads', async ({ page }) => {
    const response = await page.goto('/docs')
    expect(response?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('User Pages - Performance', () => {
  const pages = [
    { name: 'Landing', path: '/' },
    { name: 'Wheel', path: '/wheel' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Badges', path: '/badges' },
    { name: 'Profile', path: '/profile' },
    { name: 'Referral', path: '/referral' },
    { name: 'Activity', path: '/activity' },
    { name: 'Docs', path: '/docs' },
  ]

  for (const { name, path } of pages) {
    test(`${name} page load time < 10s`, async ({ page }) => {
      const start = Date.now()
      await page.goto(path, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - start

      console.log(`${name} page loaded in ${loadTime}ms`)
      expect(loadTime).toBeLessThan(10000)
    })
  }
})

test.describe('API Responses - Public', () => {
  test('Config API returns valid data with tokenPrices', async ({ request }) => {
    const response = await request.get('/api/config')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('prizeTable')
    expect(data.data).toHaveProperty('tokenPrices')
    expect(typeof data.data.tokenPrices.vict).toBe('number')
    expect(typeof data.data.tokenPrices.trump).toBe('number')
  })

  test('Prices API returns token prices', async ({ request }) => {
    const response = await request.get('/api/prices')
    // 200 if prices fetched, 502 if external API down
    expect([200, 502]).toContain(response.status())

    const data = await response.json()
    if (response.status() === 200) {
      expect(data.success).toBe(true)
      expect(typeof data.data.vict).toBe('number')
      expect(typeof data.data.trump).toBe('number')
      expect(typeof data.data.updatedAt).toBe('number')
      expect(data.data.vict).toBeGreaterThanOrEqual(0)
      expect(data.data.trump).toBeGreaterThanOrEqual(0)
    } else {
      expect(data.success).toBe(false)
    }
  })

  test('Leaderboard API returns valid data', async ({ request }) => {
    const response = await request.get('/api/leaderboard?type=spins&page=1&limit=10')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })

  test('Activity API returns valid data', async ({ request }) => {
    const response = await request.get('/api/activity?limit=10')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })

  test('Badges API returns valid data', async ({ request }) => {
    const response = await request.get('/api/badges')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

test.describe('API Responses - Auth Required', () => {
  test('Auth me API returns error without auth', async ({ request }) => {
    const response = await request.get('/api/auth/me')
    // API returns 401 when not authenticated
    expect(response.status()).toBe(401)
  })

  test('Spin API returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/spin')
    expect(response.status()).toBe(401)
  })

  test('Spin history API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/spin/history')
    expect(response.status()).toBe(401)
  })
})
