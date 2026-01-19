// ============================================
// Admin Credit Spins API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, AdminModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { isValidSuiAddress } from '@/lib/sui/client'
import { sendSpinsCreditedPush } from '@/lib/push/webPush'

export async function POST(request: NextRequest) {
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

    // Check permission
    const admin = await AdminModel.findOne({ username: payload.username })
    if (!admin?.permissions?.canManualCreditSpins && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { wallet, amount, type } = body

    // Validate
    if (!wallet || !isValidSuiAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }

    if (!amount || amount <= 0 || amount > 1000) {
      return NextResponse.json({ success: false, error: 'Invalid amount (1-1000)' }, { status: 400 })
    }

    if (!type || !['purchased', 'bonus'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type (purchased or bonus)' }, { status: 400 })
    }

    // Find or create user
    let user = await UserModel.findOne({ wallet: wallet.toLowerCase() })
    
    if (!user) {
      user = new UserModel({
        wallet: wallet.toLowerCase(),
        purchasedSpins: 0,
        bonusSpins: 0,
      })
    }

    const before = {
      purchasedSpins: user.purchasedSpins,
      bonusSpins: user.bonusSpins,
    }

    // Credit spins
    if (type === 'purchased') {
      user.purchasedSpins += amount
    } else {
      user.bonusSpins += amount
    }

    await user.save()

    // Log the action
    await AdminLogModel.create({
      action: 'manual_credit',
      adminUsername: payload.username,
      targetType: 'user',
      targetId: wallet.toLowerCase(),
      before,
      after: {
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        credited: { type, amount },
      },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    // Send push notification if user has PWA push enabled (non-blocking)
    UserModel.findOne({ wallet: wallet.toLowerCase() })
      .select('pwaPushSubscription')
      .lean()
      .then(async (userForPush) => {
        if (userForPush?.pwaPushSubscription?.endpoint) {
          const result = await sendSpinsCreditedPush(
            userForPush.pwaPushSubscription,
            amount,
            type as 'purchased' | 'bonus'
          )
          if (!result.success && result.error === 'subscription_expired') {
            // Clean up expired subscription
            await UserModel.updateOne(
              { wallet: wallet.toLowerCase() },
              { $set: { pwaPushSubscription: null } }
            )
          }
        }
      })
      .catch((err) => console.error('Push notification error:', err))

    return NextResponse.json({
      success: true,
      message: `Credited ${amount} ${type} spins to ${wallet}`,
      data: {
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
      },
    })
  } catch (error) {
    console.error('Admin credit spins error:', error)
    return NextResponse.json({ success: false, error: 'Failed to credit spins' }, { status: 500 })
  }
}
