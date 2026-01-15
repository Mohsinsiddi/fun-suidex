import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: any = { referrerWallet: payload.wallet }
    if (status && status !== 'all') query.payoutStatus = status

    const [rewards, total] = await Promise.all([
      AffiliateRewardModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffiliateRewardModel.countDocuments(query),
    ])

    return NextResponse.json({ success: true, rewards, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Referral earnings error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
