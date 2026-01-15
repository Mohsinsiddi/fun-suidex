import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const reward = await AffiliateRewardModel.findById(rewardId)
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (reward.referrerWallet !== payload.wallet) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    if (reward.tweetStatus === 'completed') return NextResponse.json({ success: false, error: 'Already tweeted' }, { status: 400 })

    await AffiliateRewardModel.updateOne({ _id: rewardId }, { $set: { tweetStatus: 'clicked', tweetClickedAt: new Date() } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tweet clicked error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
