// ============================================
// Admin Distribute API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { isValidObjectId, isValidTxHash } from '@/lib/utils/validation'

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

    // Build query
    const query: Record<string, unknown> = {
      status: 'pending',
      prizeType: { $ne: 'no_prize' },
    }
    if (prizeType && prizeType !== 'all') {
      query.prizeType = prizeType
    }

    // Get pending prizes with pagination
    const [pendingPrizes, total] = await Promise.all([
      SpinModel.find(query)
        .select('wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt')
        .sort({ createdAt: 1 })
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
    const { spinId, txHash } = body

    // Validate inputs
    if (!spinId || !isValidObjectId(spinId)) {
      return NextResponse.json({ success: false, error: 'Invalid spinId' }, { status: 400 })
    }

    if (!txHash || !isValidTxHash(txHash)) {
      return NextResponse.json({ success: false, error: 'Invalid txHash' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, message: 'Prize marked as distributed' })
  } catch (error) {
    console.error('Admin distribute POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to distribute prize' }, { status: 500 })
  }
}
