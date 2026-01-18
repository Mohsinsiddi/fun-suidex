// ============================================
// Referral Stats API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { ReferralModel, AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function GET(request: NextRequest) {
  try {
    // Rate limit - 60 per minute
    const rateLimit = checkRateLimit(request, 'read')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      )
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    // Optimized: Use aggregation pipelines instead of loading all documents
    const [referralStats, rewardStats] = await Promise.all([
      // Referral counts
      ReferralModel.aggregate([
        { $match: { referrerWallet: payload.wallet } },
        {
          $group: {
            _id: null,
            totalReferred: { $sum: 1 },
            activeReferred: {
              $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] },
            },
          },
        },
      ]),
      // Reward stats
      AffiliateRewardModel.aggregate([
        { $match: { referrerWallet: payload.wallet } },
        {
          $group: {
            _id: null,
            totalEarningsVICT: { $sum: '$rewardAmountVICT' },
            totalEarningsUSD: { $sum: '$rewardValueUSD' },
            pendingTweets: {
              $sum: {
                $cond: [
                  { $in: ['$tweetStatus', ['pending', 'clicked']] },
                  1,
                  0,
                ],
              },
            },
            readyForPayout: {
              $sum: { $cond: [{ $eq: ['$payoutStatus', 'ready'] }, 1, 0] },
            },
            paidOut: {
              $sum: { $cond: [{ $eq: ['$payoutStatus', 'paid'] }, 1, 0] },
            },
            pendingEarningsVICT: {
              $sum: {
                $cond: [
                  { $ne: ['$payoutStatus', 'paid'] },
                  '$rewardAmountVICT',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const refStats = referralStats[0] || { totalReferred: 0, activeReferred: 0 }
    const rewStats = rewardStats[0] || {
      totalEarningsVICT: 0,
      totalEarningsUSD: 0,
      pendingTweets: 0,
      readyForPayout: 0,
      paidOut: 0,
      pendingEarningsVICT: 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReferred: refStats.totalReferred,
        activeReferred: refStats.activeReferred,
        totalEarningsVICT: rewStats.totalEarningsVICT,
        totalEarningsUSD: rewStats.totalEarningsUSD,
        pendingTweets: rewStats.pendingTweets,
        readyForPayout: rewStats.readyForPayout,
        paidOut: rewStats.paidOut,
        pendingEarningsVICT: rewStats.pendingEarningsVICT,
      },
    })
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
