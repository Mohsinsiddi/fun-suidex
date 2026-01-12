// ============================================
// Auth Me API
// ============================================
// GET /api/auth/me - Get current authenticated user

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Connect to database
    await connectDB()

    // Find user
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify session exists
    const session = user.sessions.find(
      (s: any) => s.sessionId === payload.sessionId && s.isActive
    )
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    // Count referrals
    const referralCount = await ReferralModel.countDocuments({
      referrerWallet: user.wallet,
    })

    // Calculate free spins (would check staking in production)
    const freeSpins = 1 // TODO: Check staking eligibility and cooldown

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        referralCode: user.referralCode,
        referralCount,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}
