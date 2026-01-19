import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { generateReferralLink } from '@/lib/referral'
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
    const user = await UserModel.findOne({ wallet: payload.wallet }).select('wallet referralCode hasCompletedFirstSpin').lean()
    
    if (!user?.hasCompletedFirstSpin) {
      return NextResponse.json({ success: false, error: 'Complete first spin to unlock', eligible: false }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        link: generateReferralLink(user.wallet),
        code: user.referralCode,
        wallet: user.wallet,
      },
    })
  } catch (error) {
    console.error('Referral link error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
