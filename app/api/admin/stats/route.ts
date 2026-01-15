// ============================================
// Admin Stats API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, SpinModel, PaymentModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // Verify admin auth
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
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    await connectDB()

    // Get stats
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalUsers,
      totalSpins,
      pendingPrizes,
      todaySpins,
      revenueAgg,
      todayRevenueAgg,
    ] = await Promise.all([
      UserModel.countDocuments(),
      SpinModel.countDocuments(),
      SpinModel.countDocuments({ status: 'pending', prizeAmount: { $gt: 0 } }),
      SpinModel.countDocuments({ createdAt: { $gte: startOfDay } }),
      PaymentModel.aggregate([
        { $match: { claimStatus: 'claimed' } },
        { $group: { _id: null, total: { $sum: '$amountSUI' } } },
      ]),
      PaymentModel.aggregate([
        { $match: { claimStatus: 'claimed', claimedAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amountSUI' } } },
      ]),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalSpins,
        totalRevenueSUI: revenueAgg[0]?.total || 0,
        pendingPrizes,
        todaySpins,
        todayRevenueSUI: todayRevenueAgg[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
