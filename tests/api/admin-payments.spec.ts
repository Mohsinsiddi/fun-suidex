import { test, expect, APIRequestContext } from '@playwright/test'

// ============================================
// Admin Payment Approve/Reject API Tests
// ============================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin'

// Helper: login with retry (handles cold-start 500s)
async function getAdminCookies(request: APIRequestContext): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2000))
      }

      const res = await request.post('/api/admin/auth/login', {
        data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
      })

      if (res.status() !== 200) {
        lastError = new Error(`Login returned ${res.status()}`)
        continue
      }

      const json = await res.json()
      if (!json.success) {
        lastError = new Error(`Login failed: ${json.error}`)
        continue
      }

      const headers = res.headersArray()
      const cookieParts: string[] = []
      for (const h of headers) {
        if (h.name.toLowerCase() === 'set-cookie') {
          const name = h.value.split(';')[0].trim()
          if (name) cookieParts.push(name)
        }
      }

      if (cookieParts.length === 0) {
        lastError = new Error('No cookies in login response')
        continue
      }

      return cookieParts.join('; ')
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError || new Error('Login failed after 3 attempts')
}

// A fake but valid-format Mongo ObjectId
const FAKE_PAYMENT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa'

// ============================================
// Unauthenticated Access
// ============================================

test.describe('Admin Payments API - Auth Required', () => {
  test('approve endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/admin/payments/approve', {
      data: { paymentId: FAKE_PAYMENT_ID },
    })
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  test('reject endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/admin/payments/reject', {
      data: { paymentId: FAKE_PAYMENT_ID },
    })
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})

// ============================================
// Invalid Actions
// ============================================

test.describe('Admin Payments API - Invalid Actions', () => {
  test('invalid action returns 400', async ({ request }) => {
    const cookies = await getAdminCookies(request)
    const res = await request.post('/api/admin/payments/delete', {
      headers: { Cookie: cookies },
      data: { paymentId: FAKE_PAYMENT_ID },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain('Invalid action')
  })

  test('unknown action returns 400', async ({ request }) => {
    const cookies = await getAdminCookies(request)
    const res = await request.post('/api/admin/payments/foobar', {
      headers: { Cookie: cookies },
      data: { paymentId: FAKE_PAYMENT_ID },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})

// ============================================
// Authenticated tests — run serially
// ============================================

test.describe('Admin Payments API (authenticated)', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(60000)

  let cookies: string

  test.beforeAll(async ({ request }) => {
    cookies = await getAdminCookies(request)
  })

  function authHeaders() {
    return { Cookie: cookies }
  }

  // ------------------------------------------
  // Input Validation
  // ------------------------------------------

  test.describe('Approve - Input Validation', () => {
    test('rejects missing paymentId', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: {},
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('rejects invalid paymentId format', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: { paymentId: 'not-a-valid-id' },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('rejects empty string paymentId', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: { paymentId: '' },
      })
      expect(res.status()).toBe(400)
    })

    test('accepts valid paymentId but returns 404 for non-existent payment', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID },
      })
      expect(res.status()).toBe(404)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toContain('not found')
    })

    test('accepts optional note field', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID, note: 'Approved manually' },
      })
      // Should still be 404 (payment doesn't exist) — not 400 (validation)
      expect(res.status()).toBe(404)
    })
  })

  test.describe('Reject - Input Validation', () => {
    test('rejects missing paymentId', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: {},
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('rejects invalid paymentId format', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: { paymentId: 'xyz' },
      })
      expect(res.status()).toBe(400)
    })

    test('accepts valid paymentId but returns 404 for non-existent payment', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID },
      })
      expect(res.status()).toBe(404)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error).toContain('not found')
    })

    test('accepts optional reason field', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID, reason: 'Duplicate transaction' },
      })
      // Should still be 404 (payment doesn't exist) — not 400 (validation)
      expect(res.status()).toBe(404)
    })

    test('rejects reason longer than 500 chars', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID, reason: 'x'.repeat(501) },
      })
      expect(res.status()).toBe(400)
    })
  })

  // ------------------------------------------
  // Response Format
  // ------------------------------------------

  test.describe('Response Format', () => {
    test('approve returns JSON with success field', async ({ request }) => {
      const res = await request.post('/api/admin/payments/approve', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID },
      })

      const contentType = res.headers()['content-type']
      expect(contentType).toContain('application/json')

      const json = await res.json()
      expect(json).toHaveProperty('success')
    })

    test('reject returns JSON with success field', async ({ request }) => {
      const res = await request.post('/api/admin/payments/reject', {
        headers: authHeaders(),
        data: { paymentId: FAKE_PAYMENT_ID },
      })

      const contentType = res.headers()['content-type']
      expect(contentType).toContain('application/json')

      const json = await res.json()
      expect(json).toHaveProperty('success')
    })
  })

  // ------------------------------------------
  // Revenue API - Status Filters
  // ------------------------------------------

  test.describe('Revenue API - Rejected Filter', () => {
    test('rejected status filter is accepted', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?status=rejected', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      // All returned payments (if any) should have rejected status
      for (const p of json.data.recentPayments) {
        expect(p.claimStatus).toBe('rejected')
      }
    })

    test('pending_approval status filter still works', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?status=pending_approval', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const p of json.data.recentPayments) {
        expect(p.claimStatus).toBe('pending_approval')
      }
    })
  })

  // ------------------------------------------
  // Audit Logs - Payment Actions
  // ------------------------------------------

  test.describe('Audit Logs - Payment Action Filters', () => {
    test('approve_payment filter is accepted', async ({ request }) => {
      const res = await request.get('/api/admin/logs?action=approve_payment', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const log of json.data.items) {
        expect(log.action).toBe('approve_payment')
      }
    })

    test('reject_payment filter is accepted', async ({ request }) => {
      const res = await request.get('/api/admin/logs?action=reject_payment', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const log of json.data.items) {
        expect(log.action).toBe('reject_payment')
      }
    })

    test('payment target type filter is accepted', async ({ request }) => {
      const res = await request.get('/api/admin/logs?targetType=payment', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const log of json.data.items) {
        expect(log.targetType).toBe('payment')
      }
    })
  })
})
