// ============================================
// Admin Revenue API (Enhanced with filters)
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { PaymentModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, parseSortParams } from '@/lib/utils/pagination'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const { page, limit, skip } = parsePaginationParams(request)
    const { sortField, sortOrder } = parseSortParams(
      request,
      ['createdAt', 'amountSUI', 'claimedAt', 'spinsCredited'],
      'createdAt'
    )

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const minAmount = url.searchParams.get('minAmount')

    // Build payments query
    const paymentsQuery: Record<string, unknown> = {}
    if (status && status !== 'all') {
      paymentsQuery.claimStatus = status
    }
    if (dateFrom || dateTo) {
      const dateQ: Record<string, Date> = {}
      if (dateFrom) dateQ.$gte = new Date(dateFrom)
      if (dateTo) dateQ.$lte = new Date(dateTo + 'T23:59:59.999Z')
      paymentsQuery.createdAt = dateQ
    }
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min) && min > 0) {
        paymentsQuery.amountSUI = { $gte: min }
      }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [statsResult, recentPayments, totalPayments] = await Promise.all([
      PaymentModel.aggregate([
        {
          $facet: {
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
            pending: [
              { $match: { claimStatus: 'pending_approval' } },
              { $count: 'count' },
            ],
          },
        },
      ]),
      PaymentModel.find(paymentsQuery)
        .select('txHash senderWallet amountSUI claimStatus claimedAt createdAt spinsCredited')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(paymentsQuery),
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
