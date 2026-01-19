// ============================================
// Admin Revenue API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { PaymentModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    // Parse pagination for recent payments
    const { page, limit, skip } = parsePaginationParams(request)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Optimized: Single aggregation pipeline for all stats
    const [statsResult, recentPayments, totalPayments] = await Promise.all([
      PaymentModel.aggregate([
        {
          $facet: {
            // Total stats (all claimed payments)
            total: [
              { $match: { claimStatus: 'claimed' } },
              {
                $group: {
                  _id: null,
                  totalSUI: { $sum: '$amountSUI' },
                  count: { $sum: 1 },
                },
              },
            ],
            // Today stats
            today: [
              { $match: { claimStatus: 'claimed', claimedAt: { $gte: todayStart } } },
              {
                $group: {
                  _id: null,
                  totalSUI: { $sum: '$amountSUI' },
                  count: { $sum: 1 },
                },
              },
            ],
            // Week stats
            week: [
              { $match: { claimStatus: 'claimed', claimedAt: { $gte: weekStart } } },
              {
                $group: {
                  _id: null,
                  totalSUI: { $sum: '$amountSUI' },
                  count: { $sum: 1 },
                },
              },
            ],
            // Pending count
            pending: [
              { $match: { claimStatus: 'pending_approval' } },
              { $count: 'count' },
            ],
          },
        },
      ]),
      // Recent payments with pagination
      PaymentModel.find({})
        .select('txHash senderWallet amountSUI claimStatus claimedAt createdAt spinsCredited')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      // Total count for pagination
      PaymentModel.countDocuments({}),
    ])

    const stats = statsResult[0] || {}

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenueSUI: stats.total?.[0]?.totalSUI || 0,
          totalPayments: stats.total?.[0]?.count || 0,
          todayRevenueSUI: stats.today?.[0]?.totalSUI || 0,
          todayPayments: stats.today?.[0]?.count || 0,
          weekRevenueSUI: stats.week?.[0]?.totalSUI || 0,
          weekPayments: stats.week?.[0]?.count || 0,
          pendingApproval: stats.pending?.[0]?.count || 0,
        },
        recentPayments,
      },
      pagination: {
        page,
        limit,
        total: totalPayments,
        totalPages: Math.ceil(totalPayments / limit),
        hasNext: page < Math.ceil(totalPayments / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin revenue error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get revenue' }, { status: 500 })
  }
}
