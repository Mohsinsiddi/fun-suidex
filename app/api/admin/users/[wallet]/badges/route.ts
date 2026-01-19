import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { getUserBadgeProgress, getUserBadgeStats } from '@/lib/badges'
import { UserModel } from '@/lib/db/models'

// GET /api/admin/users/[wallet]/badges - Get user's badges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
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

    const { wallet } = await params

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Verify user exists
    const user = await UserModel.findOne({ wallet: wallet.toLowerCase() }).lean()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const [{ earned, progress }, stats] = await Promise.all([
      getUserBadgeProgress(wallet.toLowerCase()),
      getUserBadgeStats(wallet.toLowerCase()),
    ])

    return NextResponse.json({
      success: true,
      data: {
        user: {
          wallet: user.wallet,
          totalSpins: user.totalSpins,
          totalWinsUSD: user.totalWinsUSD,
          totalReferred: user.totalReferred,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        },
        earned,
        progress,
        stats,
      },
    })
  } catch (error) {
    console.error('Admin user badges error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
