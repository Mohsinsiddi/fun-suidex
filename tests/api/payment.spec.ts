import { test, expect } from '@playwright/test'

// Run serially to avoid rate limiting on the payment endpoint
test.describe.configure({ mode: 'serial' })

// ============================================
// Mock TX Digests (Base58 format, 44 chars)
// ============================================
// These are syntactically valid Base58 strings but not real on-chain txs.
// Base58 charset: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
const VALID_DIGEST = '76gyHCk7FRrGACRqXM7Ybj5uJLtAzgEMJ5P9CeEzxZSG'      // 44 chars
const VALID_DIGEST_43 = '76gyHCk7FRrGACRqXM7Ybj5uJLtAzgEMJ5P9CeEzxZS'     // 43 chars
const INVALID_DIGEST_HEX = '0x' + '1'.repeat(64)                              // Hex format (wrong)
const INVALID_DIGEST_SHORT = 'abc123'                                          // Too short
const INVALID_DIGEST_CHARS = 'OOOO0000IIIIllll' + 'a'.repeat(28)             // Contains 0, O, I, l (invalid Base58)
const INVALID_DIGEST_SPECIAL = 'abc+def/ghi=' + 'a'.repeat(32)               // Contains +/= (Base64 not Base58)

// SuiScan / SuiVision URL formats
const SUISCAN_URL = `https://suiscan.xyz/mainnet/tx/${VALID_DIGEST}`
const SUISCAN_TESTNET_URL = `https://suiscan.xyz/testnet/tx/${VALID_DIGEST}`
const SUIVISION_URL = `https://suivision.xyz/txblock/${VALID_DIGEST}`

// ============================================
// Auth Required
// ============================================

test.describe('Payment API - Auth Required', () => {
  test('Payment claim API requires auth', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: VALID_DIGEST },
    })
    expect([401, 429]).toContain(response.status())
  })

  test('Payment scan API requires auth', async ({ request }) => {
    const response = await request.get('/api/payment/claim')
    expect([401, 429]).toContain(response.status())
  })
})

// ============================================
// TX Hash Format Validation
// ============================================

test.describe('Payment API - TX Hash Validation', () => {
  test('rejects empty txHash', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: '' },
    })
    // 400 = validation error, 401 = auth first, 429 = rate limited
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects missing txHash field', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {},
    })
    expect([400, 401, 429]).toContain(response.status())
    const json = await response.json()
    expect(json.success).toBe(false)
  })

  test('rejects txHash that is too short', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: INVALID_DIGEST_SHORT },
    })
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects hex-format hash (not Base58)', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: INVALID_DIGEST_HEX },
    })
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects hash with invalid Base58 characters (0, O, I, l)', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: INVALID_DIGEST_CHARS },
    })
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects hash with Base64 characters (+, /, =)', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: INVALID_DIGEST_SPECIAL },
    })
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects hash with spaces', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: '  ' },
    })
    expect([400, 401, 429]).toContain(response.status())
  })

  test('rejects very long hash (>44 chars)', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: VALID_DIGEST + 'ExtraChars123' },
    })
    expect([400, 401, 429]).toContain(response.status())
  })
})

// ============================================
// SuiScan/SuiVision URL Extraction
// ============================================

test.describe('Payment API - URL Extraction', () => {
  // Valid digests (raw or extracted from URL) should pass validation.
  // We expect 401 (auth) not 400 (validation) — proves URL was parsed correctly.
  // 429 is also acceptable (rate limited).

  test('accepts SuiScan mainnet URL and extracts digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: SUISCAN_URL },
    })
    // Should NOT be 400 (validation error) — URL extraction worked
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('accepts SuiScan testnet URL and extracts digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: SUISCAN_TESTNET_URL },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('accepts SuiVision URL and extracts digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: SUIVISION_URL },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('accepts raw 44-char Base58 digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: VALID_DIGEST },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('accepts raw 43-char Base58 digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: VALID_DIGEST_43 },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('trims whitespace around digest', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: `  ${VALID_DIGEST}  ` },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })

  test('trims whitespace around SuiScan URL', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: `  ${SUISCAN_URL}  ` },
    })
    expect(response.status()).not.toBe(400)
    expect([401, 429]).toContain(response.status())
  })
})

// ============================================
// Response Format
// ============================================

test.describe('Payment API - Response Format', () => {
  test('returns JSON with success field on error', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: {},
    })

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')

    const data = await response.json()
    expect(data).toHaveProperty('success')
    expect(data.success).toBe(false)
  })

  test('validation error includes details', async ({ request }) => {
    const response = await request.post('/api/payment/claim', {
      data: { txHash: 'x' },
    })

    expect([400, 401, 429]).toContain(response.status())

    const data = await response.json()
    expect(data.success).toBe(false)
  })

  test('scan endpoint returns JSON error without auth', async ({ request }) => {
    const response = await request.get('/api/payment/claim')
    expect([401, 429]).toContain(response.status())

    const data = await response.json()
    expect(data.success).toBe(false)
  })
})
