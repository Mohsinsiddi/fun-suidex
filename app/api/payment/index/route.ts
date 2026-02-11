// ============================================
// Payment Index API
// ============================================
// POST /api/payment/index - Validate & save TXs to DB (without crediting spins)
// User flow: Scan → Index/Save → Claim from purchase list

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { ChainTransactionModel, AdminConfigModel } from '@/lib/db/models'
import { verifyPayment } from '@/lib/sui/client'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { errors, success } from '@/lib/utils/apiResponse'

export const POST = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    const body = await request.json()
    const txHashes: string[] = body.txHashes

    if (!Array.isArray(txHashes) || txHashes.length === 0) {
      return errors.badRequest('txHashes array is required')
    }

    if (txHashes.length > 20) {
      return errors.badRequest('Maximum 20 transactions at a time')
    }

    await connectDB()

    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return errors.notConfigured()
    }

    // Check which TXs are already in DB
    const existing = await ChainTransactionModel.find({ txHash: { $in: txHashes } }).select('txHash')
    const existingSet = new Set(existing.map((t) => t.txHash))

    const results: { txHash: string; status: 'saved' | 'exists' | 'invalid'; error?: string }[] = []

    const minPayment = Math.min(config.minPaymentSUI ?? Infinity, config.spinRateSUI)

    for (const txHash of txHashes) {
      // Skip already in DB
      if (existingSet.has(txHash)) {
        results.push({ txHash, status: 'exists' })
        continue
      }

      // Verify on chain
      const { tx, error: verifyError } = await verifyPayment(
        txHash,
        wallet,
        config.adminWalletAddress,
        minPayment
      )

      if (!tx) {
        results.push({ txHash, status: 'invalid', error: verifyError || 'Verification failed' })
        continue
      }

      // Check lookback period
      const lookbackMs = config.paymentLookbackHours * 60 * 60 * 1000
      const cutoffDate = new Date(Date.now() - lookbackMs)
      if (tx.timestamp < cutoffDate) {
        results.push({ txHash, status: 'invalid', error: 'Transaction too old' })
        continue
      }

      // Save to DB as unclaimed (not crediting spins yet)
      await ChainTransactionModel.findOneAndUpdate(
        { txHash },
        {
          $setOnInsert: {
            txHash,
            sender: tx.sender,
            recipient: tx.recipient,
            amountMIST: tx.amountMIST,
            amountSUI: tx.amountSUI,
            blockNumber: tx.blockNumber,
            timestamp: tx.timestamp,
            success: true,
            creditStatus: 'unclaimed',
            discoveredAt: new Date(),
          },
        },
        { upsert: true }
      )

      results.push({ txHash, status: 'saved' })
    }

    const saved = results.filter((r) => r.status === 'saved').length
    const alreadyExists = results.filter((r) => r.status === 'exists').length
    const invalid = results.filter((r) => r.status === 'invalid').length

    return success({
      results,
      summary: { saved, alreadyExists, invalid, total: txHashes.length },
    })
  } catch (error) {
    console.error('Payment index error:', error)
    return errors.internal()
  }
})
