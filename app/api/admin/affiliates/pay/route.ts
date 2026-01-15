import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const { rewardIds, txHash } = await request.json()
    if (!rewardIds?.length) return NextResponse.json({ success: false, error: 'Reward IDs required' }, { status: 400 })

    await connectDB()

    const result = await AffiliateRewardModel.updateMany(
      { _id: { $in: rewardIds }, payoutStatus: 'ready' },
      { $set: { payoutStatus: 'paid', status: 'paid', paidAt: new Date(), paidTxHash: txHash || null } }
    )

    return NextResponse.json({ success: true, message: `Marked ${result.modifiedCount} rewards as paid`, count: result.modifiedCount })
  } catch (error) {
    console.error('Admin pay error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
