// Admin Revenue API
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { PaymentModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    
    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Total stats
    const totalStats = await PaymentModel.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amountSUI' }, count: { $sum: 1 } } }
    ])

    // Today stats
    const todayStats = await PaymentModel.aggregate([
      { $match: { status: 'verified', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amountSUI' }, count: { $sum: 1 } } }
    ])

    // Week stats
    const weekStats = await PaymentModel.aggregate([
      { $match: { status: 'verified', createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$amountSUI' }, count: { $sum: 1 } } }
    ])

    // Pending count
    const pendingPayments = await PaymentModel.countDocuments({ status: 'pending' })

    // Recent payments
    const recentPayments = await PaymentModel.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        totalRevenueSUI: totalStats[0]?.total || 0,
        totalPayments: totalStats[0]?.count || 0,
        todayRevenueSUI: todayStats[0]?.total || 0,
        todayPayments: todayStats[0]?.count || 0,
        weekRevenueSUI: weekStats[0]?.total || 0,
        weekPayments: weekStats[0]?.count || 0,
        pendingPayments,
        recentPayments,
      },
    })
  } catch (error) {
    console.error('Admin revenue error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get revenue' }, { status: 500 })
  }
}
