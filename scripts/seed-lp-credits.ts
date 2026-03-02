#!/usr/bin/env tsx
// ============================================
// CLI: Seed LP Credits via API + Full Validation Tests
// ============================================
// Usage: pnpm tsx scripts/seed-lp-credits.ts
// Requires: dev server running (pnpm dev) on localhost:3000

import { config } from 'dotenv'
config({ path: '.env.local' })

import crypto from 'crypto'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { UserModel, LPCreditModel } from '../lib/db/models'

// ----------------------------------------
// Configuration
// ----------------------------------------

const API_URL = 'http://localhost:3000/api/indexer/credit-spins'
const API_KEY = process.env.INDEXER_API_KEY || ''
const TOTAL_CREDITS = 50

const LP_PAIR_IDS = ['sui-victory', 'victory-usdc', 'wbtc-victory'] as const
const SWAP_PAIR_IDS = ['sui-victory-swap', 'usdc-victory-swap', 'wbtc-victory-swap'] as const
const EVENT_TYPES = ['lp_stake', 'swap'] as const

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function generateFakeTxHash(): string {
  return 'seed_' + crypto.randomBytes(20).toString('base64url')
}

// ----------------------------------------
// API helper
// ----------------------------------------

async function callAPI(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { status: res.status, data }
}

// ----------------------------------------
// Validation tests
// ----------------------------------------

async function runValidationTests(sampleWallet: string) {
  let passed = 0
  let failed = 0

  const test = (name: string, ok: boolean, detail: string) => {
    if (ok) {
      passed++
      console.log(`  ✅ ${name}`)
    } else {
      failed++
      console.log(`  ❌ ${name} — ${detail}`)
    }
  }

  console.log('\n🔒 Running API validation tests...\n')

  // 1. No API key
  const r1 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_nokey', eventType: 'swap', pair: 'sui-victory-swap', amountUSD: 50 }
  )
  test('No API key → 401', r1.status === 401, `Got ${r1.status}`)

  // 2. Wrong API key
  const r2 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_wrongkey', eventType: 'swap', pair: 'sui-victory-swap', amountUSD: 50 },
    { 'x-indexer-key': 'wrong-key-12345' }
  )
  test('Wrong API key → 401', r2.status === 401, `Got ${r2.status}`)

  // 3. Missing required fields
  const r3 = await callAPI(
    { wallet: sampleWallet },
    { 'x-indexer-key': API_KEY }
  )
  test('Missing fields → 400', r3.status === 400, `Got ${r3.status}: ${r3.data.error}`)

  // 4. Invalid eventType
  const r4 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_badtype', eventType: 'invalid', pair: 'sui-victory', amountUSD: 50 },
    { 'x-indexer-key': API_KEY }
  )
  test('Invalid eventType → 400', r4.status === 400, `Got ${r4.status}: ${r4.data.error}`)

  // 5. Negative amountUSD
  const r5 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_negamt', eventType: 'swap', pair: 'sui-victory-swap', amountUSD: -10 },
    { 'x-indexer-key': API_KEY }
  )
  test('Negative amountUSD → 400', r5.status === 400, `Got ${r5.status}: ${r5.data.error}`)

  // 6. amountUSD as string
  const r6 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_stramt', eventType: 'swap', pair: 'sui-victory-swap', amountUSD: 'fifty' },
    { 'x-indexer-key': API_KEY }
  )
  test('String amountUSD → 400', r6.status === 400, `Got ${r6.status}: ${r6.data.error}`)

  // 7. Invalid pair
  const r7 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_badpair', eventType: 'swap', pair: 'DOGE/PEPE', amountUSD: 50 },
    { 'x-indexer-key': API_KEY }
  )
  test('Invalid pair → 400', r7.status === 400 && String(r7.data.error).includes('Valid pairs'), `Got ${r7.status}: ${r7.data.error}`)

  // 8. Valid request
  const txHash = 'test_valid_' + crypto.randomBytes(8).toString('hex')
  const r8 = await callAPI(
    { wallet: sampleWallet, txHash, eventType: 'lp_stake', pair: 'sui-victory', amountUSD: 100 },
    { 'x-indexer-key': API_KEY }
  )
  test('Valid request → 200', r8.status === 200 && r8.data.success === true, `Got ${r8.status}: ${JSON.stringify(r8.data)}`)

  // 9. Duplicate txHash (idempotent)
  const r9 = await callAPI(
    { wallet: sampleWallet, txHash, eventType: 'lp_stake', pair: 'sui-victory', amountUSD: 100 },
    { 'x-indexer-key': API_KEY }
  )
  test('Duplicate txHash → 200 (idempotent)', r9.status === 200 && (r9.data.data as Record<string, unknown>)?.duplicate === true, `Got ${r9.status}: ${JSON.stringify(r9.data)}`)

  // 10. Zero amountUSD (valid, 0 spins)
  const r10 = await callAPI(
    { wallet: sampleWallet, txHash: 'test_zero_' + crypto.randomBytes(4).toString('hex'), eventType: 'swap', pair: 'sui-victory-swap', amountUSD: 0 },
    { 'x-indexer-key': API_KEY }
  )
  test('Zero amountUSD → 200 (0 spins)', r10.status === 200, `Got ${r10.status}: ${JSON.stringify(r10.data)}`)

  console.log(`\n   Results: ${passed} passed, ${failed} failed out of ${passed + failed}\n`)
  return failed === 0
}

// ----------------------------------------
// Seed via API
// ----------------------------------------

async function seedViaAPI(wallets: string[]) {
  console.log(`📝 Seeding ${TOTAL_CREDITS} entries via API...\n`)

  let success = 0
  let errors = 0

  for (let i = 0; i < TOTAL_CREDITS; i++) {
    const wallet = randomFrom(wallets)
    const eventType = randomFrom(EVENT_TYPES)
    const pair = eventType === 'lp_stake' ? randomFrom(LP_PAIR_IDS) : randomFrom(SWAP_PAIR_IDS)
    const amountUSD = randomBetween(10, 500)
    const txHash = generateFakeTxHash()

    const res = await callAPI(
      { wallet, txHash, eventType, pair, amountUSD },
      { 'x-indexer-key': API_KEY }
    )

    if (res.status === 200 && res.data.success) {
      success++
    } else {
      errors++
      console.log(`  ⚠️  Entry ${i + 1} failed: ${res.status} ${res.data.error}`)
    }

    // Progress every 10
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`   ${i + 1}/${TOTAL_CREDITS} sent\r`)
    }
  }

  console.log(`\n   ✅ ${success} credited, ❌ ${errors} failed\n`)
  return success
}

// ----------------------------------------
// Main
// ----------------------------------------

async function main() {
  if (!API_KEY) {
    console.error('❌ INDEXER_API_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('\n🔌 Connecting to database...')
  await connectDB()

  // Fetch existing wallets
  console.log('📋 Fetching existing user wallets...')
  const users = await UserModel.find({}).select('wallet').limit(30).lean()
  const wallets = users.length > 0
    ? users.map((u) => u.wallet)
    : Array.from({ length: 15 }, () => '0x' + crypto.randomBytes(32).toString('hex'))
  console.log(`   Found ${wallets.length} wallets\n`)

  // Clear existing LP credits
  const existingCount = await LPCreditModel.countDocuments()
  if (existingCount > 0) {
    console.log(`🗑️  Clearing ${existingCount} existing LP credits...`)
    await LPCreditModel.deleteMany({})
  }

  await disconnectDB()

  // Run validation tests first
  const allPassed = await runValidationTests(wallets[0])

  if (!allPassed) {
    console.log('⚠️  Some validation tests failed! Seeding anyway...\n')
  }

  // Seed via API
  const seeded = await seedViaAPI(wallets)

  // Verify final count
  await connectDB()
  const finalCount = await LPCreditModel.countDocuments()
  const stats = await LPCreditModel.aggregate([
    {
      $group: {
        _id: null,
        totalSpins: { $sum: '$spinsCredited' },
        totalUSD: { $sum: '$amountUSD' },
        wallets: { $addToSet: '$wallet' },
      },
    },
  ])

  console.log('📊 Final DB State:')
  console.log(`   Total entries:  ${finalCount}`)
  console.log(`   Total spins:    ${stats[0]?.totalSpins || 0}`)
  console.log(`   Total USD:      $${(stats[0]?.totalUSD || 0).toFixed(2)}`)
  console.log(`   Unique wallets: ${stats[0]?.wallets?.length || 0}`)

  await disconnectDB()
  console.log('\n✅ Done! Check /admin/lp-credits\n')
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
