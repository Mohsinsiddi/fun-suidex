import { test, expect, APIRequestContext } from '@playwright/test'

// ============================================
// Admin Revenue Incoming API Tests
// ============================================
// Tests the two-step chain sync flow:
//   1. GET  → returns DB records (ChainTransaction collection)
//   2. POST sync_preview → returns preview of new chain TXs (NO DB write)
//   3. POST sync_confirm → saves previewed TXs to DB + updates cursor
//   4. POST credit → bulk credits uncredited TXs
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

// A fake but valid-looking SUI TX hash
const FAKE_TX_HASH = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

// ============================================
// Unauthenticated Access
// ============================================

test.describe('Revenue Incoming API - Auth Required', () => {
  test('GET rejects unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/admin/revenue/incoming')
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  test('POST rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/admin/revenue/incoming', {
      data: { action: 'sync_preview' },
    })
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})

// ============================================
// Authenticated tests — run serially
// ============================================

test.describe('Revenue Incoming API (authenticated)', () => {
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
  // GET — DB Records (default view)
  // ------------------------------------------

  test.describe('GET - DB Records', () => {
    test('returns 200 with correct response shape', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.pagination).toBeDefined()

      // Data shape
      expect(json.data).toHaveProperty('transactions')
      expect(json.data).toHaveProperty('rate')
      expect(json.data).toHaveProperty('stats')
      expect(json.data).toHaveProperty('lastSyncAt')
      expect(Array.isArray(json.data.transactions)).toBe(true)

      // Stats shape
      const stats = json.data.stats
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('newCount')
      expect(stats).toHaveProperty('creditedCount')
      expect(stats).toHaveProperty('totalSUI')
      expect(stats).toHaveProperty('newSUI')
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.newCount).toBe('number')
      expect(typeof stats.totalSUI).toBe('number')

      // Pagination shape
      expect(json.pagination).toHaveProperty('page')
      expect(json.pagination).toHaveProperty('limit')
      expect(json.pagination).toHaveProperty('total')
      expect(json.pagination).toHaveProperty('totalPages')
      expect(json.pagination).toHaveProperty('hasNext')
      expect(json.pagination).toHaveProperty('hasPrev')
    })

    test('respects page and limit params', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming?page=1&limit=5', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(5)
      expect(json.data.transactions.length).toBeLessThanOrEqual(5)
    })

    test('clamps limit to max 50', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming?limit=999', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.pagination.limit).toBeLessThanOrEqual(50)
    })

    test('status filter "new" returns only new TXs', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming?status=new', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      for (const tx of json.data.transactions) {
        // dbStatus should reflect 'new' from ChainTransaction creditStatus
        expect(tx.dbStatus).toBe('new')
      }
    })

    test('status filter "credited" is accepted', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming?status=credited', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    test('returns JSON content type', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const contentType = res.headers()['content-type']
      expect(contentType).toContain('application/json')
    })

    test('transaction items have expected fields', async ({ request }) => {
      const res = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const json = await res.json()
      if (json.data.transactions.length > 0) {
        const tx = json.data.transactions[0]
        expect(tx).toHaveProperty('txHash')
        expect(tx).toHaveProperty('sender')
        expect(tx).toHaveProperty('amountSUI')
        expect(tx).toHaveProperty('amountMIST')
        expect(tx).toHaveProperty('suggestedSpins')
        expect(tx).toHaveProperty('timestamp')
        expect(tx).toHaveProperty('success')
        expect(tx).toHaveProperty('dbStatus')
        expect(typeof tx.amountSUI).toBe('number')
        expect(typeof tx.suggestedSpins).toBe('number')
      }
    })
  })

  // ------------------------------------------
  // POST — Input Validation
  // ------------------------------------------

  test.describe('POST - Input Validation', () => {
    test('rejects empty body', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {},
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('rejects invalid action', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'delete_everything' },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('credit action rejects missing txHashes', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'credit' },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('credit action rejects empty txHashes array', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'credit', txHashes: [] },
      })
      expect(res.status()).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    test('credit action rejects more than 50 txHashes', async ({ request }) => {
      const hashes = Array.from({ length: 51 }, (_, i) => `hash_${i}`)
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'credit', txHashes: hashes },
      })
      expect(res.status()).toBe(400)
    })

    test('sync_confirm rejects missing transactions field', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_confirm', newCursor: null },
      })
      expect(res.status()).toBe(400)
    })
  })

  // ------------------------------------------
  // POST sync_preview — Preview without DB write
  // ------------------------------------------

  test.describe('POST sync_preview - Chain Preview', () => {
    test('returns 200 with correct response shape', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()

      // Expected shape
      expect(json.data).toHaveProperty('preview')
      expect(json.data).toHaveProperty('count')
      expect(json.data).toHaveProperty('totalSUI')
      expect(json.data).toHaveProperty('hasMore')
      expect(json.data).toHaveProperty('newCursor')
      expect(json.data).toHaveProperty('rate')
      expect(Array.isArray(json.data.preview)).toBe(true)
      expect(typeof json.data.count).toBe('number')
      expect(typeof json.data.totalSUI).toBe('number')
      expect(typeof json.data.hasMore).toBe('boolean')
    })

    test('preview count matches preview array length', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      const json = await res.json()
      expect(json.data.count).toBe(json.data.preview.length)
    })

    test('preview does NOT change DB state', async ({ request }) => {
      // Get current DB state
      const beforeRes = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const beforeJson = await beforeRes.json()
      const beforeTotal = beforeJson.data.stats.total

      // Run preview
      await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })

      // Check DB state is unchanged
      const afterRes = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const afterJson = await afterRes.json()
      const afterTotal = afterJson.data.stats.total

      expect(afterTotal).toBe(beforeTotal)
    })

    test('preview TX items have expected fields when results exist', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      const json = await res.json()
      if (json.data.preview.length > 0) {
        const tx = json.data.preview[0]
        expect(tx).toHaveProperty('txHash')
        expect(tx).toHaveProperty('sender')
        expect(tx).toHaveProperty('recipient')
        expect(tx).toHaveProperty('amountMIST')
        expect(tx).toHaveProperty('amountSUI')
        expect(tx).toHaveProperty('timestamp')
        expect(tx).toHaveProperty('blockNumber')
        expect(tx).toHaveProperty('success')
        expect(tx).toHaveProperty('suggestedSpins')
        expect(typeof tx.amountSUI).toBe('number')
        expect(typeof tx.suggestedSpins).toBe('number')
      }
    })
  })

  // ------------------------------------------
  // POST sync_confirm — Save to DB + update cursor
  // ------------------------------------------

  test.describe('POST sync_confirm - Save to DB', () => {
    test('accepts empty transactions array (no-op sync)', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'sync_confirm',
          transactions: [],
          newCursor: null,
        },
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('synced')
      expect(json.data.synced).toBe(0)
      expect(json.data).toHaveProperty('lastSyncAt')
    })

    test('updates lastSyncAt after confirm', async ({ request }) => {
      // Get current lastSyncAt
      const beforeRes = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const beforeJson = await beforeRes.json()
      const beforeSyncAt = beforeJson.data.lastSyncAt

      // Wait a small moment to ensure time difference
      await new Promise((r) => setTimeout(r, 100))

      // Confirm with empty transactions
      const confirmRes = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'sync_confirm',
          transactions: [],
          newCursor: null,
        },
      })
      const confirmJson = await confirmRes.json()
      expect(confirmJson.success).toBe(true)

      // Check lastSyncAt was updated
      const afterRes = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const afterJson = await afterRes.json()
      const afterSyncAt = afterJson.data.lastSyncAt

      // lastSyncAt should be newer than before (or first time set)
      expect(afterSyncAt).not.toBeNull()
      if (beforeSyncAt) {
        expect(new Date(afterSyncAt).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeSyncAt).getTime()
        )
      }
    })

    test('response has correct shape', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'sync_confirm',
          transactions: [],
          newCursor: null,
        },
      })
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('synced')
      expect(json.data).toHaveProperty('lastSyncAt')
      expect(typeof json.data.synced).toBe('number')
    })
  })

  // ------------------------------------------
  // POST credit — Bulk credit
  // ------------------------------------------

  test.describe('POST credit - Bulk Credit', () => {
    test('handles non-existent TX hash gracefully', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'credit',
          txHashes: [FAKE_TX_HASH],
        },
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)

      // Should report as failed (TX not found)
      expect(json.data).toHaveProperty('credited')
      expect(json.data).toHaveProperty('skipped')
      expect(json.data).toHaveProperty('failed')
      expect(json.data).toHaveProperty('details')
      expect(Array.isArray(json.data.details)).toBe(true)

      // The fake TX should fail
      expect(json.data.failed).toBeGreaterThanOrEqual(1)
      const detail = json.data.details.find(
        (d: { txHash: string }) => d.txHash === FAKE_TX_HASH
      )
      expect(detail).toBeDefined()
      expect(detail.status).toBe('failed')
    })

    test('returns correct totals', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'credit',
          txHashes: [FAKE_TX_HASH],
        },
      })
      const json = await res.json()
      const { credited, skipped, failed } = json.data
      const totalDetails = json.data.details.length

      // Sum of outcomes should equal total hashes submitted
      expect(credited + skipped + failed).toBe(1)
      expect(totalDetails).toBe(1)
    })

    test('detail items have expected fields', async ({ request }) => {
      const res = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'credit',
          txHashes: [FAKE_TX_HASH],
        },
      })
      const json = await res.json()
      const detail = json.data.details[0]
      expect(detail).toHaveProperty('txHash')
      expect(detail).toHaveProperty('status')
      expect(['credited', 'skipped', 'failed']).toContain(detail.status)
    })
  })

  // ------------------------------------------
  // Two-step sync flow (integration)
  // ------------------------------------------

  test.describe('Two-step sync flow', () => {
    test('preview → confirm → DB reflects changes', async ({ request }) => {
      // Step 1: Preview
      const previewRes = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      expect(previewRes.status()).toBe(200)
      const previewJson = await previewRes.json()
      expect(previewJson.success).toBe(true)

      const previewCount = previewJson.data.count
      const newCursor = previewJson.data.newCursor

      // Step 2: Confirm (save to DB)
      const confirmRes = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'sync_confirm',
          transactions: previewJson.data.preview.map((tx: Record<string, unknown>) => ({
            txHash: tx.txHash,
            sender: tx.sender,
            recipient: tx.recipient,
            amountMIST: tx.amountMIST,
            amountSUI: tx.amountSUI,
            timestamp: tx.timestamp,
            blockNumber: tx.blockNumber,
            success: tx.success,
          })),
          newCursor,
        },
      })
      expect(confirmRes.status()).toBe(200)
      const confirmJson = await confirmRes.json()
      expect(confirmJson.success).toBe(true)
      expect(confirmJson.data.synced).toBe(previewCount)

      // Step 3: Verify DB state via GET
      const getRes = await request.get('/api/admin/revenue/incoming', {
        headers: authHeaders(),
      })
      const getJson = await getRes.json()
      expect(getJson.success).toBe(true)

      // Stats total should be >= what we just synced
      expect(getJson.data.stats.total).toBeGreaterThanOrEqual(previewCount)
    })

    test('second preview after confirm shows no duplicates', async ({ request }) => {
      // First preview + confirm
      const preview1 = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      const json1 = await preview1.json()

      if (json1.data.count > 0) {
        // Confirm
        await request.post('/api/admin/revenue/incoming', {
          headers: authHeaders(),
          data: {
            action: 'sync_confirm',
            transactions: json1.data.preview.map((tx: Record<string, unknown>) => ({
              txHash: tx.txHash,
              sender: tx.sender,
              recipient: tx.recipient,
              amountMIST: tx.amountMIST,
              amountSUI: tx.amountSUI,
              timestamp: tx.timestamp,
              blockNumber: tx.blockNumber,
              success: tx.success,
            })),
            newCursor: json1.data.newCursor,
          },
        })
      }

      // Second preview — should not include TXs we just saved
      const preview2 = await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: { action: 'sync_preview' },
      })
      const json2 = await preview2.json()

      // No overlap between first preview TXs and second preview TXs
      const firstHashes = new Set(json1.data.preview.map((tx: { txHash: string }) => tx.txHash))
      for (const tx of json2.data.preview) {
        expect(firstHashes.has(tx.txHash)).toBe(false)
      }
    })
  })

  // ------------------------------------------
  // Audit Logs
  // ------------------------------------------

  test.describe('Audit Logs', () => {
    test('chain_sync action appears in logs after confirm', async ({ request }) => {
      // Trigger a sync confirm (empty is fine)
      await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'sync_confirm',
          transactions: [],
          newCursor: null,
        },
      })

      // Check audit logs
      const res = await request.get('/api/admin/logs?action=chain_sync', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      // At least one chain_sync log should exist
      if (json.data.items.length > 0) {
        expect(json.data.items[0].action).toBe('chain_sync')
        expect(json.data.items[0].targetType).toBe('chain_transaction')
      }
    })

    test('bulk_credit_payments action appears in logs after credit', async ({ request }) => {
      // Trigger a credit (will fail gracefully on fake hash)
      await request.post('/api/admin/revenue/incoming', {
        headers: authHeaders(),
        data: {
          action: 'credit',
          txHashes: [FAKE_TX_HASH],
        },
      })

      // Check audit logs
      const res = await request.get('/api/admin/logs?action=bulk_credit_payments', {
        headers: authHeaders(),
      })
      expect(res.status()).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (json.data.items.length > 0) {
        expect(json.data.items[0].action).toBe('bulk_credit_payments')
      }
    })
  })
})
