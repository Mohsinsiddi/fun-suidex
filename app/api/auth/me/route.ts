import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ERRORS } from '@/constants'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })
    }

    await connectDB()
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) {
      return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins: 0,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        totalReferred: user.totalReferred || 0,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ success: false, error: ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
