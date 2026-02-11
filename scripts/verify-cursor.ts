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
  if (!db) { console.log('no db'); return }

  const cfg = await db.collection('adminconfigs').findOne({ _id: 'main' as unknown as mongoose.Types.ObjectId })
  const storedCursor = cfg?.chainSyncCursor || null
  const client = new SuiClient({ url: getFullnodeUrl('testnet') })

  console.log('=== CURSOR VERIFICATION ===\n')
  console.log('Stored cursor:', storedCursor)
  console.log('Last sync:', cfg?.chainSyncLastAt)

  // 1. What's after the cursor (ascending)
  const fromCursor = await client.queryTransactionBlocks({
    filter: { ToAddress: ADMIN },
    options: { showBalanceChanges: true },
    limit: 50,
    order: 'ascending',
    ...(storedCursor ? { cursor: storedCursor } : {}),
  })
  console.log('\n--- ASCENDING from cursor ---')
  console.log('Blocks returned:', fromCursor.data.length, '| hasNext:', fromCursor.hasNextPage)
  if (fromCursor.data.length > 0) {
    const first = fromCursor.data[0]
    console.log('First after cursor:', first.digest.slice(0, 16) + '...', 'cp:', first.checkpoint, 'ts:', new Date(parseInt(first.timestampMs || '0')).toISOString())
    const last = fromCursor.data[fromCursor.data.length - 1]
    console.log('Last after cursor:', last.digest.slice(0, 16) + '...', 'cp:', last.checkpoint, 'ts:', new Date(parseInt(last.timestampMs || '0')).toISOString())
  }

  // 2. What's right before/at the cursor (descending from cursor)
  const beforeCursor = await client.queryTransactionBlocks({
    filter: { ToAddress: ADMIN },
    options: { showBalanceChanges: true },
    limit: 3,
    order: 'descending',
    cursor: storedCursor,
  })
  console.log('\n--- DESCENDING from cursor (blocks AT/before cursor) ---')
  for (const tx of beforeCursor.data) {
    const ts = new Date(parseInt(tx.timestampMs || '0')).toISOString()
    console.log(' ', tx.digest.slice(0, 16) + '...', 'cp:', tx.checkpoint, 'ts:', ts)
  }

  // 3. Latest block overall
  const latest = await client.queryTransactionBlocks({
    filter: { ToAddress: ADMIN },
    options: {},
    limit: 3,
    order: 'descending',
  })
  console.log('\n--- LATEST blocks (no cursor) ---')
  for (const tx of latest.data) {
    const ts = new Date(parseInt(tx.timestampMs || '0')).toISOString()
    console.log(' ', tx.digest.slice(0, 16) + '...', 'cp:', tx.checkpoint, 'ts:', ts)
  }

  // 4. DB state
  const dbCount = await db.collection('chaintransactions').countDocuments()
  const lastDbTx = await db.collection('chaintransactions').find().sort({ timestamp: -1 }).limit(3).toArray()
  console.log('\n--- DB STATE ---')
  console.log('Total docs:', dbCount)
  for (const tx of lastDbTx) {
    console.log(' ', (tx.txHash as string).slice(0, 16) + '...', 'block:', tx.blockNumber, 'ts:', tx.timestamp)
  }

  // 5. Full count from beginning
  let totalAsc = 0
  let c: string | null = null
  let more = true
  let passedCursor = false
  let blocksBeforeCursor = 0
  while (more) {
    const r = await client.queryTransactionBlocks({
      filter: { ToAddress: ADMIN },
      limit: 50,
      order: 'ascending',
      ...(c ? { cursor: c } : {}),
    })
    totalAsc += r.data.length
    c = r.nextCursor ?? null
    more = r.hasNextPage

    if (!passedCursor && c === storedCursor) {
      blocksBeforeCursor = totalAsc
      passedCursor = true
    }
  }
  console.log('\n--- FULL SCAN ---')
  console.log('Total from beginning:', totalAsc)
  if (passedCursor) {
    console.log('Blocks before cursor:', blocksBeforeCursor)
    console.log('Blocks after cursor:', totalAsc - blocksBeforeCursor)
  } else {
    console.log('Stored cursor NOT found in ascending pagination (cursor may be stale or from different epoch)')
  }
  console.log('DB has:', dbCount, '| Gap (total - DB):', totalAsc - dbCount)

  await disconnectDB()
  process.exit(0)
}

main()
