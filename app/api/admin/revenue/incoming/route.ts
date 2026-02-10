// ============================================
// Admin Incoming Transactions API
// ============================================
// GET  - List chain transactions from DB (no chain sync)
// POST - Action-based: sync_preview, sync_confirm, or credit

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import {
  PaymentModel,
  UserModel,
  AdminConfigModel,
  AdminLogModel,
  AdminModel,
  ChainTransactionModel,
} from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { getIncomingTransactions, getTransaction } from '@/lib/sui/client'
import type { TransactionInfo } from '@/lib/sui/client'
import { z } from 'zod'
import { validateBody } from '@/lib/validations'

// ----------------------------------------
// Validation
// ----------------------------------------

const txSchema = z.object({
  txHash: z.string(),
  sender: z.string(),
  recipient: z.string(),
  amountMIST: z.string(),
  amountSUI: z.number(),
  timestamp: z.string(),
  blockNumber: z.number(),
  success: z.boolean(),
})

const postSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('sync_preview'),
  }),
  z.object({
    action: z.literal('sync_confirm'),
    transactions: z.array(txSchema).min(0).max(1000),
    newCursor: z.string().nullable(),
  }),
  z.object({
    action: z.literal('credit'),
    txHashes: z.array(z.string().min(1)).min(1).max(50),
  }),
])

// ----------------------------------------
// Helpers
// ----------------------------------------

/** Upsert chain TXs into ChainTransaction collection */
async function upsertChainTxs(txs: TransactionInfo[]) {
  if (txs.length === 0) return

  const ops = txs.map((tx) => ({
    updateOne: {
      filter: { txHash: tx.txHash },
      update: {
        $setOnInsert: {
          txHash: tx.txHash,
          sender: tx.sender,
          recipient: tx.recipient,
          amountMIST: tx.amountMIST,
          amountSUI: tx.amountSUI,
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber,
          success: tx.success,
          creditStatus: 'new',
          paymentId: null,
          discoveredAt: new Date(),
        },
      },
      upsert: true,
    },
  }))

  await ChainTransactionModel.bulkWrite(ops, { ordered: false })
}

/** Sync credit statuses from Payment collection into ChainTransaction */
async function syncCreditStatuses(txHashes: string[]) {
  if (txHashes.length === 0) return

  const payments = await PaymentModel.find(
    { txHash: { $in: txHashes } },
    { txHash: 1, claimStatus: 1, _id: 1 }
  ).lean()

  if (payments.length === 0) return

  const ops = payments.map((p) => ({
    updateOne: {
      filter: { txHash: p.txHash },
      update: {
        $set: {
          creditStatus: p.claimStatus === 'claimed' ? 'credited' : p.claimStatus,
          paymentId: String(p._id),
        },
      },
    },
  }))

  await ChainTransactionModel.bulkWrite(ops, { ordered: false })
}

// ----------------------------------------
// GET — List from DB (no chain sync)
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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const statusFilter = url.searchParams.get('status') || ''

    // --- Query DB with pagination ---
    const query: Record<string, unknown> = {
      recipient: config.adminWalletAddress.toLowerCase(),
    }
    if (statusFilter) {
      query.creditStatus = statusFilter
    }

    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      ChainTransactionModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ChainTransactionModel.countDocuments(query),
    ])

    // Cross-reference with Payment DB for spinsCredited + claimedBy
    const txHashes = docs.map((d) => d.txHash)
    const payments = txHashes.length > 0
      ? await PaymentModel.find({ txHash: { $in: txHashes } }).lean()
      : []
    const paymentMap = new Map(payments.map((p) => [p.txHash, p]))

    const transactions = docs.map((doc) => {
      const payment = paymentMap.get(doc.txHash)
      const dbStatus = payment
        ? payment.claimStatus
        : doc.creditStatus === 'credited' ? 'claimed' : doc.creditStatus

      return {
        txHash: doc.txHash,
        sender: doc.sender,
        amountSUI: doc.amountSUI,
        amountMIST: doc.amountMIST,
        suggestedSpins: Math.floor(+(doc.amountSUI / config.spinRateSUI).toFixed(6)),
        timestamp: doc.timestamp,
        success: doc.success,
        dbStatus,
        paymentId: payment ? String(payment._id) : doc.paymentId,
        spinsCredited: payment ? payment.spinsCredited : 0,
        claimedBy: payment ? payment.claimedBy : null,
      }
    })

    // Stats across all TXs (not just current page)
    const statsQuery = {
      recipient: config.adminWalletAddress.toLowerCase(),
    }
    const [statsResult] = await ChainTransactionModel.aggregate([
      { $match: statsQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newCount: { $sum: { $cond: [{ $eq: ['$creditStatus', 'new'] }, 1, 0] } },
          creditedCount: { $sum: { $cond: [{ $in: ['$creditStatus', ['credited', 'unclaimed', 'pending_approval', 'rejected']] }, 1, 0] } },
          totalSUI: { $sum: '$amountSUI' },
          newSUI: { $sum: { $cond: [{ $eq: ['$creditStatus', 'new'] }, '$amountSUI', 0] } },
        },
      },
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        rate: config.spinRateSUI,
        adminWallet: config.adminWalletAddress,
        lastSyncAt: config.chainSyncLastAt,
        stats: {
          total: statsResult?.total || 0,
          newCount: statsResult?.newCount || 0,
          creditedCount: statsResult?.creditedCount || 0,
          totalSUI: statsResult?.totalSUI || 0,
          newSUI: statsResult?.newSUI || 0,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin incoming transactions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch incoming transactions' }, { status: 500 })
  }
}

// ----------------------------------------
// POST — Action-based: sync_preview, sync_confirm, or credit
// ----------------------------------------

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { data, error } = await validateBody(request, postSchema)
    if (error) return error

    if (data.action === 'sync_preview') {
      return handleSyncPreview()
    } else if (data.action === 'sync_confirm') {
      return handleSyncConfirm(data.transactions, data.newCursor, payload, request)
    } else {
      return handleCredit(data.txHashes, payload, request)
    }
  } catch (error) {
    console.error('Incoming POST error:', error)
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 })
  }
}

// ----------------------------------------
// Sync Preview — fetch from chain, return preview (NO DB write)
// ----------------------------------------

async function handleSyncPreview() {
  const config = await AdminConfigModel.findById('main')
  if (!config) {
    return NextResponse.json({ success: false, error: 'System configuration not found' }, { status: 500 })
  }

  const storedCursor = config.chainSyncCursor || null
  const lookbackDate = new Date(Date.now() - config.paymentLookbackHours * 60 * 60 * 1000)
  const now = new Date()

  let cursor: string | null = storedCursor
  let hasMore = true
  const maxPages = 20
  const allTxs: TransactionInfo[] = []
  let newCursor: string | null = storedCursor

  console.log('[chain-sync-preview] starting', {
    adminWallet: config.adminWalletAddress,
    hasCursor: !!storedCursor,
    lookbackDate: lookbackDate.toISOString(),
  })

  for (let pageNum = 0; pageNum < maxPages && hasMore; pageNum++) {
    const chainPage = await getIncomingTransactions(
      config.adminWalletAddress,
      lookbackDate,
      now,
      cursor,
      50,
      'ascending'
    )

    console.log('[chain-sync-preview] page', pageNum, {
      txCount: chainPage.transactions.length,
      hasNextPage: chainPage.hasNextPage,
    })

    if (chainPage.transactions.length > 0) {
      allTxs.push(...chainPage.transactions)
    }

    if (chainPage.nextCursor) {
      newCursor = chainPage.nextCursor
    }

    cursor = chainPage.nextCursor
    hasMore = chainPage.hasNextPage && chainPage.transactions.length > 0
  }

  // Filter out TXs already in DB
  const existingHashes = allTxs.length > 0
    ? new Set(
        (await ChainTransactionModel.find(
          { txHash: { $in: allTxs.map((t) => t.txHash) } },
          { txHash: 1 }
        ).lean()).map((d) => d.txHash)
      )
    : new Set<string>()

  const newTxs = allTxs.filter((tx) => !existingHashes.has(tx.txHash))

  const totalSUI = newTxs.reduce((sum, tx) => sum + tx.amountSUI, 0)

  console.log('[chain-sync-preview] done', {
    totalFetched: allTxs.length,
    newCount: newTxs.length,
    totalSUI,
    hasMore,
  })

  return NextResponse.json({
    success: true,
    data: {
      preview: newTxs.map((tx) => ({
        txHash: tx.txHash,
        sender: tx.sender,
        recipient: tx.recipient,
        amountMIST: tx.amountMIST,
        amountSUI: tx.amountSUI,
        timestamp: tx.timestamp.toISOString(),
        blockNumber: tx.blockNumber,
        success: tx.success,
        suggestedSpins: Math.floor(+(tx.amountSUI / config.spinRateSUI).toFixed(6)),
      })),
      count: newTxs.length,
      totalSUI,
      hasMore,
      newCursor,
      rate: config.spinRateSUI,
    },
  })
}

// ----------------------------------------
// Sync Confirm — save previewed TXs to DB + update cursor
// ----------------------------------------

async function handleSyncConfirm(
  transactions: Array<{
    txHash: string
    sender: string
    recipient: string
    amountMIST: string
    amountSUI: number
    timestamp: string
    blockNumber: number
    success: boolean
  }>,
  newCursor: string | null,
  payload: { username: string },
  request: NextRequest,
) {
  const config = await AdminConfigModel.findById('main')
  if (!config) {
    return NextResponse.json({ success: false, error: 'System configuration not found' }, { status: 500 })
  }

  const storedCursor = config.chainSyncCursor || null
  const now = new Date()

  // Convert preview TXs to TransactionInfo format and upsert
  const txInfos: TransactionInfo[] = transactions.map((tx) => ({
    txHash: tx.txHash,
    sender: tx.sender,
    recipient: tx.recipient,
    amountMIST: tx.amountMIST,
    amountSUI: tx.amountSUI,
    timestamp: new Date(tx.timestamp),
    blockNumber: tx.blockNumber,
    success: tx.success,
  }))

  if (txInfos.length > 0) {
    await upsertChainTxs(txInfos)
  }

  // Sync credit statuses for 'new' TXs
  const newTxDocs = await ChainTransactionModel.find(
    { creditStatus: 'new' },
    { txHash: 1 }
  ).lean()
  if (newTxDocs.length > 0) {
    await syncCreditStatuses(newTxDocs.map((d) => d.txHash))
  }

  // Update cursor and lastSyncAt
  await AdminConfigModel.findByIdAndUpdate('main', {
    $set: {
      chainSyncCursor: newCursor ?? storedCursor,
      chainSyncLastAt: now,
      updatedBy: payload.username,
    },
  })

  // Audit log
  await AdminLogModel.create({
    action: 'chain_sync',
    adminUsername: payload.username,
    targetType: 'chain_transaction',
    targetId: `sync_${transactions.length}`,
    before: { cursor: storedCursor },
    after: { cursor: newCursor, synced: transactions.length },
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  })

  console.log('[chain-sync-confirm] saved', transactions.length, 'TXs, cursor updated')

  return NextResponse.json({
    success: true,
    data: {
      synced: transactions.length,
      lastSyncAt: now,
    },
  })
}

// ----------------------------------------
// Credit action
// ----------------------------------------

async function handleCredit(
  txHashes: string[],
  payload: { username: string },
  request: NextRequest,
) {
  // Permission check
  const admin = await AdminModel.findOne({ username: payload.username })
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 })
  }
  if (admin.role !== 'super_admin' && !admin.permissions?.canManualCreditSpins) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const config = await AdminConfigModel.findById('main')
  if (!config) {
    return NextResponse.json({ success: false, error: 'System configuration not found' }, { status: 500 })
  }

  // Check which TXs already exist in Payment DB
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

    // Try to get from ChainTransaction cache first, then fallback to chain
    let tx: TransactionInfo | null = null
    const cached = await ChainTransactionModel.findOne({ txHash }).lean()
    if (cached) {
      tx = {
        txHash: cached.txHash,
        sender: cached.sender,
        recipient: cached.recipient,
        amountMIST: cached.amountMIST,
        amountSUI: cached.amountSUI,
        timestamp: cached.timestamp,
        blockNumber: cached.blockNumber,
        success: cached.success,
      }
    } else {
      tx = await getTransaction(txHash)
    }

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
      // User exists -> credit spins
      const paymentDoc = await PaymentModel.findOneAndUpdate(
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
        { upsert: true, new: true }
      )

      await UserModel.findOneAndUpdate(
        { wallet: tx.sender },
        { $inc: { purchasedSpins: spinsCredited } }
      )

      // Update ChainTransaction cache
      await ChainTransactionModel.findOneAndUpdate(
        { txHash: tx.txHash },
        { $set: { creditStatus: 'credited', paymentId: String(paymentDoc._id) } }
      )

      details.push({ txHash, status: 'credited', spinsCredited, wallet: tx.sender })
      credited++
    } else {
      // No user -> store payment as unclaimed
      const paymentDoc = await PaymentModel.findOneAndUpdate(
        { txHash: tx.txHash },
        {
          $set: {
            ...paymentData,
            claimStatus: 'unclaimed',
            claimedBy: tx.sender,
            spinsCredited: 0,
          },
        },
        { upsert: true, new: true }
      )

      // Update ChainTransaction cache
      await ChainTransactionModel.findOneAndUpdate(
        { txHash: tx.txHash },
        { $set: { creditStatus: 'unclaimed', paymentId: String(paymentDoc._id) } }
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
}
