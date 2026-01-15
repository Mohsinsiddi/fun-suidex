// ============================================
// Referral Earnings API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    // Parse pagination params (max 50 enforced by utility)
    const { page, limit, skip } = parsePaginationParams(request)

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    // Build query
    const query: Record<string, unknown> = { referrerWallet: payload.wallet }
    if (status && status !== 'all') {
      query.payoutStatus = status
    }

    // Get earnings with pagination
    const [rewards, total] = await Promise.all([
      AffiliateRewardModel.find(query)
        .select('refereeWallet fromWallet originalPrizeVICT originalPrizeUSD rewardAmountVICT rewardValueUSD tweetStatus payoutStatus createdAt paidAt paidTxHash tweetIntentUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AffiliateRewardModel.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: rewards,
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
    console.error('Referral earnings error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
