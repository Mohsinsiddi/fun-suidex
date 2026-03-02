// ============================================
// Admin LP Credits API - Paginated Credit History
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { LPCreditModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams, parseSortParams } from '@/lib/utils/pagination'
import { escapeRegex } from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { page, limit, skip } = parsePaginationParams(request)
    const { sortField, sortOrder } = parseSortParams(
      request,
      ['creditedAt', 'amountUSD', 'spinsCredited'],
      'creditedAt'
    )

    const url = new URL(request.url)
    const wallet = url.searchParams.get('wallet')
    const eventType = url.searchParams.get('eventType')
    const pair = url.searchParams.get('pair')
    const status = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    // Build query
    const query: Record<string, unknown> = {}

    if (wallet) {
      query.wallet = { $regex: escapeRegex(wallet.toLowerCase()), $options: 'i' }
    }
    if (eventType && eventType !== 'all') {
      query.eventType = eventType
    }
    if (pair && pair !== 'all') {
      query.pair = pair
    }
    if (status && status !== 'all') {
      query.status = status
    }
    if (dateFrom || dateTo) {
      const dateQ: Record<string, Date> = {}
      if (dateFrom) dateQ.$gte = new Date(dateFrom)
      if (dateTo) dateQ.$lte = new Date(dateTo + 'T23:59:59.999Z')
      query.creditedAt = dateQ
    }

    const [items, total] = await Promise.all([
      LPCreditModel.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      LPCreditModel.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: { items },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin LP credits error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
