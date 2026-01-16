import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { getAllBadgesWithStats, initializeBadges } from '@/lib/badges'
import { parsePaginationParams } from '@/lib/utils/pagination'

// GET /api/admin/badges - Get all badges with stats
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    await connectDB()

    // Initialize badges if needed
    await initializeBadges()

    const badges = await getAllBadgesWithStats()

    // Group by category
    const byCategory = badges.reduce((acc, badge) => {
      if (!acc[badge.category]) acc[badge.category] = []
      acc[badge.category].push(badge)
      return acc
    }, {} as Record<string, typeof badges>)

    // Summary stats
    const totalEarned = badges.reduce((sum, b) => sum + b.earnedCount, 0)

    return NextResponse.json({
      success: true,
      data: {
        badges,
        byCategory,
        summary: {
          totalBadges: badges.length,
          totalEarned,
          activeBadges: badges.filter(b => b.isActive).length,
        },
      },
    })
  } catch (error) {
    console.error('Admin badges error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
