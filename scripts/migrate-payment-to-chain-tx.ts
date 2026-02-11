#!/usr/bin/env tsx
// ============================================
// Migration: Backfill ChainTransaction from Payment
// ============================================
// Copies spinsCredited, claimedBy, claimedAt, rateAtClaim,
// manualCredit, creditedByAdmin, adminNote from Payment docs
// into matching ChainTransaction docs (by txHash).
//
// Usage: npx tsx scripts/migrate-payment-to-chain-tx.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import ChainTransactionModel from '../lib/db/models/ChainTransaction'

async function main() {
  console.log('\n=== Backfill ChainTransaction from Payment ===\n')

  try {
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('No database connection')

    // 1. Get all ChainTransaction txHashes (the real records — typically very few)
    const chainTxs = await ChainTransactionModel.find({}, { txHash: 1 }).lean()
    const chainTxHashes = chainTxs.map((t) => t.txHash)
    console.log(`ChainTransaction records: ${chainTxHashes.length}`)

    if (chainTxHashes.length === 0) {
      console.log('No ChainTransaction records to backfill.')
      return
    }

    // 2. Find matching Payment docs (only for these txHashes)
    const payments = await db.collection('payments').find(
      { txHash: { $in: chainTxHashes } }
    ).toArray()
    console.log(`Matching Payment docs: ${payments.length}`)

    if (payments.length === 0) {
      console.log('No matching Payment docs found. Nothing to migrate.')
      return
    }

    // 3. Backfill each match
    let updated = 0
    for (const p of payments) {
      // Map old claimStatus → new creditStatus
      let creditStatus: string
      switch (p.claimStatus) {
        case 'claimed': creditStatus = 'credited'; break
        case 'manual': creditStatus = 'credited'; break
        case 'unclaimed': creditStatus = 'unclaimed'; break
        case 'pending_approval': creditStatus = 'pending_approval'; break
        case 'rejected': creditStatus = 'rejected'; break
        default: creditStatus = 'new'; break
      }

      const result = await ChainTransactionModel.findOneAndUpdate(
        { txHash: p.txHash },
        {
          $set: {
            creditStatus,
            spinsCredited: p.spinsCredited || 0,
            rateAtClaim: p.rateAtClaim || null,
            claimedBy: p.claimedBy || p.senderWallet || null,
            claimedAt: p.claimedAt || null,
            manualCredit: p.manualCredit || false,
            creditedByAdmin: p.creditedByAdmin || null,
            adminNote: p.adminNote || null,
          },
        }
      )

      if (result) {
        console.log(`  ✓ ${p.txHash.slice(0, 12)}... → ${creditStatus}, ${p.spinsCredited || 0} spins`)
        updated++
      }
    }

    console.log(`\nUpdated: ${updated} / ${payments.length}`)
    console.log('Done!')
  } catch (error) {
    console.error('\nError:', error)
    process.exit(1)
  } finally {
    await disconnectDB()
    process.exit(0)
  }
}

main()
