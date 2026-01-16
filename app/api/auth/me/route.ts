import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserBadgeModel, AdminConfigModel } from '@/lib/db/models'
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

    const [user, badgeCount, config] = await Promise.all([
      UserModel.findOne({ wallet: payload.wallet }),
      UserBadgeModel.countDocuments({ wallet: payload.wallet }),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ])

    if (!user) {
      return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    // Check profile eligibility
    const profileMinSpins = config?.profileShareMinSpins || 10
    const profileEligible = user.totalSpins >= profileMinSpins && config?.profileSharingEnabled !== false

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins: 0,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        biggestWinUSD: user.biggestWinUSD,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        totalReferred: user.totalReferred || 0,
        // Streak
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        // Badges
        badgeCount,
        // Profile
        profileSlug: user.profileSlug || null,
        isProfilePublic: user.isProfilePublic || false,
        profileEligible,
        profileMinSpins,
        // Timestamps
        memberSince: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ success: false, error: ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
