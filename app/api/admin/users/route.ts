// ============================================
// Admin Users API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserBadgeModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, createPaginatedResponse } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request)

    // Parse search/filter params
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase().trim()
    const sortBy = url.searchParams.get('sortBy') || 'lastActiveAt'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1

    // Build query - search by wallet, profileSlug (username), or display name
    const query: Record<string, unknown> = {}
    if (search) {
      query.$or = [
        { wallet: { $regex: search, $options: 'i' } },
        { profileSlug: { $regex: search, $options: 'i' } },
      ]
    }

    // Validate sort field
    const allowedSortFields = ['lastActiveAt', 'createdAt', 'totalSpins', 'totalWinsUSD', 'purchasedSpins']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'lastActiveAt'

    // Get users with pagination
    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select('wallet profileSlug purchasedSpins bonusSpins totalSpins totalWinsUSD createdAt lastActiveAt referralCode totalReferred currentStreak longestStreak')
        .sort({ [safeSortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ])

    // Get badge counts for users
    const wallets = users.map((u: { wallet: string }) => u.wallet)
    const badgeCounts = await UserBadgeModel.aggregate([
      { $match: { wallet: { $in: wallets } } },
      { $group: { _id: '$wallet', count: { $sum: 1 } } },
    ])
    const badgeCountMap = new Map(badgeCounts.map((b: { _id: string; count: number }) => [b._id, b.count]))

    // Add badge count to users
    const usersWithBadges = users.map((user: { wallet: string }) => ({
      ...user,
      badgeCount: badgeCountMap.get(user.wallet) || 0,
    }))

    return NextResponse.json({
      success: true,
      ...createPaginatedResponse(usersWithBadges, page, limit, total),
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get users' }, { status: 500 })
  }
}
