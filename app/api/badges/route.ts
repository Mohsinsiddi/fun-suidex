import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { BadgeModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getUserBadgeProgress, initializeBadges } from '@/lib/badges'

// GET /api/badges - Get all badges with optional user progress
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Initialize badges if needed
    await initializeBadges()

    // Check if user is authenticated (optional)
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    let wallet: string | null = null

    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload) wallet = payload.wallet
    }

    // Get all active badges
    const badges = await BadgeModel.find({ isActive: true })
      .sort({ category: 1, sortOrder: 1 })
      .lean()

    // If authenticated, include user progress
    if (wallet) {
      const { progress } = await getUserBadgeProgress(wallet)

      return NextResponse.json({
        success: true,
        data: {
          badges,
          progress,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { badges },
    })
  } catch (error) {
    console.error('Badges list error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
