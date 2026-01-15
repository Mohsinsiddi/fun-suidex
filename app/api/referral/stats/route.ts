import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { ReferralModel, AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const [referrals, rewards] = await Promise.all([
      ReferralModel.find({ referrerWallet: payload.wallet }),
      AffiliateRewardModel.find({ referrerWallet: payload.wallet }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalReferred: referrals.length,
        activeReferred: referrals.filter(r => r.isActive !== false).length,
        totalEarningsVICT: rewards.reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
        totalEarningsUSD: rewards.reduce((s, r) => s + (r.rewardValueUSD || 0), 0),
        pendingTweets: rewards.filter(r => r.tweetStatus === 'pending' || r.tweetStatus === 'clicked').length,
        readyForPayout: rewards.filter(r => r.payoutStatus === 'ready').length,
        paidOut: rewards.filter(r => r.payoutStatus === 'paid').length,
        pendingEarningsVICT: rewards.filter(r => r.payoutStatus !== 'paid').reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
      },
    })
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
