import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const { referrerWallet } = await request.json()
    if (!referrerWallet) return NextResponse.json({ success: false, error: 'Referrer required' }, { status: 400 })
    if (referrerWallet.toLowerCase() === payload.wallet.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Cannot refer yourself' }, { status: 400 })
    }

    await connectDB()

    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (user?.referredBy) return NextResponse.json({ success: false, error: 'Already referred', alreadyReferred: true }, { status: 400 })

    const referrer = await UserModel.findOne({ wallet: referrerWallet.toLowerCase(), hasCompletedFirstSpin: true })
    if (!referrer) return NextResponse.json({ success: false, error: 'Invalid referrer' }, { status: 400 })

    await ReferralModel.create({ referrerWallet: referrerWallet.toLowerCase(), referredWallet: payload.wallet })
    await UserModel.updateOne({ wallet: payload.wallet }, { $set: { referredBy: referrerWallet.toLowerCase() } })
    await UserModel.updateOne({ wallet: referrerWallet.toLowerCase() }, { $inc: { totalReferred: 1 } })

    return NextResponse.json({ success: true, message: 'Referral linked' })
  } catch (error) {
    console.error('Apply referral error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
