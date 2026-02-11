#!/usr/bin/env tsx
// ============================================
// Test: Send SUI + WUSDC TXs to admin wallet
// ============================================
// Sends a controlled mix, records every digest,
// then queries RPC to verify filtering works.
//
// Usage:
//   SENDER_PRIVATE_KEY=suiprivkey1... npx tsx scripts/test-send-txs.ts
//
// Sender: 0xc17889dee9255f80462972cd1218165c3a16e37d5242aa4c2070af4f46cebb01
// Admin:  0xd86db01c43b2c04de7da56e76616db15e8cde5849e5fe8fd7314ccd4cb8d4332

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'

// ----------------------------------------
// Config
// ----------------------------------------

const ADMIN_WALLET = '0xd86db01c43b2c04de7da56e76616db15e8cde5849e5fe8fd7314ccd4cb8d4332'
const WUSDC_TYPE = '0x907c274c1171f3bfd59f361be215bd23bc5be88b1d1a4816e1caa6c0d61e7fe6::WUSDC::WUSDC'
const NETWORK = 'testnet'
const SUI_TX_COUNT = 40
const WUSDC_TX_COUNT = 10
const SUI_AMOUNT_PER_TX = 1_000_000 // 0.001 SUI in MIST

const MIST_PER_SUI = 1_000_000_000

// ----------------------------------------
// Main
// ----------------------------------------

async function main() {
  const privateKey = process.env.SENDER_PRIVATE_KEY
  if (!privateKey) {
    console.error('Missing SENDER_PRIVATE_KEY env var')
    process.exit(1)
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey)
  const sender = keypair.getPublicKey().toSuiAddress()
  const client = new SuiClient({ url: getFullnodeUrl(NETWORK) })

  console.log(`\n=== Test TX Sender ===`)
  console.log(`Network:  ${NETWORK}`)
  console.log(`Sender:   ${sender}`)
  console.log(`Admin:    ${ADMIN_WALLET}`)
  console.log(`Plan:     ${SUI_TX_COUNT} SUI TXs + ${WUSDC_TX_COUNT} WUSDC TXs`)

  // Check balance
  const balance = await client.getBalance({ owner: sender })
  const suiBalance = Number(balance.totalBalance) / MIST_PER_SUI
  console.log(`\nSUI Balance: ${suiBalance} SUI`)

  // Track all digests
  const suiDigests: string[] = []
  const wusdcDigests: string[] = []

  // ========================================
  // Phase 1: Send SUI transactions
  // ========================================
  console.log(`\n--- Phase 1: Sending ${SUI_TX_COUNT} SUI transactions ---\n`)

  let suiSuccess = 0
  let suiFailed = 0

  for (let i = 0; i < SUI_TX_COUNT; i++) {
    try {
      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.gas, [SUI_AMOUNT_PER_TX])
      tx.transferObjects([coin], ADMIN_WALLET)

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
      })

      suiDigests.push(result.digest)
      suiSuccess++
      if ((i + 1) % 10 === 0 || i === 0) {
        console.log(`  [${i + 1}/${SUI_TX_COUNT}] ✓ SUI  ${result.digest}`)
      }
    } catch (err) {
      suiFailed++
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  [${i + 1}/${SUI_TX_COUNT}] ✗ SUI  ${msg.slice(0, 80)}`)

      if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
        console.log('  Rate limited, waiting 3s...')
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    // Small delay every 20 TXs
    if ((i + 1) % 20 === 0) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  console.log(`\nSUI results: ${suiSuccess} success, ${suiFailed} failed`)

  // ========================================
  // Phase 2: Send WUSDC transactions
  // ========================================
  console.log(`\n--- Phase 2: Sending ${WUSDC_TX_COUNT} WUSDC transactions ---\n`)

  const wusdcCoins = await client.getCoins({ owner: sender, coinType: WUSDC_TYPE })
  console.log(`WUSDC coins found: ${wusdcCoins.data.length}`)

  let wusdcSuccess = 0
  let wusdcFailed = 0

  if (wusdcCoins.data.length === 0) {
    console.log('No WUSDC coins in wallet. Skipping WUSDC transfers.')
  } else {
    const txCount = Math.min(WUSDC_TX_COUNT, wusdcCoins.data.length)

    for (let i = 0; i < txCount; i++) {
      try {
        const coin = wusdcCoins.data[i]
        const tx = new Transaction()

        if (BigInt(coin.balance) > BigInt(1000)) {
          const [splitCoin] = tx.splitCoins(tx.object(coin.coinObjectId), [1000])
          tx.transferObjects([splitCoin], ADMIN_WALLET)
        } else {
          tx.transferObjects([tx.object(coin.coinObjectId)], ADMIN_WALLET)
        }

        const result = await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: tx,
        })

        wusdcDigests.push(result.digest)
        wusdcSuccess++
        console.log(`  [${i + 1}/${txCount}] ✓ WUSDC ${result.digest}`)
      } catch (err) {
        wusdcFailed++
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  [${i + 1}/${txCount}] ✗ WUSDC ${msg.slice(0, 80)}`)
      }
    }
  }

  console.log(`\nWUSDC results: ${wusdcSuccess} success, ${wusdcFailed} failed`)

  // ========================================
  // Phase 3: Wait for indexer, then verify
  // ========================================
  console.log(`\n--- Phase 3: Verifying via RPC (waiting 15s for indexer) ---\n`)
  await new Promise((r) => setTimeout(r, 15000))

  // Query raw RPC — no client-side filter, just ToAddress
  let rpcTotal = 0
  let rpcCursor: string | null | undefined = undefined
  let rpcHasMore = true
  const rpcDigests = new Set<string>()

  while (rpcHasMore) {
    const result = await client.queryTransactionBlocks({
      filter: { ToAddress: ADMIN_WALLET },
      options: { showBalanceChanges: true },
      limit: 50,
      order: 'descending',
      ...(rpcCursor ? { cursor: rpcCursor } : {}),
    })

    for (const tx of result.data) {
      rpcDigests.add(tx.digest)
    }

    rpcTotal += result.data.length
    rpcCursor = result.nextCursor ?? null
    rpcHasMore = result.hasNextPage

    // Only check recent pages (stop after 500 to avoid fetching entire history)
    if (rpcTotal >= 500) break
  }

  // Check which of our digests appear in RPC
  const suiInRpc = suiDigests.filter((d) => rpcDigests.has(d))
  const suiMissing = suiDigests.filter((d) => !rpcDigests.has(d))
  const wusdcInRpc = wusdcDigests.filter((d) => rpcDigests.has(d))
  const wusdcMissing = wusdcDigests.filter((d) => !rpcDigests.has(d))

  // Now check which RPC TXs pass our SUI filter
  let suiFilteredCount = 0
  let nonSuiFilteredCount = 0

  // Re-query with balanceChanges to check filter
  for (const digest of [...suiDigests.slice(0, 5), ...wusdcDigests.slice(0, 5)]) {
    try {
      const tx = await client.getTransactionBlock({
        digest,
        options: { showBalanceChanges: true, showInput: true },
      })

      const balanceChanges = tx.balanceChanges || []
      const suiChange = balanceChanges.find(
        (change) =>
          change.coinType === '0x2::sui::SUI' &&
          change.owner &&
          typeof change.owner === 'object' &&
          'AddressOwner' in change.owner &&
          (change.owner as { AddressOwner: string }).AddressOwner.toLowerCase() === ADMIN_WALLET.toLowerCase() &&
          BigInt(change.amount) > 0
      )

      const coinTypes = balanceChanges.map((c) => c.coinType)
      const isSui = suiDigests.includes(digest)

      if (suiChange) suiFilteredCount++
      else nonSuiFilteredCount++

      console.log(`  ${digest.slice(0, 12)}... ${isSui ? 'SUI ' : 'WUSD'} | filter=${suiChange ? 'PASS' : 'SKIP'} | coins: ${coinTypes.join(', ')}`)
    } catch {
      console.log(`  ${digest.slice(0, 12)}... NOT INDEXED YET`)
    }
  }

  // ========================================
  // Summary
  // ========================================
  console.log(`\n${'='.repeat(50)}`)
  console.log(`=== RESULTS ===`)
  console.log(`${'='.repeat(50)}`)
  console.log(``)
  console.log(`Sent:`)
  console.log(`  SUI TXs:   ${suiSuccess} sent, ${suiFailed} failed`)
  console.log(`  WUSDC TXs: ${wusdcSuccess} sent, ${wusdcFailed} failed`)
  console.log(`  Total:     ${suiSuccess + wusdcSuccess} sent`)
  console.log(``)
  console.log(`RPC ToAddress query returned: ${rpcTotal} total blocks`)
  console.log(``)
  console.log(`Our digests in RPC:`)
  console.log(`  SUI:   ${suiInRpc.length}/${suiDigests.length} found`)
  console.log(`  WUSDC: ${wusdcInRpc.length}/${wusdcDigests.length} found`)
  console.log(``)
  if (suiMissing.length > 0) {
    console.log(`Missing SUI digests (not in RPC yet):`)
    suiMissing.forEach((d) => console.log(`  - ${d}`))
  }
  if (wusdcMissing.length > 0) {
    console.log(`Missing WUSDC digests (not in RPC yet):`)
    wusdcMissing.forEach((d) => console.log(`  - ${d}`))
  }
  console.log(``)
  console.log(`Filter test (sample of 5 SUI + 5 WUSDC):`)
  console.log(`  Passed SUI filter: ${suiFilteredCount}`)
  console.log(`  Skipped (non-SUI): ${nonSuiFilteredCount}`)
  console.log(``)
  console.log(`Expected behavior:`)
  console.log(`  ✓ All SUI TXs should be in RPC and PASS filter`)
  console.log(`  ✓ All WUSDC TXs should be in RPC but SKIP filter`)
  console.log(`  ✓ Chain sync should find exactly ${suiSuccess} SUI TXs`)
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
