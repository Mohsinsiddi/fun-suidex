// ============================================
// Admin Audit Logs API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { parsePaginationParams } from '@/lib/utils/pagination'
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

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request)

    // Parse filter params
    const url = new URL(request.url)
    const action = url.searchParams.get('action')?.trim()
    const adminUsername = url.searchParams.get('adminUsername')?.trim()
    const targetType = url.searchParams.get('targetType')?.trim()
    const dateFrom = url.searchParams.get('dateFrom')?.trim()
    const dateTo = url.searchParams.get('dateTo')?.trim()

    // Build query from filters
    const query: Record<string, unknown> = {}

    if (action) {
      query.action = { $regex: escapeRegex(action), $options: 'i' }
    }

    if (adminUsername) {
      query.adminUsername = { $regex: escapeRegex(adminUsername), $options: 'i' }
    }

    if (targetType) {
      query.targetType = targetType
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {}
      if (dateFrom) {
        dateQuery.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        dateQuery.$lte = new Date(dateTo)
      }
      query.createdAt = dateQuery
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      AdminLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminLogModel.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        items: logs,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin logs GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get audit logs' }, { status: 500 })
  }
}
