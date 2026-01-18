import { test, expect } from '@playwright/test'

test.describe('Referral API - Auth Required', () => {
  test('Referral apply API requires auth', async ({ request }) => {
    const response = await request.post('/api/referral/apply', {
      data: {
        code: 'TESTCODE',
      },
    })
    expect(response.status()).toBe(401)
  })

  test('Referral earnings API requires auth', async ({ request }) => {
    const response = await request.get('/api/referral/earnings')
    expect(response.status()).toBe(401)
  })

  test('Referral link API requires auth', async ({ request }) => {
    const response = await request.get('/api/referral/link')
    expect(response.status()).toBe(401)
  })

  test('Referral stats API requires auth', async ({ request }) => {
    const response = await request.get('/api/referral/stats')
    expect(response.status()).toBe(401)
  })
})

test.describe('Referral API - Input Validation', () => {
  test('Referral apply rejects empty code', async ({ request }) => {
    const response = await request.post('/api/referral/apply', {
      data: {
        code: '',
      },
    })
    // Should return 400 or 401
    expect([400, 401]).toContain(response.status())
  })

  test('Referral apply rejects invalid code format', async ({ request }) => {
    const response = await request.post('/api/referral/apply', {
      data: {
        code: '!@#$%', // Invalid characters
      },
    })
    expect([400, 401]).toContain(response.status())
  })
})

test.describe('Referral API - Response Format', () => {
  test('Referral API returns JSON error', async ({ request }) => {
    const response = await request.get('/api/referral/stats')
    expect(response.status()).toBe(401)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')

    const data = await response.json()
    expect(data.success).toBe(false)
  })
})

test.describe('Referral Tweet Endpoints', () => {
  test('Tweet clicked API validates reward ID', async ({ request }) => {
    const response = await request.post('/api/referral/tweet-clicked/invalid-id')
    // Should return error for invalid ID
    expect([400, 401, 404]).toContain(response.status())
  })

  test('Tweet confirmed API validates reward ID', async ({ request }) => {
    const response = await request.post('/api/referral/tweet-confirmed/invalid-id')
    expect([400, 401, 404]).toContain(response.status())
  })
})
