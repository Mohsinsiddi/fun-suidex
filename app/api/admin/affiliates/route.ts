import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: any = {}
    if (statusFilter !== 'all') query.payoutStatus = statusFilter

    const [rewards, total, stats] = await Promise.all([
      AffiliateRewardModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffiliateRewardModel.countDocuments(query),
      Promise.all([
        AffiliateRewardModel.countDocuments({ payoutStatus: 'pending_tweet' }),
        AffiliateRewardModel.countDocuments({ payoutStatus: 'ready' }),
        AffiliateRewardModel.countDocuments({ payoutStatus: 'paid' }),
        AffiliateRewardModel.aggregate([{ $match: { payoutStatus: { $ne: 'paid' } } }, { $group: { _id: null, total: { $sum: '$rewardAmountVICT' } } }]),
        AffiliateRewardModel.aggregate([{ $match: { payoutStatus: { $ne: 'paid' } } }, { $group: { _id: null, total: { $sum: '$rewardValueUSD' } } }]),
      ]),
    ])

    return NextResponse.json({
      success: true,
      rewards,
      stats: {
        pendingTweet: stats[0],
        ready: stats[1],
        paid: stats[2],
        pendingVICT: stats[3][0]?.total || 0,
        pendingUSD: stats[4][0]?.total || 0,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Admin affiliates error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
