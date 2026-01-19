import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request)

    // Use aggregation to group by wallet with pagination
    const [payoutSheet, totalsResult, totalWallets] = await Promise.all([
      // Paginated grouped results
      AffiliateRewardModel.aggregate([
        { $match: { payoutStatus: 'ready' } },
        {
          $group: {
            _id: '$referrerWallet',
            wallet: { $first: '$referrerWallet' },
            totalVICT: { $sum: '$rewardAmountVICT' },
            totalUSD: { $sum: '$rewardValueUSD' },
            rewardCount: { $sum: 1 },
            rewards: { $push: { _id: '$_id', rewardAmountVICT: '$rewardAmountVICT', rewardValueUSD: '$rewardValueUSD', createdAt: '$createdAt' } },
          },
        },
        { $sort: { totalUSD: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 0, wallet: 1, totalVICT: 1, totalUSD: 1, rewardCount: 1, rewards: 1 } },
      ]),
      // Global totals
      AffiliateRewardModel.aggregate([
        { $match: { payoutStatus: 'ready' } },
        {
          $group: {
            _id: null,
            totalVICT: { $sum: '$rewardAmountVICT' },
            totalUSD: { $sum: '$rewardValueUSD' },
            totalRewards: { $sum: 1 },
          },
        },
      ]),
      // Count unique wallets for pagination
      AffiliateRewardModel.distinct('referrerWallet', { payoutStatus: 'ready' }),
    ])

    const totals = totalsResult[0] || { totalVICT: 0, totalUSD: 0, totalRewards: 0 }
    const total = totalWallets.length

    return NextResponse.json({
      success: true,
      data: {
        payoutSheet,
        totals: {
          totalVICT: totals.totalVICT,
          totalUSD: totals.totalUSD,
          totalRecipients: total,
          totalRewards: totals.totalRewards,
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
    console.error('Admin pending error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
