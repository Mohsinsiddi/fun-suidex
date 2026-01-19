import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getUserBadgeProgress, getUserBadgeStats } from '@/lib/badges'

// GET /api/badges/user - Get authenticated user's badges and progress
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    await connectDB()

    const [{ earned, progress }, stats] = await Promise.all([
      getUserBadgeProgress(payload.wallet),
      getUserBadgeStats(payload.wallet),
    ])

    // Get next badges to unlock (closest to 100%)
    const nextBadges = progress
      .filter(p => !p.isUnlocked && p.progressPercent > 0)
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 3)

    return NextResponse.json({
      success: true,
      data: {
        earned,
        progress,
        stats,
        nextBadges,
      },
    })
  } catch (error) {
    console.error('User badges error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
