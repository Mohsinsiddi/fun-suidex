import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel, AdminLogModel, UserModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { awardSpecialBadge } from '@/lib/badges'

// POST /api/admin/badges/award - Award special badge to user
export async function POST(request: NextRequest) {
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

    await connectDB()

    // Check permission
    const admin = await AdminModel.findOne({ username: payload.username }).lean()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      )
    }

    const canManage = admin.role === 'super_admin' || admin.permissions?.canManageBadges
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { wallet, badgeId, reason } = body

    if (!wallet || !badgeId) {
      return NextResponse.json(
        { success: false, error: 'wallet and badgeId required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await UserModel.findOne({ wallet: wallet.toLowerCase() })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Award badge
    const userBadge = await awardSpecialBadge(
      wallet.toLowerCase(),
      badgeId,
      payload.username,
      reason
    )

    // Log admin action
    await AdminLogModel.create({
      adminId: admin._id,
      adminUsername: payload.username,
      action: 'award_badge',
      targetType: 'user_badge',
      targetId: userBadge?._id,
      details: {
        wallet: wallet.toLowerCase(),
        badgeId,
        reason,
      },
    })

    return NextResponse.json({
      success: true,
      data: userBadge,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('Award badge error:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
