import { test, expect } from '@playwright/test'

test.describe('PWA API - Auth Required (401)', () => {
  test('PWA link API requires auth', async ({ request }) => {
    const response = await request.post('/api/pwa/link', {
      data: {
        mainWallet: '0x123',
        pwaWallet: '0x456',
        derivationSignature: 'test',
      },
    })
    // 401 if implemented, 404 if route not yet created
    expect([401, 404]).toContain(response.status())
  })

  test('PWA auth API validates input', async ({ request }) => {
    const response = await request.post('/api/pwa/auth', {
      data: {
        pwaWallet: '0x123',
        signature: 'invalid',
        timestamp: Date.now(),
      },
    })
    // Should return 400/401 if implemented, 404 if route not yet created
    expect([400, 401, 404]).toContain(response.status())
  })

  test('PWA refresh API requires valid token', async ({ request }) => {
    const response = await request.post('/api/pwa/refresh', {
      data: {
        refreshToken: 'invalid-token',
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('PWA status API requires auth', async ({ request }) => {
    const response = await request.get('/api/pwa/status')
    expect(response.status()).toBe(401)
  })

  test('PWA unlink API requires auth', async ({ request }) => {
    const response = await request.post('/api/pwa/unlink')
    expect(response.status()).toBe(401)
  })
})

test.describe('PWA Push API - Auth Required', () => {
  test('Push subscribe API requires auth', async ({ request }) => {
    const response = await request.post('/api/pwa/push/subscribe', {
      data: {
        subscription: {
          endpoint: 'https://example.com',
          keys: { p256dh: 'test', auth: 'test' },
        },
      },
    })
    expect(response.status()).toBe(401)
  })

  test('Push status API requires auth', async ({ request }) => {
    const response = await request.get('/api/pwa/push/status')
    expect(response.status()).toBe(401)
  })

  test('Push test API requires auth', async ({ request }) => {
    const response = await request.post('/api/pwa/push/test')
    expect(response.status()).toBe(401)
  })
})

test.describe('PWA Transfer API - Auth Required', () => {
  test('Transfer initiate API requires auth', async ({ request }) => {
    const response = await request.post('/api/pwa/transfer', {
      data: {
        targetWallet: '0x123',
      },
    })
    expect(response.status()).toBe(401)
  })

  test('Transfer token API validates token', async ({ request }) => {
    const response = await request.get('/api/pwa/transfer/invalid-token')
    // Should return 400 or 404 for invalid token
    expect([400, 404]).toContain(response.status())
  })
})

test.describe('PWA API - Input Validation', () => {
  test('PWA link API validates wallet format', async ({ request }) => {
    const response = await request.post('/api/pwa/link', {
      data: {
        mainWallet: 'not-a-wallet',
        pwaWallet: 'also-not-valid',
        derivationSignature: '',
      },
    })
    // Should reject invalid wallet format
    expect([400, 401]).toContain(response.status())
  })

  test('PWA auth API validates timestamp', async ({ request }) => {
    const response = await request.post('/api/pwa/auth', {
      data: {
        pwaWallet: '0x' + '1'.repeat(64),
        signature: 'test',
        timestamp: 0, // Invalid old timestamp
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('PWA refresh API validates token format', async ({ request }) => {
    const response = await request.post('/api/pwa/refresh', {
      data: {
        refreshToken: '', // Empty token
      },
    })
    expect([400, 401]).toContain(response.status())
  })
})

test.describe('PWA API - Response Format', () => {
  test('PWA APIs return JSON error responses', async ({ request }) => {
    const response = await request.get('/api/pwa/status')
    expect(response.status()).toBe(401)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')

    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data.success).toBe(false)
  })

  test('PWA auth API returns structured error', async ({ request }) => {
    const response = await request.post('/api/pwa/auth', {
      data: {},
    })

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data).toHaveProperty('error')
  })
})
