// ============================================
// Admin Incoming Transactions API
// ============================================
// GET  - Fetch incoming chain TXs with DB status overlay
// POST - Bulk credit selected transactions

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { PaymentModel, UserModel, AdminConfigModel, AdminLogModel, AdminModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { getIncomingTransactions, getTransaction } from '@/lib/sui/client'
import { z } from 'zod'
import { validateBody } from '@/lib/validations'

// ----------------------------------------
// Validation
// ----------------------------------------

const bulkCreditSchema = z.object({
  txHashes: z.array(z.string().min(1)).min(1).max(50),
})

// ----------------------------------------
// GET — Fetch incoming chain TXs with DB status overlay
// ----------------------------------------

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return NextResponse.json({ success: false, error: 'System configuration not found' }, { status: 500 })
    }

    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor') || undefined
    const lookbackHours = parseInt(url.searchParams.get('lookbackHours') || String(config.paymentLookbackHours), 10)

    const fromDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)

    // Fetch chain transactions
    const page = await getIncomingTransactions(
      config.adminWalletAddress,
      fromDate,
      new Date(),
      cursor
    )

    // Cross-reference with DB
    const txHashes = page.transactions.map((tx) => tx.txHash)
    const existingPayments = txHashes.length > 0
      ? await PaymentModel.find({ txHash: { $in: txHashes } }).lean()
      : []

    const paymentMap = new Map(existingPayments.map((p) => [p.txHash, p]))

    const transactions = page.transactions.map((tx) => {
      const payment = paymentMap.get(tx.txHash)
      return {
        txHash: tx.txHash,
        sender: tx.sender,
        amountSUI: tx.amountSUI,
        amountMIST: tx.amountMIST,
        suggestedSpins: Math.floor(+(tx.amountSUI / config.spinRateSUI).toFixed(6)),
        timestamp: tx.timestamp,
        success: tx.success,
        dbStatus: payment ? payment.claimStatus : 'new',
        paymentId: payment ? String(payment._id) : null,
        spinsCredited: payment ? payment.spinsCredited : 0,
        claimedBy: payment ? payment.claimedBy : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        nextCursor: page.nextCursor,
        hasNextPage: page.hasNextPage,
        rate: config.spinRateSUI,
        adminWallet: config.adminWalletAddress,
      },
    })
  } catch (error) {
    console.error('Admin incoming transactions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch incoming transactions' }, { status: 500 })
  }
}

// ----------------------------------------
// POST — Bulk credit selected transactions
// ----------------------------------------

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    // Permission check
    const admin = await AdminModel.findOne({ username: payload.username })
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 })
    }
    if (admin.role !== 'super_admin' && !admin.permissions?.canManualCreditSpins) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error } = await validateBody(request, bulkCreditSchema)
    if (error) return error

    const { txHashes } = data

    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return NextResponse.json({ success: false, error: 'System configuration not found' }, { status: 500 })
    }

    // Check which TXs already exist in DB
    const existingPayments = await PaymentModel.find({ txHash: { $in: txHashes } }).lean()
    const existingMap = new Map(existingPayments.map((p) => [p.txHash, p]))

    const details: Array<{
      txHash: string
      status: 'credited' | 'skipped' | 'failed'
      reason?: string
      spinsCredited?: number
      wallet?: string
    }> = []

    let credited = 0
    let skipped = 0
    let failed = 0

    for (const txHash of txHashes) {
      // Skip if already claimed/pending_approval
      const existing = existingMap.get(txHash)
      if (existing && (existing.claimStatus === 'claimed' || existing.claimStatus === 'pending_approval')) {
        details.push({ txHash, status: 'skipped', reason: `Already ${existing.claimStatus}` })
        skipped++
        continue
      }

      // Verify on-chain
      const tx = await getTransaction(txHash)
      if (!tx) {
        details.push({ txHash, status: 'failed', reason: 'Transaction not found on-chain' })
        failed++
        continue
      }

      if (!tx.success) {
        details.push({ txHash, status: 'failed', reason: 'Transaction failed on-chain' })
        failed++
        continue
      }

      // Confirm it's a transfer to admin wallet
      if (tx.recipient.toLowerCase() !== config.adminWalletAddress.toLowerCase()) {
        details.push({ txHash, status: 'failed', reason: 'Not sent to admin wallet' })
        failed++
        continue
      }

      const spinsCredited = Math.floor(+(tx.amountSUI / config.spinRateSUI).toFixed(6))
      if (spinsCredited <= 0) {
        details.push({ txHash, status: 'failed', reason: 'Amount too small for any spins' })
        failed++
        continue
      }

      // Check if user exists
      const user = await UserModel.findOne({ wallet: tx.sender })

      // Create or update payment record
      const paymentData = {
        txHash: tx.txHash,
        senderWallet: tx.sender,
        recipientWallet: tx.recipient,
        amountMIST: tx.amountMIST,
        amountSUI: tx.amountSUI,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp,
        rateAtClaim: config.spinRateSUI,
        manualCredit: true,
        creditedByAdmin: payload.username,
        discoveredAt: new Date(),
      }

      if (user) {
        // User exists → credit spins
        await PaymentModel.findOneAndUpdate(
          { txHash: tx.txHash },
          {
            $set: {
              ...paymentData,
              claimStatus: 'claimed',
              claimedBy: tx.sender,
              claimedAt: new Date(),
              spinsCredited,
            },
          },
          { upsert: true }
        )

        await UserModel.findOneAndUpdate(
          { wallet: tx.sender },
          { $inc: { purchasedSpins: spinsCredited } }
        )

        details.push({ txHash, status: 'credited', spinsCredited, wallet: tx.sender })
        credited++
      } else {
        // No user → store payment as unclaimed
        await PaymentModel.findOneAndUpdate(
          { txHash: tx.txHash },
          {
            $set: {
              ...paymentData,
              claimStatus: 'unclaimed',
              claimedBy: tx.sender,
              spinsCredited: 0,
            },
          },
          { upsert: true }
        )

        details.push({ txHash, status: 'skipped', reason: 'User not registered — payment saved as unclaimed' })
        skipped++
      }
    }

    // Create audit log
    await AdminLogModel.create({
      action: 'bulk_credit_payments',
      adminUsername: payload.username,
      targetType: 'payment',
      targetId: `bulk_${txHashes.length}`,
      before: { txCount: txHashes.length },
      after: { credited, skipped, failed },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      data: { credited, skipped, failed, details },
    })
  } catch (error) {
    console.error('Bulk credit error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process bulk credit' }, { status: 500 })
  }
}
