#!/usr/bin/env tsx
// ============================================
// Test: Spin Tier Calculation via Indexer API
// ============================================
// Usage: pnpm tsx scripts/test-spin-tiers.ts
// Requires: dev server running (pnpm dev) on localhost:3000

import { config } from 'dotenv'
config({ path: '.env.local' })

import crypto from 'crypto'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { UserModel, LPCreditModel } from '../lib/db/models'

const API_URL = 'http://localhost:3000/api/indexer/credit-spins'
const API_KEY = process.env.INDEXER_API_KEY || ''

// Expected tier table
const TIER_TESTS = [
  { amountUSD: 5,     expectedSpins: 0,  label: 'Below minimum ($5)',  rejected: true },
  { amountUSD: 19.99, expectedSpins: 0,  label: 'Just under $20',     rejected: true },
  { amountUSD: 20,    expectedSpins: 1,  label: 'Tier 1 — $20' },
  { amountUSD: 49.99, expectedSpins: 1,  label: 'Between $20-$50' },
  { amountUSD: 50,    expectedSpins: 2,  label: 'Tier 2 — $50' },
  { amountUSD: 99,    expectedSpins: 2,  label: 'Between $50-$100' },
  { amountUSD: 100,   expectedSpins: 3,  label: 'Tier 3 — $100' },
  { amountUSD: 200,   expectedSpins: 4,  label: 'Tier 4 — $200' },
  { amountUSD: 400,   expectedSpins: 5,  label: 'Tier 5 — $400' },
  { amountUSD: 800,   expectedSpins: 6,  label: 'Tier 6 — $800' },
  { amountUSD: 1600,  expectedSpins: 7,  label: 'Tier 7 — $1,600' },
  { amountUSD: 3200,  expectedSpins: 8,  label: 'Tier 8 — $3,200' },
  { amountUSD: 4000,  expectedSpins: 9,  label: 'Tier 9 — $4,000' },
  { amountUSD: 5000,  expectedSpins: 10, label: 'Tier 10 — $5,000' },
  { amountUSD: 10000, expectedSpins: 10, label: 'Above max ($10,000)' },
  { amountUSD: 50000, expectedSpins: 10, label: 'Way above max ($50,000)' },
]

function randomWallet(): string {
  return '0x' + crypto.randomBytes(32).toString('hex')
}

function randomTxHash(): string {
  return crypto.randomBytes(32).toString('hex')
}

async function testSingleEndpoint() {
  console.log('\n========================================')
  console.log('  SPIN TIER TESTS — Single Endpoint')
  console.log('========================================\n')

  const createdWallets: string[] = []
  const createdTxHashes: string[] = []
  let passed = 0
  let failed = 0

  for (const test of TIER_TESTS) {
    const wallet = randomWallet()
    const txHash = randomTxHash()
    createdWallets.push(wallet)
    createdTxHashes.push(txHash)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-indexer-key': API_KEY,
        },
        body: JSON.stringify({
          wallet,
          txHash,
          eventType: 'lp_stake',
          pair: 'sui-victory',
          amountUSD: test.amountUSD,
        }),
      })

      const data = await res.json()

      // Below-minimum should be rejected with 400
      if ((test as any).rejected) {
        if (!data.success && res.status === 400) {
          console.log(`  PASS  ${test.label} → rejected ($${test.amountUSD} < min)`)
          passed++
        } else {
          console.log(`  FAIL  ${test.label} → should be rejected but got: ${JSON.stringify(data)}`)
          failed++
        }
        continue
      }

      if (!data.success) {
        console.log(`  FAIL  ${test.label} — API error: ${data.error}`)
        failed++
        continue
      }

      const actual = data.data.spinsCredited
      const ok = actual === test.expectedSpins

      if (ok) {
        console.log(`  PASS  ${test.label} → $${test.amountUSD} = ${actual} spins`)
        passed++
      } else {
        console.log(`  FAIL  ${test.label} → $${test.amountUSD} = ${actual} spins (expected ${test.expectedSpins})`)
        failed++
      }
    } catch (err) {
      console.log(`  FAIL  ${test.label} — Request failed: ${err}`)
      failed++
    }
  }

  // Test idempotency — resend the last request
  console.log('\n--- Idempotency Test ---')
  const lastWallet = createdWallets[createdWallets.length - 1]
  const lastTxHash = createdTxHashes[createdTxHashes.length - 1]
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-indexer-key': API_KEY,
      },
      body: JSON.stringify({
        wallet: lastWallet,
        txHash: lastTxHash,
        eventType: 'lp_stake',
        pair: 'sui-victory',
        amountUSD: 50000,
      }),
    })
    const data = await res.json()
    if (data.success && data.data.duplicate === true) {
      console.log(`  PASS  Duplicate txHash correctly detected`)
      passed++
    } else {
      console.log(`  FAIL  Duplicate txHash NOT detected — got: ${JSON.stringify(data)}`)
      failed++
    }
  } catch (err) {
    console.log(`  FAIL  Idempotency test request failed: ${err}`)
    failed++
  }

  return { passed, failed, createdWallets, createdTxHashes }
}

async function testBulkEndpoint() {
  console.log('\n========================================')
  console.log('  SPIN TIER TESTS — Bulk Endpoint')
  console.log('========================================\n')

  const createdWallets: string[] = []
  const createdTxHashes: string[] = []

  // Build a batch of credits — one per tier
  const credits = TIER_TESTS.map((test) => {
    const wallet = randomWallet()
    const txHash = randomTxHash()
    createdWallets.push(wallet)
    createdTxHashes.push(txHash)
    return {
      wallet,
      txHash,
      eventType: 'lp_stake' as const,
      pair: 'sui-victory',
      amountUSD: test.amountUSD,
    }
  })

  let passed = 0
  let failed = 0

  try {
    const res = await fetch(`${API_URL}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-indexer-key': API_KEY,
      },
      body: JSON.stringify({ credits }),
    })

    const data = await res.json()

    if (!data.success) {
      console.log(`  FAIL  Bulk API error: ${data.error}`)
      return { passed: 0, failed: 1, createdWallets, createdTxHashes }
    }

    console.log(`  Bulk response: processed=${data.data.processed}, skipped=${data.data.skipped}, totalCredited=${data.data.totalCredited}`)

    // Expected total spins from all tiers (excluded rejected entries which get skipped in bulk)
    const expectedTotal = TIER_TESTS.filter((t) => !(t as any).rejected).reduce((sum, t) => sum + t.expectedSpins, 0)
    const expectedProcessed = TIER_TESTS.filter((t) => !(t as any).rejected).length
    const expectedSkipped = TIER_TESTS.filter((t) => (t as any).rejected).length

    if (data.data.totalCredited === expectedTotal) {
      console.log(`  PASS  Total credited: ${data.data.totalCredited} (expected ${expectedTotal})`)
      passed++
    } else {
      console.log(`  FAIL  Total credited: ${data.data.totalCredited} (expected ${expectedTotal})`)
      failed++
    }

    if (data.data.skipped === expectedSkipped) {
      console.log(`  PASS  Skipped: ${data.data.skipped} (expected ${expectedSkipped} below-min entries)`)
      passed++
    } else {
      console.log(`  FAIL  Skipped: ${data.data.skipped} (expected ${expectedSkipped})`)
      failed++
    }

    if (data.data.processed === expectedProcessed) {
      console.log(`  PASS  Processed: ${data.data.processed} (expected ${expectedProcessed})`)
      passed++
    } else {
      console.log(`  FAIL  Processed: ${data.data.processed} (expected ${expectedProcessed})`)
      failed++
    }

    // Verify individual users in DB
    console.log('\n--- Verifying individual users in DB ---')
    await connectDB()

    for (let i = 0; i < TIER_TESTS.length; i++) {
      const test = TIER_TESTS[i]
      const wallet = createdWallets[i].toLowerCase()

      if (test.expectedSpins === 0) {
        // User may or may not exist — if exists, freeSpins should be 0
        const user = await UserModel.findOne({ wallet }).lean()
        const spins = user?.freeSpins || 0
        if (spins === 0) {
          console.log(`  PASS  ${test.label} → DB freeSpins = ${spins}`)
          passed++
        } else {
          console.log(`  FAIL  ${test.label} → DB freeSpins = ${spins} (expected 0)`)
          failed++
        }
      } else {
        const user = await UserModel.findOne({ wallet }).lean()
        if (!user) {
          console.log(`  FAIL  ${test.label} → User not found in DB`)
          failed++
        } else if (user.freeSpins === test.expectedSpins) {
          console.log(`  PASS  ${test.label} → DB freeSpins = ${user.freeSpins}`)
          passed++
        } else {
          console.log(`  FAIL  ${test.label} → DB freeSpins = ${user.freeSpins} (expected ${test.expectedSpins})`)
          failed++
        }
      }
    }
  } catch (err) {
    console.log(`  FAIL  Bulk request failed: ${err}`)
    failed++
  }

  return { passed, failed, createdWallets, createdTxHashes }
}

async function cleanup(wallets: string[], txHashes: string[]) {
  console.log('\n--- Cleanup ---')
  await connectDB()
  const lowerWallets = wallets.map((w) => w.toLowerCase())
  const deletedUsers = await UserModel.deleteMany({ wallet: { $in: lowerWallets } })
  const deletedCredits = await LPCreditModel.deleteMany({ txHash: { $in: txHashes } })
  console.log(`  Deleted ${deletedUsers.deletedCount} test users, ${deletedCredits.deletedCount} test credits`)
}

async function main() {
  if (!API_KEY) {
    console.error('ERROR: INDEXER_API_KEY not found in .env.local')
    process.exit(1)
  }

  console.log('Testing against:', API_URL)
  console.log('Make sure dev server is running (pnpm dev)\n')

  const allWallets: string[] = []
  const allTxHashes: string[] = []
  let totalPassed = 0
  let totalFailed = 0

  // Single endpoint tests
  const single = await testSingleEndpoint()
  totalPassed += single.passed
  totalFailed += single.failed
  allWallets.push(...single.createdWallets)
  allTxHashes.push(...single.createdTxHashes)

  // Bulk endpoint tests
  const bulk = await testBulkEndpoint()
  totalPassed += bulk.passed
  totalFailed += bulk.failed
  allWallets.push(...bulk.createdWallets)
  allTxHashes.push(...bulk.createdTxHashes)

  // Cleanup test data
  await cleanup(allWallets, allTxHashes)
  await disconnectDB()

  // Summary
  console.log('\n========================================')
  console.log(`  RESULTS: ${totalPassed} passed, ${totalFailed} failed`)
  console.log('========================================\n')

  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Test script error:', err)
  process.exit(1)
})
