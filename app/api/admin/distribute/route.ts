// ============================================
// Admin Distribute API (Enhanced)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, AdminLogModel, UserModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, parseSortParams } from '@/lib/utils/pagination'
import { isValidObjectId, isValidTxHash, extractTxHash, escapeRegex } from '@/lib/utils/validation'
import { verifyDistributionTx } from '@/lib/sui/client'
import { sendPrizeDistributedPush } from '@/lib/push/webPush'

// GET - Get prizes with pagination, status tabs, filters
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const { page, limit, skip } = parsePaginationParams(request)
    const { sortField, sortOrder } = parseSortParams(
      request,
      ['createdAt', 'prizeAmount', 'prizeValueUSD', 'distributedAt'],
      'createdAt'
    )

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'
    const prizeType = url.searchParams.get('prizeType')
    const walletSearch = url.searchParams.get('wallet')?.toLowerCase().trim()
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    // Build query
    const query: Record<string, unknown> = {
      prizeType: { $ne: 'no_prize' },
    }

    if (status !== 'all') {
      query.status = status
    }
    if (prizeType && prizeType !== 'all') {
      query.prizeType = prizeType
    }
    if (walletSearch) {
      query.wallet = { $regex: escapeRegex(walletSearch), $options: 'i' }
    }
    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {}
      if (dateFrom) dateQuery.$gte = new Date(dateFrom)
      if (dateTo) dateQuery.$lte = new Date(dateTo + 'T23:59:59.999Z')
      query.createdAt = dateQuery
    }

    // Select fields based on status
    const selectFields =
      status === 'distributed'
        ? 'wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt status distributedAt distributedBy distributedTxHash'
        : status === 'failed'
          ? 'wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt status failureReason distributedTxHash'
          : 'wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt status'

    // Parallel: items + total + per-status counts
    const [items, total, statusCounts] = await Promise.all([
      SpinModel.find(query)
        .select(selectFields)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      SpinModel.countDocuments(query),
      // Aggregate counts per status (excluding no_prize)
      SpinModel.aggregate([
        { $match: { prizeType: { $ne: 'no_prize' } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$prizeValueUSD' },
          },
        },
      ]),
    ])

    // Build stats from aggregation
    const stats: Record<string, { count: number; totalValue: number }> = {}
    for (const sc of statusCounts) {
      stats[sc._id] = { count: sc.count, totalValue: sc.totalValue }
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        stats: {
          pending: stats.pending || { count: 0, totalValue: 0 },
          distributed: stats.distributed || { count: 0, totalValue: 0 },
          failed: stats.failed || { count: 0, totalValue: 0 },
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin distribute GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get prizes' }, { status: 500 })
  }
}

// POST - Mark prize as distributed (with on-chain verification)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const admin = await AdminModel.findOne({ username: payload.username })
      .select('permissions role')
      .lean()

    if (!admin?.permissions?.canDistributePrizes && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { spinId, txHash: rawTxHash } = body

    if (!spinId || !isValidObjectId(spinId)) {
      return NextResponse.json({ success: false, error: 'Invalid spinId' }, { status: 400 })
    }

    if (!rawTxHash || !isValidTxHash(rawTxHash)) {
      return NextResponse.json({ success: false, error: 'Invalid txHash' }, { status: 400 })
    }

    const txHash = extractTxHash(rawTxHash)

    const spin = await SpinModel.findById(spinId)
    if (!spin) {
      return NextResponse.json({ success: false, error: 'Spin not found' }, { status: 404 })
    }

    if (spin.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Spin already processed' }, { status: 400 })
    }

    // Verify TX on-chain
    const verification = await verifyDistributionTx(txHash)
    if (!verification.valid) {
      return NextResponse.json({
        success: false,
        error: `TX verification failed: ${verification.reason || 'Invalid transaction'}`,
      }, { status: 400 })
    }

    // Update spin
    spin.status = 'distributed'
    spin.distributedAt = new Date()
    spin.distributedBy = payload.username
    spin.distributedTxHash = txHash
    await spin.save()

    // Log
    await AdminLogModel.create({
      action: 'distribute_prize',
      adminUsername: payload.username,
      targetType: 'spin',
      targetId: spinId,
      after: { txHash, wallet: spin.wallet, amount: spin.prizeAmount, verified: true },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    // Send push notification (non-blocking)
    UserModel.findOne({ wallet: spin.wallet.toLowerCase() })
      .select('pwaPushSubscription')
      .lean()
      .then(async (user) => {
        if (user?.pwaPushSubscription?.endpoint) {
          const prizeSymbol = spin.prizeType === 'liquid_victory' ? 'VICT' :
                              spin.prizeType === 'suitrump' ? 'SUITRUMP' : 'VICT'
          const result = await sendPrizeDistributedPush(
            user.pwaPushSubscription,
            spin.prizeValueUSD,
            prizeSymbol
          )
          if (!result.success && result.error === 'subscription_expired') {
            await UserModel.updateOne(
              { wallet: spin.wallet.toLowerCase() },
              { $set: { pwaPushSubscription: null } }
            )
          }
        }
      })
      .catch((err) => console.error('Push notification error:', err))

    return NextResponse.json({ success: true, message: 'Prize marked as distributed (verified on-chain)' })
  } catch (error) {
    console.error('Admin distribute POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to distribute prize' }, { status: 500 })
  }
}
