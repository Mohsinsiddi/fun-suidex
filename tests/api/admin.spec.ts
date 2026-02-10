import { test, expect, APIRequestContext } from '@playwright/test'

// ============================================
// Admin API Tests
// Covers: auth, response shapes, filters,
// pagination, sorting for all admin endpoints
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

      // Extract cookies from response headers
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

// ============================================
// Auth
// ============================================

test.describe('Admin Auth', () => {
  test('login with valid credentials returns success', async ({ request }) => {
    const res = await request.post('/api/admin/auth/login', {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.username).toBe(ADMIN_USERNAME)
    expect(json.data.role).toBeTruthy()
    expect(json.data.permissions).toBeTruthy()
  })

  test('login with wrong password returns 401', async ({ request }) => {
    const res = await request.post('/api/admin/auth/login', {
      data: { username: ADMIN_USERNAME, password: 'wrongpass' },
    })
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  test('login with empty body returns 400 or 401', async ({ request }) => {
    const res = await request.post('/api/admin/auth/login', {
      data: {},
    })
    expect([400, 401]).toContain(res.status())
  })

  test('all admin APIs reject unauthenticated requests', async ({ request }) => {
    const endpoints = [
      '/api/admin/stats',
      '/api/admin/users',
      '/api/admin/distribute',
      '/api/admin/revenue',
      '/api/admin/affiliates',
      '/api/admin/config',
      '/api/admin/logs',
      '/api/admin/distribute/sync',
    ]

    for (const url of endpoints) {
      const res = await request.get(url)
      expect(res.status(), `${url} should require auth`).toBe(401)
    }
  })
})

// ============================================
// Authenticated tests — run serially to share session
// ============================================

test.describe('Admin APIs (authenticated)', () => {
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
  // Stats API
  // ------------------------------------------

  test.describe('Stats API', () => {
    test('returns expected shape', async ({ request }) => {
      const res = await request.get('/api/admin/stats', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)

      const d = json.data
      expect(typeof d.totalUsers).toBe('number')
      expect(typeof d.totalSpins).toBe('number')
      expect(typeof d.totalRevenueSUI).toBe('number')
      expect(typeof d.pendingPrizes).toBe('number')
      expect(d.totalUsers).toBeGreaterThanOrEqual(0)
      expect(d.totalSpins).toBeGreaterThanOrEqual(0)
    })
  })

  // ------------------------------------------
  // Distribute API
  // ------------------------------------------

  test.describe('Distribute API', () => {
    test('returns items array and stats for pending tab', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=pending', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
      expect(json.data.stats).toBeTruthy()
      expect(typeof json.data.stats.pending).toBe('object')
      expect(typeof json.data.stats.distributed).toBe('object')
      expect(typeof json.data.stats.failed).toBe('object')
      expect(json.pagination).toBeTruthy()
    })

    test('returns items for distributed tab', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=distributed', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
    })

    test('returns items for failed tab', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=failed', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
    })

    test('pagination limits results', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=pending&page=1&limit=5', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(5)
      expect(json.data.items.length).toBeLessThanOrEqual(5)
    })

    test('prizeType filter returns matching items', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=pending&prizeType=suitrump', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const item of json.data.items) {
        expect(item.prizeType).toBe('suitrump')
      }
    })

    test('wallet search filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/distribute?status=pending&wallet=0x', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })
  })

  // ------------------------------------------
  // Revenue API
  // ------------------------------------------

  test.describe('Revenue API', () => {
    test('returns stats and recentPayments', async ({ request }) => {
      const res = await request.get('/api/admin/revenue', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.stats).toBeTruthy()
      expect(typeof json.data.stats.totalRevenueSUI).toBe('number')
      expect(typeof json.data.stats.totalPayments).toBe('number')
      expect(Array.isArray(json.data.recentPayments)).toBe(true)
    })

    test('pagination limits results', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?page=1&limit=3', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(3)
      expect(json.data.recentPayments.length).toBeLessThanOrEqual(3)
    })

    test('status filter returns matching payments', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?status=claimed', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const p of json.data.recentPayments) {
        expect(p.claimStatus).toBe('claimed')
      }
    })

    test('date range filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?dateFrom=2024-01-01&dateTo=2030-12-31', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    test('sorting by amount desc returns ordered results', async ({ request }) => {
      const res = await request.get('/api/admin/revenue?sortBy=amountSUI&sortOrder=desc&limit=20', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      const amounts = json.data.recentPayments.map((p: any) => p.amountSUI)
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i])
      }
    })
  })

  // ------------------------------------------
  // Users API
  // ------------------------------------------

  test.describe('Users API', () => {
    test('returns users array with pagination', async ({ request }) => {
      const res = await request.get('/api/admin/users', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data || json.items)).toBe(true)
      expect(json.pagination).toBeTruthy()
      expect(json.pagination.total).toBeGreaterThanOrEqual(0)
    })

    test('pagination limits results', async ({ request }) => {
      const res = await request.get('/api/admin/users?page=1&limit=5', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect((json.data || json.items).length).toBeLessThanOrEqual(5)
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(5)
    })

    test('search filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/users?search=0x', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    test('minSpins filter returns users with enough spins', async ({ request }) => {
      const res = await request.get('/api/admin/users?minSpins=1', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const u of (json.data || json.items)) {
        expect(u.totalSpins).toBeGreaterThanOrEqual(1)
      }
    })

    test('sorting by totalSpins desc returns ordered results', async ({ request }) => {
      const res = await request.get('/api/admin/users?sortBy=totalSpins&sortOrder=desc&limit=10', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      const spins = (json.data || json.items).map((u: any) => u.totalSpins)
      for (let i = 1; i < spins.length; i++) {
        expect(spins[i - 1]).toBeGreaterThanOrEqual(spins[i])
      }
    })

    test('date range filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/users?dateFrom=2024-01-01&dateTo=2030-12-31', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    test('users include badgeCount field', async ({ request }) => {
      const res = await request.get('/api/admin/users?limit=5', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const u of (json.data || json.items)) {
        expect(typeof u.badgeCount).toBe('number')
      }
    })
  })

  // ------------------------------------------
  // Affiliates API
  // ------------------------------------------

  test.describe('Affiliates API', () => {
    test('returns items, stats, and pagination', async ({ request }) => {
      const res = await request.get('/api/admin/affiliates', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
      expect(json.data.stats).toBeTruthy()
      expect(typeof json.data.stats.pendingTweet).toBe('number')
      expect(typeof json.data.stats.ready).toBe('number')
      expect(typeof json.data.stats.paid).toBe('number')
      expect(json.pagination).toBeTruthy()
    })

    test('status filter returns matching items', async ({ request }) => {
      const res = await request.get('/api/admin/affiliates?status=ready', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const item of json.data.items) {
        expect(item.payoutStatus).toBe('ready')
      }
    })

    test('pagination limits results', async ({ request }) => {
      const res = await request.get('/api/admin/affiliates?page=1&limit=3', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.data.items.length).toBeLessThanOrEqual(3)
      expect(json.pagination.page).toBe(1)
    })

    test('date range filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/affiliates?dateFrom=2024-01-01&dateTo=2030-12-31', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    test('sorting by rewardValueUSD desc returns ordered results', async ({ request }) => {
      const res = await request.get('/api/admin/affiliates?sortBy=rewardValueUSD&sortOrder=desc', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      const values = json.data.items.map((i: any) => i.rewardValueUSD)
      for (let j = 1; j < values.length; j++) {
        expect(values[j - 1]).toBeGreaterThanOrEqual(values[j])
      }
    })
  })

  // ------------------------------------------
  // Audit Logs API
  // ------------------------------------------

  test.describe('Audit Logs API', () => {
    test('returns items array and pagination', async ({ request }) => {
      const res = await request.get('/api/admin/logs', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
      expect(json.pagination).toBeTruthy()
    })

    test('pagination limits results', async ({ request }) => {
      const res = await request.get('/api/admin/logs?page=1&limit=5', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.data.items.length).toBeLessThanOrEqual(5)
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(5)
    })

    test('action filter returns matching logs', async ({ request }) => {
      const res = await request.get('/api/admin/logs?action=distribute_prize', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const log of json.data.items) {
        expect(log.action.toLowerCase()).toContain('distribute')
      }
    })

    test('targetType filter returns matching logs', async ({ request }) => {
      const res = await request.get('/api/admin/logs?targetType=spin', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const log of json.data.items) {
        expect(log.targetType).toBe('spin')
      }
    })

    test('adminUsername filter returns matching logs', async ({ request }) => {
      const res = await request.get(`/api/admin/logs?adminUsername=${ADMIN_USERNAME}`, { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const log of json.data.items) {
        expect(log.adminUsername.toLowerCase()).toContain(ADMIN_USERNAME.toLowerCase())
      }
    })

    test('date range filter accepted', async ({ request }) => {
      const res = await request.get('/api/admin/logs?dateFrom=2024-01-01&dateTo=2030-12-31', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    test('log entries have required fields', async ({ request }) => {
      const res = await request.get('/api/admin/logs?limit=5', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      for (const log of json.data.items) {
        expect(log._id).toBeTruthy()
        expect(typeof log.action).toBe('string')
        expect(typeof log.adminUsername).toBe('string')
        expect(typeof log.targetType).toBe('string')
        expect(log.createdAt).toBeTruthy()
      }
    })
  })

  // ------------------------------------------
  // Config API
  // ------------------------------------------

  test.describe('Config API', () => {
    test('returns config with required fields', async ({ request }) => {
      const res = await request.get('/api/admin/config', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(typeof json.data.spinRateSUI).toBe('number')
      expect(typeof json.data.spinPurchaseEnabled).toBe('boolean')
      expect(typeof json.data.referralEnabled).toBe('boolean')
      expect(Array.isArray(json.data.prizeTable)).toBe(true)
    })

    test('prize table has correct structure', async ({ request }) => {
      const res = await request.get('/api/admin/config', { headers: authHeaders() })
      const json = await res.json()
      const table = json.data.prizeTable
      expect(table.length).toBeGreaterThan(0)
      for (const slot of table) {
        expect(typeof slot.slotIndex).toBe('number')
        expect(typeof slot.type).toBe('string')
        expect(typeof slot.amount).toBe('number')
        expect(typeof slot.weight).toBe('number')
      }
    })
  })

  // ------------------------------------------
  // Sync API
  // ------------------------------------------

  test.describe('Sync API', () => {
    test('GET returns checkpoint status', async ({ request }) => {
      const res = await request.get('/api/admin/distribute/sync', { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(typeof json.data.totalVerified).toBe('number')
      expect(typeof json.data.totalFailed).toBe('number')
      expect(typeof json.data.syncInProgress).toBe('boolean')
    })
  })

  // ------------------------------------------
  // Bulk Distribute API — validation only
  // ------------------------------------------

  test.describe('Bulk Distribute API', () => {
    test('rejects empty spinIds', async ({ request }) => {
      const res = await request.post('/api/admin/distribute/bulk', {
        headers: authHeaders(),
        data: { spinIds: [], txHash: '0x' + 'a'.repeat(64) },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('rejects invalid spinId format', async ({ request }) => {
      const res = await request.post('/api/admin/distribute/bulk', {
        headers: authHeaders(),
        data: { spinIds: ['not-valid'], txHash: '0x' + 'a'.repeat(64) },
      })
      expect(res.status()).toBe(400)
    })

    test('rejects missing txHash', async ({ request }) => {
      const res = await request.post('/api/admin/distribute/bulk', {
        headers: authHeaders(),
        data: { spinIds: ['aaaaaaaaaaaaaaaaaaaaaaaa'], txHash: '' },
      })
      expect(res.status()).toBe(400)
    })

    test('rejects batch over 50 items', async ({ request }) => {
      const ids = Array.from({ length: 51 }, () => 'aaaaaaaaaaaaaaaaaaaaaaaa')
      const res = await request.post('/api/admin/distribute/bulk', {
        headers: authHeaders(),
        data: { spinIds: ids, txHash: '0x' + 'b'.repeat(64) },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('50')
    })
  })
})
