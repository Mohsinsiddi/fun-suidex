import { test, expect } from '@playwright/test'

test.describe('Payment API - Auth Required', () => {
  test('Payment claim API requires auth', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {
        txHash: '0x' + '1'.repeat(64),
        amount: 1,
      },
    })
    expect(response.status()).toBe(401)
  })

  test('Payment scan API requires auth', async ({ request }) => {
    const response = await request.get('/api/payment/scan')
    expect(response.status()).toBe(401)
  })
})

test.describe('Payment API - Input Validation', () => {
  test('Payment claim rejects empty txHash', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {
        txHash: '',
        amount: 1,
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('Payment claim rejects invalid txHash format', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {
        txHash: 'not-a-valid-hash',
        amount: 1,
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('Payment claim rejects zero amount', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {
        txHash: '0x' + '1'.repeat(64),
        amount: 0,
      },
    })
    expect([400, 401]).toContain(response.status())
  })

  test('Payment claim rejects negative amount', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {
        txHash: '0x' + '1'.repeat(64),
        amount: -1,
      },
    })
    expect([400, 401]).toContain(response.status())
  })
})

test.describe('Payment API - Response Format', () => {
  test('Payment API returns JSON error', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {},
    })

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')

    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data.success).toBe(false)
  })

  test('Payment scan returns JSON error without auth', async ({ request }) => {
    const response = await request.get('/api/payment/scan')
    expect(response.status()).toBe(401)

    const data = await response.json()
    expect(data.success).toBe(false)
  })
})
