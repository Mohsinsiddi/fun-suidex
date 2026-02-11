// ============================================
// Admin Affiliates API (Enhanced with filters)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, parseSortParams } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { page, limit, skip } = parsePaginationParams(request)
    const { sortField, sortOrder } = parseSortParams(
      request,
      ['createdAt', 'rewardValueUSD', 'rewardAmountVICT'],
      'createdAt'
    )

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status') || 'all'
    const tweetStatus = url.searchParams.get('tweetStatus')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    // Build query
    const query: Record<string, unknown> = {}
    if (statusFilter !== 'all') {
      query.payoutStatus = statusFilter
    }
    if (tweetStatus && tweetStatus !== 'all') {
      query.tweetStatus = tweetStatus
    }
    if (dateFrom || dateTo) {
      const dateQ: Record<string, Date> = {}
      if (dateFrom) dateQ.$gte = new Date(dateFrom)
      if (dateTo) dateQ.$lte = new Date(dateTo + 'T23:59:59.999Z')
      query.createdAt = dateQ
    }

    const [rewards, total, statsResult] = await Promise.all([
      AffiliateRewardModel.find(query)
        .select('referrerWallet refereeWallet fromWallet rewardAmountVICT rewardValueUSD tweetStatus payoutStatus createdAt paidAt paidTxHash')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      AffiliateRewardModel.countDocuments(query),
      AffiliateRewardModel.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$payoutStatus',
                  count: { $sum: 1 },
                },
              },
            ],
            pendingTotals: [
              { $match: { payoutStatus: { $ne: 'paid' } } },
              {
                $group: {
                  _id: null,
                  totalVICT: { $sum: '$rewardAmountVICT' },
                  totalUSD: { $sum: '$rewardValueUSD' },
                },
              },
            ],
          },
        },
      ]),
    ])

    const statusCounts = statsResult[0]?.statusCounts || []
    const pendingTotals = statsResult[0]?.pendingTotals[0] || { totalVICT: 0, totalUSD: 0 }

    const stats = {
      pendingTweet: statusCounts.find((s: { _id: string; count: number }) => s._id === 'pending_tweet')?.count || 0,
      ready: statusCounts.find((s: { _id: string; count: number }) => s._id === 'ready')?.count || 0,
      paid: statusCounts.find((s: { _id: string; count: number }) => s._id === 'paid')?.count || 0,
      pendingVICT: pendingTotals.totalVICT,
      pendingUSD: pendingTotals.totalUSD,
    }

    return NextResponse.json({
      success: true,
      data: {
        items: rewards,
        stats,
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
    console.error('Admin affiliates error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
