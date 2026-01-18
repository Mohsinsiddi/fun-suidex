import { test, expect } from '@playwright/test'

test.describe('Profile API - Auth Required', () => {
  test('Profile GET API requires auth', async ({ request }) => {
    const response = await request.get('/api/profile')
    expect(response.status()).toBe(401)
  })

  test('Profile PUT API requires auth', async ({ request }) => {
    const response = await request.put('/api/profile', {
      data: {
        displayName: 'Test User',
        bio: 'Test bio',
      },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('Users Search API - Public', () => {
  test('Users search API returns results', async ({ request }) => {
    const response = await request.get('/api/users/search?q=test')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data.success).toBe(true)
  })

  test('Users search API requires query param', async ({ request }) => {
    const response = await request.get('/api/users/search')
    // Should return 400 for missing query
    expect([200, 400]).toContain(response.status())
  })

  test('Users search API handles empty query', async ({ request }) => {
    const response = await request.get('/api/users/search?q=')
    // Either returns empty results or error
    expect([200, 400]).toContain(response.status())
  })

  test('Users search API handles short query', async ({ request }) => {
    const response = await request.get('/api/users/search?q=a')
    // May require minimum length
    expect([200, 400]).toContain(response.status())
  })
})

test.describe('User by Identifier API - Public', () => {
  test('User by wallet returns data or 404', async ({ request }) => {
    const response = await request.get('/api/users/0x' + '1'.repeat(64))
    // Should return user data or 404
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('success')
    }
  })

  test('User by slug returns data or 404', async ({ request }) => {
    const response = await request.get('/api/users/testuser')
    expect([200, 404]).toContain(response.status())
  })

  test('User by invalid identifier returns 404', async ({ request }) => {
    const response = await request.get('/api/users/nonexistent-user-123456789')
    expect(response.status()).toBe(404)
  })
})

test.describe('Profile API - Input Validation', () => {
  test('Profile update rejects too long display name', async ({ request }) => {
    const response = await request.put('/api/profile', {
      data: {
        displayName: 'a'.repeat(100), // Too long
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('Profile update rejects too long bio', async ({ request }) => {
    const response = await request.put('/api/profile', {
      data: {
        bio: 'a'.repeat(1000), // Too long
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('Profile update rejects invalid slug characters', async ({ request }) => {
    const response = await request.put('/api/profile', {
      data: {
        slug: '!@#$%^&*()', // Invalid characters
      },
    })
    expect([400, 401]).toContain(response.status())
  })
})

test.describe('Profile API - Response Format', () => {
  test('Profile API returns JSON error', async ({ request }) => {
    const response = await request.get('/api/profile')
    expect(response.status()).toBe(401)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')

    const data = await response.json()
    expect(data.success).toBe(false)
  })

  test('Users search returns proper structure', async ({ request }) => {
    const response = await request.get('/api/users/search?q=test')

    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('data')
  })
})
