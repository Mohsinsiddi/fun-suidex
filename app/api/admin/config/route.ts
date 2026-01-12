// ============================================
// Admin Config API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel, AdminConfigModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { DEFAULT_ADMIN_CONFIG } from '@/constants'

// GET - Get full config (admin only)
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

    let config = await AdminConfigModel.findById('main')
    
    if (!config) {
      // Return default config if not exists
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_ADMIN_CONFIG,
          adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS || '',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        spinRateSUI: config.spinRateSUI,
        adminWalletAddress: config.adminWalletAddress,
        autoApprovalLimitSUI: config.autoApprovalLimitSUI,
        paymentLookbackHours: config.paymentLookbackHours,
        referralCommissionPercent: config.referralCommissionPercent,
        referralEnabled: config.referralEnabled,
        spinPurchaseEnabled: config.spinPurchaseEnabled,
        freeSpinMinStakeUSD: config.freeSpinMinStakeUSD,
        freeSpinCooldownHours: config.freeSpinCooldownHours,
        prizeTable: config.prizeTable,
      },
    })
  } catch (error) {
    console.error('Admin config GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get config' }, { status: 500 })
  }
}

// PUT - Update config (admin only)
export async function PUT(request: NextRequest) {
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

    // Check permission
    await connectDB()
    const admin = await AdminModel.findOne({ username: payload.username })
    if (!admin?.permissions?.canEditConfig && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()

    // Validate prize table
    if (body.prizeTable && body.prizeTable.length !== 16) {
      return NextResponse.json({ success: false, error: 'Prize table must have exactly 16 slots' }, { status: 400 })
    }

    // Get existing config or create new
    let config = await AdminConfigModel.findById('main')
    const before = config ? config.toObject() : null

    if (!config) {
      config = new AdminConfigModel({
        _id: 'main',
        ...DEFAULT_ADMIN_CONFIG,
      })
    }

    // Update fields
    if (body.spinRateSUI !== undefined) config.spinRateSUI = body.spinRateSUI
    if (body.adminWalletAddress !== undefined) config.adminWalletAddress = body.adminWalletAddress
    if (body.autoApprovalLimitSUI !== undefined) config.autoApprovalLimitSUI = body.autoApprovalLimitSUI
    if (body.paymentLookbackHours !== undefined) config.paymentLookbackHours = body.paymentLookbackHours
    if (body.referralCommissionPercent !== undefined) config.referralCommissionPercent = body.referralCommissionPercent
    if (body.referralEnabled !== undefined) config.referralEnabled = body.referralEnabled
    if (body.spinPurchaseEnabled !== undefined) config.spinPurchaseEnabled = body.spinPurchaseEnabled
    if (body.freeSpinMinStakeUSD !== undefined) config.freeSpinMinStakeUSD = body.freeSpinMinStakeUSD
    if (body.freeSpinCooldownHours !== undefined) config.freeSpinCooldownHours = body.freeSpinCooldownHours
    if (body.prizeTable !== undefined) {
      config.prizeTable = body.prizeTable.map((slot: any, i: number) => ({
        slotIndex: i,
        type: slot.type || 'no_prize',
        amount: slot.amount || 0,
        valueUSD: slot.valueUSD || 0,
        weight: slot.weight || 1,
        lockDuration: slot.lockDuration || null,
      }))
    }

    config.updatedAt = new Date()
    config.updatedBy = payload.username

    await config.save()

    // Log the action
    await AdminLogModel.create({
      action: 'config_update',
      adminUsername: payload.username,
      targetType: 'config',
      targetId: 'main',
      before,
      after: config.toObject(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
    })
  } catch (error) {
    console.error('Admin config PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 })
  }
}
