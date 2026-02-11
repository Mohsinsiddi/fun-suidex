// ============================================
// Admin Users API (Enhanced with filters)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserBadgeModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, parseSortParams, createPaginatedResponse } from '@/lib/utils/pagination'
import { escapeRegex } from '@/lib/utils/validation'

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

    const { page, limit, skip } = parsePaginationParams(request)
    const { sortField, sortOrder } = parseSortParams(
      request,
      ['lastActiveAt', 'createdAt', 'totalSpins', 'totalWinsUSD', 'purchasedSpins'],
      'lastActiveAt'
    )

    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase().trim()
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const minSpins = url.searchParams.get('minSpins')
    const maxSpins = url.searchParams.get('maxSpins')

    // Build query
    const query: Record<string, unknown> = {}
    if (search) {
      const safeSearch = escapeRegex(search)
      query.$or = [
        { wallet: { $regex: safeSearch, $options: 'i' } },
        { profileSlug: { $regex: safeSearch, $options: 'i' } },
      ]
    }
    if (dateFrom || dateTo) {
      const dateQ: Record<string, Date> = {}
      if (dateFrom) dateQ.$gte = new Date(dateFrom)
      if (dateTo) dateQ.$lte = new Date(dateTo + 'T23:59:59.999Z')
      query.createdAt = dateQ
    }
    if (minSpins || maxSpins) {
      const spinsQ: Record<string, number> = {}
      if (minSpins) { const n = parseInt(minSpins); if (!isNaN(n)) spinsQ.$gte = n }
      if (maxSpins) { const n = parseInt(maxSpins); if (!isNaN(n)) spinsQ.$lte = n }
      if (Object.keys(spinsQ).length > 0) query.totalSpins = spinsQ
    }

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select('wallet profileSlug purchasedSpins bonusSpins totalSpins totalWinsUSD createdAt lastActiveAt referralCode totalReferred currentStreak longestStreak')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ])

    // Badge counts
    const wallets = users.map((u: { wallet: string }) => u.wallet)
    const badgeCounts = await UserBadgeModel.aggregate([
      { $match: { wallet: { $in: wallets } } },
      { $group: { _id: '$wallet', count: { $sum: 1 } } },
    ])
    const badgeCountMap = new Map(badgeCounts.map((b: { _id: string; count: number }) => [b._id, b.count]))

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
