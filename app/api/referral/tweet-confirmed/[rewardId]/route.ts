import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel, UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { checkAndAwardBadges } from '@/lib/badges'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { isValidObjectId } from '@/lib/utils/validation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params

    // Validate rewardId format
    if (!rewardId || !isValidObjectId(rewardId)) {
      return NextResponse.json({ success: false, error: 'Invalid reward ID' }, { status: 400 })
    }

    // Rate limit - 30 per minute
    const rateLimit = checkRateLimit(request, 'spin')
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

    const reward = await AffiliateRewardModel.findById(rewardId)
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (reward.referrerWallet !== payload.wallet) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    if (reward.tweetStatus === 'completed') return NextResponse.json({ success: true, alreadyConfirmed: true })

    await AffiliateRewardModel.updateOne({ _id: rewardId }, { $set: { tweetStatus: 'completed', tweetReturnedAt: new Date(), payoutStatus: 'ready' } })

    // Increment tweet count and check for social badges
    await UserModel.updateOne({ wallet: payload.wallet }, { $inc: { totalTweets: 1 } })
    checkAndAwardBadges(payload.wallet).catch(err => console.error('Badge check error:', err))

    return NextResponse.json({ success: true, message: 'Tweet confirmed! Ready for payout.' })
  } catch (error) {
    console.error('Tweet confirmed error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
