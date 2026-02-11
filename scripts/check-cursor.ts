#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env.local' })
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const ADMIN = '0xd86db01c43b2c04de7da56e76616db15e8cde5849e5fe8fd7314ccd4cb8d4332'

async function main() {
  await connectDB()
  const db = mongoose.connection.db
  if (db === undefined) { console.log('no db'); return }

  const cfg = await db.collection('adminconfigs').findOne({ _id: 'main' as unknown as mongoose.Types.ObjectId })
  const storedCursor = cfg?.chainSyncCursor || null
  console.log('chainSyncCursor:', storedCursor)
  console.log('chainSyncLastAt:', cfg?.chainSyncLastAt)

  const chainTxCount = await db.collection('chaintransactions').countDocuments()
  console.log('ChainTransaction docs in DB:', chainTxCount)

  // Now query RPC from stored cursor to see what's available
  const client = new SuiClient({ url: getFullnodeUrl('testnet') })

  let cursor: string | null = storedCursor
  let hasMore = true
  let totalBlocks = 0
  let suiCount = 0
  let nonSuiCount = 0
  let pageNum = 0

  console.log('\n--- Querying RPC from stored cursor ---\n')

  while (hasMore) {
    const result = await client.queryTransactionBlocks({
      filter: { ToAddress: ADMIN },
      options: { showBalanceChanges: true },
      limit: 50,
      order: 'ascending',
      ...(cursor ? { cursor } : {}),
    })

    for (const tx of result.data) {
      const changes = tx.balanceChanges || []
      const suiChange = changes.find(
        (c: { coinType: string; owner: unknown; amount: string }) =>
          c.coinType === '0x2::sui::SUI' &&
          c.owner &&
          typeof c.owner === 'object' &&
          'AddressOwner' in (c.owner as Record<string, unknown>) &&
          (c.owner as { AddressOwner: string }).AddressOwner.toLowerCase() === ADMIN.toLowerCase() &&
          BigInt(c.amount) > 0
      )
      if (suiChange) suiCount++
      else nonSuiCount++
    }

    totalBlocks += result.data.length
    console.log(`page ${pageNum}: ${result.data.length} blocks, hasNext=${result.hasNextPage}`)

    cursor = result.nextCursor ?? null
    hasMore = result.hasNextPage
    pageNum++
  }

  console.log('\n=== FROM STORED CURSOR ===')
  console.log('Total blocks:', totalBlocks)
  console.log('SUI transfers:', suiCount)
  console.log('Non-SUI filtered:', nonSuiCount)

  // Also scan from beginning (no cursor)
  cursor = null
  hasMore = true
  let fullTotal = 0
  let fullSui = 0
  let fullNonSui = 0

  console.log('\n--- Querying RPC from beginning (no cursor) ---\n')

  while (hasMore) {
    const result = await client.queryTransactionBlocks({
      filter: { ToAddress: ADMIN },
      options: { showBalanceChanges: true },
      limit: 50,
      order: 'ascending',
      ...(cursor ? { cursor } : {}),
    })

    for (const tx of result.data) {
      const changes = tx.balanceChanges || []
      const suiChange = changes.find(
        (c: { coinType: string; owner: unknown; amount: string }) =>
          c.coinType === '0x2::sui::SUI' &&
          c.owner &&
          typeof c.owner === 'object' &&
          'AddressOwner' in (c.owner as Record<string, unknown>) &&
          (c.owner as { AddressOwner: string }).AddressOwner.toLowerCase() === ADMIN.toLowerCase() &&
          BigInt(c.amount) > 0
      )
      if (suiChange) fullSui++
      else fullNonSui++
    }

    fullTotal += result.data.length
    cursor = result.nextCursor ?? null
    hasMore = result.hasNextPage
  }

  console.log('=== FROM BEGINNING ===')
  console.log('Total blocks:', fullTotal)
  console.log('SUI transfers:', fullSui)
  console.log('Non-SUI filtered:', fullNonSui)
  console.log('Already in DB:', chainTxCount)
  console.log('Expected new SUI:', fullSui - chainTxCount)

  await disconnectDB()
  process.exit(0)
}

main()
