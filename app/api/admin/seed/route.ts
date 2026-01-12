// ============================================
// Admin Seed Defaults API
// ============================================
// POST /api/admin/seed

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel, AdminConfigModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { DEFAULT_ADMIN_CONFIG } from '@/constants'
import { ERRORS } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: ERRORS.ADMIN_ONLY },
        { status: 401 }
      )
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    // Only super_admin can seed defaults
    if (payload.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: ERRORS.SUPER_ADMIN_ONLY },
        { status: 403 }
      )
    }

    await connectDB()

    // Verify session still valid in DB
    const admin = await AdminModel.findOne({
      username: payload.username,
      'sessions.sessionId': payload.sessionId,
    })

    if (!admin) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    // Get request body for admin wallet (optional override)
    const body = await request.json().catch(() => ({}))
    const adminWalletAddress =
      body.adminWalletAddress?.toLowerCase() ||
      process.env.ADMIN_WALLET_ADDRESS ||
      ''

    if (!adminWalletAddress) {
      return NextResponse.json(
        { success: false, error: 'Admin wallet address is required' },
        { status: 400 }
      )
    }

    // Check if config exists
    const existingConfig = await AdminConfigModel.findById('main')
    const isOverwrite = !!existingConfig

    if (existingConfig && !body.confirmOverwrite) {
      return NextResponse.json({
        success: false,
        error: 'Config already exists',
        data: {
          requiresConfirmation: true,
          currentConfig: {
            spinRateSUI: existingConfig.spinRateSUI,
            adminWalletAddress: existingConfig.adminWalletAddress,
            referralCommissionPercent: existingConfig.referralCommissionPercent,
          },
        },
      })
    }

    // Delete existing and create new
    if (existingConfig) {
      await AdminConfigModel.deleteOne({ _id: 'main' })
    }

    const config = new AdminConfigModel({
      ...DEFAULT_ADMIN_CONFIG,
      adminWalletAddress,
      updatedAt: new Date(),
      updatedBy: payload.username,
    })

    await config.save()

    // Log the action
    await AdminLogModel.create({
      action: isOverwrite ? 'config_reset' : 'config_seed',
      adminUsername: payload.username,
      targetType: 'config',
      targetId: 'main',
      before: existingConfig ? existingConfig.toObject() : null,
      after: config.toObject(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      message: isOverwrite
        ? 'Configuration reset to defaults'
        : 'Configuration seeded successfully',
      data: {
        spinRateSUI: config.spinRateSUI,
        adminWalletAddress: config.adminWalletAddress,
        referralCommissionPercent: config.referralCommissionPercent,
        autoApprovalLimitSUI: config.autoApprovalLimitSUI,
        prizeTableSlots: config.prizeTable.length,
      },
    })
  } catch (error) {
    console.error('Admin seed error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}

// GET - Check current config status
export async function GET() {
  try {
    await connectDB()

    const config = await AdminConfigModel.findById('main')

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          exists: false,
          needsSeeding: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        needsSeeding: false,
        config: {
          spinRateSUI: config.spinRateSUI,
          adminWalletAddress: config.adminWalletAddress
            ? `${config.adminWalletAddress.slice(0, 10)}...${config.adminWalletAddress.slice(-4)}`
            : null,
          prizeTableSlots: config.prizeTable?.length || 0,
          updatedAt: config.updatedAt,
          updatedBy: config.updatedBy,
        },
      },
    })
  } catch (error) {
    console.error('Config check error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
