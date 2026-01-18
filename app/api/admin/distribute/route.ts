// ============================================
// Admin Distribute API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, AdminLogModel, UserModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { isValidObjectId, isValidTxHash, extractTxHash, escapeRegex } from '@/lib/utils/validation'
import { sendPrizeDistributedPush } from '@/lib/push/webPush'

// GET - Get pending prizes with pagination
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request)

    // Parse filter params
    const url = new URL(request.url)
    const prizeType = url.searchParams.get('prizeType')
    const walletSearch = url.searchParams.get('wallet')?.toLowerCase().trim()

    // Build query
    const query: Record<string, unknown> = {
      status: 'pending',
      prizeType: { $ne: 'no_prize' },
    }
    if (prizeType && prizeType !== 'all') {
      query.prizeType = prizeType
    }
    // Filter by wallet address (partial match) - escape regex to prevent injection
    if (walletSearch) {
      query.wallet = { $regex: escapeRegex(walletSearch), $options: 'i' }
    }

    // Get pending prizes with pagination (newest first)
    const [pendingPrizes, total] = await Promise.all([
      SpinModel.find(query)
        .select('wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SpinModel.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: pendingPrizes,
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
    return NextResponse.json({ success: false, error: 'Failed to get pending prizes' }, { status: 500 })
  }
}

// POST - Mark prize as distributed
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    // Check permission
    const admin = await AdminModel.findOne({ username: payload.username })
      .select('permissions role')
      .lean()

    if (!admin?.permissions?.canDistributePrizes && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { spinId, txHash: rawTxHash } = body

    // Validate inputs
    if (!spinId || !isValidObjectId(spinId)) {
      return NextResponse.json({ success: false, error: 'Invalid spinId' }, { status: 400 })
    }

    if (!rawTxHash || !isValidTxHash(rawTxHash)) {
      return NextResponse.json({ success: false, error: 'Invalid txHash' }, { status: 400 })
    }

    // Extract clean hash from URL if needed
    const txHash = extractTxHash(rawTxHash)

    const spin = await SpinModel.findById(spinId)
    if (!spin) {
      return NextResponse.json({ success: false, error: 'Spin not found' }, { status: 404 })
    }

    if (spin.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Spin already processed' }, { status: 400 })
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
      after: { txHash, wallet: spin.wallet, amount: spin.prizeAmount },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    // Send push notification if user has PWA push enabled (non-blocking)
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
            // Clean up expired subscription
            await UserModel.updateOne(
              { wallet: spin.wallet.toLowerCase() },
              { $set: { pwaPushSubscription: null } }
            )
          }
        }
      })
      .catch((err) => console.error('Push notification error:', err))

    return NextResponse.json({ success: true, message: 'Prize marked as distributed' })
  } catch (error) {
    console.error('Admin distribute POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to distribute prize' }, { status: 500 })
  }
}
