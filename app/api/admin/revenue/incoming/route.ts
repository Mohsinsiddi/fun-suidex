// ============================================
// Admin Incoming Transactions API
// ============================================
// GET  - List chain transactions from DB (no chain sync)
// POST - Action-based: sync_preview, sync_confirm, or credit

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import {
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

/** Upsert chain TXs into ChainTransaction collection. Returns insert/existed counts. */
async function upsertChainTxs(txs: TransactionInfo[]): Promise<{ inserted: number; existed: number }> {
  if (txs.length === 0) return { inserted: 0, existed: 0 }

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
          discoveredAt: new Date(),
        },
      },
      upsert: true,
    },
  }))

  const result = await ChainTransactionModel.bulkWrite(ops, { ordered: false })
  return { inserted: result.upsertedCount, existed: txs.length - result.upsertedCount }
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

    const transactions = docs.map((doc) => {
      // Map creditStatus to dbStatus for frontend compatibility
      const dbStatus = doc.creditStatus === 'credited' ? 'claimed' : doc.creditStatus

      return {
        txHash: doc.txHash,
        sender: doc.sender,
        amountSUI: doc.amountSUI,
        amountMIST: doc.amountMIST,
        suggestedSpins: Math.floor(+(doc.amountSUI / config.spinRateSUI).toFixed(6)),
        timestamp: doc.timestamp,
        success: doc.success,
        dbStatus,
        paymentId: String(doc._id),
        spinsCredited: doc.spinsCredited || 0,
        claimedBy: doc.claimedBy || null,
        manualCredit: doc.manualCredit || false,
        creditedByAdmin: doc.creditedByAdmin || null,
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
  const pages: Array<{ page: number; rpcBlocks: number; suiTxs: number; filtered: number }> = []

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

    pages.push({
      page: pageNum + 1,
      rpcBlocks: chainPage.rpcBlockCount,
      suiTxs: chainPage.transactions.length,
      filtered: chainPage.rpcBlockCount - chainPage.transactions.length,
    })

    console.log('[chain-sync-preview] page', pageNum + 1, {
      rpcBlocks: chainPage.rpcBlockCount,
      suiTxs: chainPage.transactions.length,
      filtered: chainPage.rpcBlockCount - chainPage.transactions.length,
      hasNextPage: chainPage.hasNextPage,
    })

    if (chainPage.transactions.length > 0) {
      allTxs.push(...chainPage.transactions)
    }

    if (chainPage.nextCursor) {
      newCursor = chainPage.nextCursor
    }

    cursor = chainPage.nextCursor
    hasMore = chainPage.hasNextPage
  }

  // Safety net: query recent TXs in descending order (no cursor)
  // to catch any TXs that fell behind the cursor due to RPC indexing lag.
  // Stops early if a full page has zero new TXs (all already known).
  const cursorTxHashes = new Set(allTxs.map((t) => t.txHash))
  let safetyNetCount = 0

  if (storedCursor) {
    const safetyMaxPages = 2
    let safetyCursor: string | null = null
    let safetyHasMore = true

    for (let i = 0; i < safetyMaxPages && safetyHasMore; i++) {
      const safetyPage = await getIncomingTransactions(
        config.adminWalletAddress,
        lookbackDate,
        now,
        safetyCursor,
        50,
        'descending'
      )

      let pageNewCount = 0
      for (const tx of safetyPage.transactions) {
        if (!cursorTxHashes.has(tx.txHash)) {
          allTxs.push(tx)
          cursorTxHashes.add(tx.txHash)
          safetyNetCount++
          pageNewCount++
        }
      }

      // Stop early: if this entire page had nothing new, deeper pages won't either
      if (pageNewCount === 0 && safetyPage.transactions.length > 0) {
        console.log('[chain-sync-preview] safety net: page', i + 1, 'had 0 new TXs, stopping early')
        break
      }

      safetyCursor = safetyPage.nextCursor
      safetyHasMore = safetyPage.hasNextPage
    }

    if (safetyNetCount > 0) {
      console.log('[chain-sync-preview] safety net caught', safetyNetCount, 'TXs missed by cursor')
    }
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
  const duplicatesFiltered = allTxs.length - newTxs.length
  const totalRpcBlocks = pages.reduce((sum, p) => sum + p.rpcBlocks, 0)

  const totalSUI = newTxs.reduce((sum, tx) => sum + tx.amountSUI, 0)

  console.log('[chain-sync-preview] done', {
    totalFetched: allTxs.length,
    newCount: newTxs.length,
    duplicatesFiltered,
    safetyNetCaught: safetyNetCount,
    totalRpcBlocks,
    totalSUI,
    hasMore,
    pages,
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
      pages,
      duplicatesFiltered,
      totalRpcBlocks,
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

  // Re-verify every TX against the blockchain before saving
  // Process in batches of 20 to avoid overwhelming the RPC
  const BATCH_SIZE = 20
  const verifiedTxs: TransactionInfo[] = []
  const rejected: Array<{ txHash: string; reason: string }> = []

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((tx) => getTransaction(tx.txHash))
    )

    for (let j = 0; j < results.length; j++) {
      const frontendTx = batch[j]
      const result = results[j]

      if (result.status === 'rejected' || !result.value) {
        rejected.push({ txHash: frontendTx.txHash, reason: 'Not found on-chain' })
        continue
      }

      const chainTx = result.value

      // Verify key fields match — use on-chain data, not frontend data
      if (chainTx.recipient.toLowerCase() !== config.adminWalletAddress.toLowerCase()) {
        rejected.push({ txHash: frontendTx.txHash, reason: 'Recipient mismatch' })
        continue
      }

      if (!chainTx.success) {
        rejected.push({ txHash: frontendTx.txHash, reason: 'TX failed on-chain' })
        continue
      }

      // Use the verified on-chain data (not frontend data)
      verifiedTxs.push(chainTx)
    }
  }

  if (rejected.length > 0) {
    console.log('[chain-sync-confirm] rejected', rejected.length, 'TXs:', rejected)
  }

  const insertResult = verifiedTxs.length > 0
    ? await upsertChainTxs(verifiedTxs)
    : { inserted: 0, existed: 0 }

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
    after: {
      cursor: newCursor,
      synced: insertResult.inserted,
      duplicatesSkipped: insertResult.existed,
      rejected: rejected.length,
    },
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  })

  console.log('[chain-sync-confirm] verified:', verifiedTxs.length, '| saved:', insertResult.inserted, '| dupes:', insertResult.existed, '| rejected:', rejected.length)

  return NextResponse.json({
    success: true,
    data: {
      synced: insertResult.inserted,
      duplicatesSkipped: insertResult.existed,
      rejected: rejected.length,
      rejectedDetails: rejected.length > 0 ? rejected : undefined,
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

  // Check which TXs already exist in ChainTransaction with credited/pending_approval status
  const existingTxs = await ChainTransactionModel.find({ txHash: { $in: txHashes } }).lean()
  const existingMap = new Map(existingTxs.map((t) => [t.txHash, t]))

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
    // Skip if already credited/pending_approval
    const existing = existingMap.get(txHash)
    if (existing && (existing.creditStatus === 'credited' || existing.creditStatus === 'pending_approval')) {
      details.push({ txHash, status: 'skipped', reason: `Already ${existing.creditStatus}` })
      skipped++
      continue
    }

    // Try to get from ChainTransaction cache first, then fallback to chain
    let tx: TransactionInfo | null = null
    if (existing) {
      tx = {
        txHash: existing.txHash,
        sender: existing.sender,
        recipient: existing.recipient,
        amountMIST: existing.amountMIST,
        amountSUI: existing.amountSUI,
        timestamp: existing.timestamp,
        blockNumber: existing.blockNumber,
        success: existing.success,
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

    if (user) {
      // User exists -> credit spins directly on ChainTransaction
      await ChainTransactionModel.findOneAndUpdate(
        { txHash: tx.txHash },
        {
          $setOnInsert: {
            txHash: tx.txHash,
            sender: tx.sender,
            recipient: tx.recipient,
            amountMIST: tx.amountMIST,
            amountSUI: tx.amountSUI,
            blockNumber: tx.blockNumber,
            timestamp: tx.timestamp,
            success: tx.success,
            discoveredAt: new Date(),
          },
          $set: {
            creditStatus: 'credited',
            claimedBy: tx.sender,
            claimedAt: new Date(),
            spinsCredited,
            rateAtClaim: config.spinRateSUI,
            manualCredit: true,
            creditedByAdmin: payload.username,
          },
        },
        { upsert: true, new: true }
      )

      await UserModel.findOneAndUpdate(
        { wallet: tx.sender },
        { $inc: { purchasedSpins: spinsCredited } }
      )

      details.push({ txHash, status: 'credited', spinsCredited, wallet: tx.sender })
      credited++
    } else {
      // No user -> store as unclaimed
      await ChainTransactionModel.findOneAndUpdate(
        { txHash: tx.txHash },
        {
          $setOnInsert: {
            txHash: tx.txHash,
            sender: tx.sender,
            recipient: tx.recipient,
            amountMIST: tx.amountMIST,
            amountSUI: tx.amountSUI,
            blockNumber: tx.blockNumber,
            timestamp: tx.timestamp,
            success: tx.success,
            discoveredAt: new Date(),
          },
          $set: {
            creditStatus: 'unclaimed',
            claimedBy: tx.sender,
            spinsCredited: 0,
            rateAtClaim: config.spinRateSUI,
            manualCredit: true,
            creditedByAdmin: payload.username,
          },
        },
        { upsert: true, new: true }
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
