#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env.local' })
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../lib/db/mongodb'

async function main() {
  await connectDB()
  const db = mongoose.connection.db
  if (db === undefined) { console.log('no db'); return }

  const wallet = '0xc17889dee9255f80462972cd1218165c3a16e37d5242aa4c2070af4f46cebb01'
  const spins = await db.collection('spins').find({ wallet }).sort({ createdAt: -1 }).limit(10).toArray()

  console.log('Recent 10 spins for', wallet.slice(0, 10) + '...\n')
  for (const s of spins) {
    console.log(
      String(s._id).slice(-8),
      '|', String(s.prizeType).padEnd(16),
      '| amt:', String(s.prizeAmount).padStart(8),
      '| usd:', String(s.prizeValueUSD).padStart(6),
      '| status:', s.status,
      '| txHash:', s.distributedTxHash || 'none'
    )
  }

  const counts = await db.collection('spins').aggregate([
    { $match: { wallet } },
    { $group: { _id: '$prizeType', count: { $sum: 1 }, totalUSD: { $sum: '$prizeValueUSD' } } },
  ]).toArray()
  console.log('\nPrize breakdown:')
  for (const c of counts) {
    console.log(' ', c._id, ':', c.count, 'spins, $' + c.totalUSD, 'USD')
  }

  await disconnectDB()
  process.exit(0)
}
main()
