// ============================================
// User Spin History API
// ============================================
// Returns authenticated user's spin history with pagination

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ERRORS } from '@/constants'

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const filter = searchParams.get('filter') || 'all'

    await connectDB()

    // Build query
    const query: Record<string, any> = { wallet: payload.wallet }

    if (filter === 'wins') {
      query.prizeType = { $ne: 'no_prize' }
    } else if (filter === 'no_prize') {
      query.prizeType = 'no_prize'
    }

    // Get total count
    const total = await SpinModel.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get spins with pagination
    const spins = await SpinModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('spinType prizeType prizeAmount prizeValueUSD lockDuration status distributedTxHash createdAt')
      .lean()

    // Calculate summary stats (only for first page)
    let stats = null
    if (page === 1) {
      const [totalSpins, totalWins] = await Promise.all([
        SpinModel.countDocuments({ wallet: payload.wallet }),
        SpinModel.countDocuments({ wallet: payload.wallet, prizeType: { $ne: 'no_prize' } }),
      ])

      const totalWinnings = await SpinModel.aggregate([
        { $match: { wallet: payload.wallet, prizeType: { $ne: 'no_prize' } } },
        { $group: { _id: null, total: { $sum: '$prizeValueUSD' } } },
      ])

      stats = {
        totalSpins,
        totalWins,
        winRate: totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : '0',
        totalWinningsUSD: totalWinnings[0]?.total || 0,
      }
    }

    // Format response
    const formattedSpins = spins.map((spin) => ({
      id: String(spin._id),
      spinType: spin.spinType,
      prizeType: spin.prizeType,
      prizeAmount: spin.prizeAmount,
      prizeValueUSD: spin.prizeValueUSD,
      lockDuration: spin.lockDuration || null,
      status: spin.status,
      distributedTxHash: spin.distributedTxHash || null,
      createdAt: spin.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        spins: formattedSpins,
        stats,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Spin history error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
