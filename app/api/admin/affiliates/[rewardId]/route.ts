import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()
    const reward = await AffiliateRewardModel.findById(rewardId).lean()
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: reward })
  } catch (error) {
    console.error('Admin get reward error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const updates = await request.json()
    const allowed = ['payoutStatus', 'tweetStatus', 'paidTxHash', 'paidAt']
    const sanitized: any = {}
    allowed.forEach(f => { if (updates[f] !== undefined) sanitized[f] = updates[f] })

    if (!Object.keys(sanitized).length) return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })

    await connectDB()
    const reward = await AffiliateRewardModel.findByIdAndUpdate(rewardId, { $set: sanitized }, { new: true })
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: reward })
  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
