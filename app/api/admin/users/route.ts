// ============================================
// Admin Users API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

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

    // Get all users, sorted by last active
    const users = await UserModel.find({})
      .select('wallet purchasedSpins bonusSpins totalSpins totalWinsUSD createdAt lastActiveAt')
      .sort({ lastActiveAt: -1 })
      .limit(500)
      .lean()

    return NextResponse.json({
      success: true,
      data: users,
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get users' }, { status: 500 })
  }
}
