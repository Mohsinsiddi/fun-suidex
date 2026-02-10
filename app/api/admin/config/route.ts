// ============================================
// Admin Config API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel, AdminConfigModel, AdminLogModel, PaymentModel } from '@/lib/db/models'
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
        distributorWalletAddress: config.distributorWalletAddress,
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
    if (body.prizeTable) {
      if (body.prizeTable.length !== 16) {
        return NextResponse.json({ success: false, error: 'Prize table must have exactly 16 slots' }, { status: 400 })
      }

      // Validate each slot
      for (let i = 0; i < body.prizeTable.length; i++) {
        const slot = body.prizeTable[i]

        // Validate amount (must be non-negative finite number)
        if (slot.amount !== undefined) {
          if (typeof slot.amount !== 'number' || !Number.isFinite(slot.amount) || slot.amount < 0) {
            return NextResponse.json({ success: false, error: `Invalid amount at slot ${i}: must be a non-negative number` }, { status: 400 })
          }
        }

        // Validate valueUSD (must be non-negative finite number)
        if (slot.valueUSD !== undefined) {
          if (typeof slot.valueUSD !== 'number' || !Number.isFinite(slot.valueUSD) || slot.valueUSD < 0) {
            return NextResponse.json({ success: false, error: `Invalid valueUSD at slot ${i}: must be a non-negative number` }, { status: 400 })
          }
        }

        // Validate weight (must be positive finite number)
        if (slot.weight !== undefined) {
          if (typeof slot.weight !== 'number' || !Number.isFinite(slot.weight) || slot.weight <= 0) {
            return NextResponse.json({ success: false, error: `Invalid weight at slot ${i}: must be a positive number` }, { status: 400 })
          }
        }

        // Validate lockDuration (must be null or valid enum string)
        const validLockDurations = ['1_week', '3_month', '1_year', '3_year', null]
        if (slot.lockDuration !== undefined && slot.lockDuration !== null) {
          if (!validLockDurations.includes(slot.lockDuration)) {
            return NextResponse.json({ success: false, error: `Invalid lockDuration at slot ${i}: must be one of ${validLockDurations.filter(v => v !== null).join(', ')} or null` }, { status: 400 })
          }
        }

        // Validate type
        const validTypes = ['no_prize', 'liquid_victory', 'locked_victory', 'suitrump']
        if (slot.type && !validTypes.includes(slot.type)) {
          return NextResponse.json({ success: false, error: `Invalid type at slot ${i}: must be one of ${validTypes.join(', ')}` }, { status: 400 })
        }
      }
    }

    // Validate other numeric fields
    if (body.spinRateSUI !== undefined) {
      if (typeof body.spinRateSUI !== 'number' || !Number.isFinite(body.spinRateSUI) || body.spinRateSUI <= 0) {
        return NextResponse.json({ success: false, error: 'spinRateSUI must be a positive number' }, { status: 400 })
      }
    }

    if (body.autoApprovalLimitSUI !== undefined) {
      if (typeof body.autoApprovalLimitSUI !== 'number' || !Number.isFinite(body.autoApprovalLimitSUI) || body.autoApprovalLimitSUI < 1) {
        return NextResponse.json({ success: false, error: 'autoApprovalLimitSUI must be at least 1 SUI' }, { status: 400 })
      }
    }

    if (body.referralCommissionPercent !== undefined) {
      if (typeof body.referralCommissionPercent !== 'number' || !Number.isFinite(body.referralCommissionPercent) || body.referralCommissionPercent < 0 || body.referralCommissionPercent > 100) {
        return NextResponse.json({ success: false, error: 'referralCommissionPercent must be between 0 and 100' }, { status: 400 })
      }
    }

    // Get existing config or create new
    let config = await AdminConfigModel.findById('main')
    const before = config ? config.toObject() : null

    if (!config) {
      config = new AdminConfigModel(DEFAULT_ADMIN_CONFIG)
    }

    // Wallet change safeguard: block if pending payments exist (unless force)
    const oldWallet = config.adminWalletAddress
    if (
      body.adminWalletAddress !== undefined &&
      body.adminWalletAddress !== oldWallet &&
      !body.force
    ) {
      const pendingPayments = await PaymentModel.aggregate([
        {
          $match: {
            recipientWallet: oldWallet.toLowerCase(),
            claimStatus: { $in: ['unclaimed', 'pending_approval'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unclaimed: { $sum: { $cond: [{ $eq: ['$claimStatus', 'unclaimed'] }, 1, 0] } },
            pendingApproval: { $sum: { $cond: [{ $eq: ['$claimStatus', 'pending_approval'] }, 1, 0] } },
            totalSUI: { $sum: '$amountSUI' },
            uniqueSenders: { $addToSet: '$senderWallet' },
            oldestTx: { $min: '$timestamp' },
            newestTx: { $max: '$timestamp' },
          },
        },
      ])

      const stats = pendingPayments[0]
      if (stats && stats.total > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot change wallet: ${stats.total} payment(s) are still unclaimed or pending approval.`,
            walletConflict: {
              oldWallet,
              newWallet: body.adminWalletAddress,
              total: stats.total,
              unclaimed: stats.unclaimed,
              pendingApproval: stats.pendingApproval,
              totalSUI: Math.round(stats.totalSUI * 1000) / 1000,
              uniqueSenders: stats.uniqueSenders?.length || 0,
              oldestTx: stats.oldestTx,
              newestTx: stats.newestTx,
            },
          },
          { status: 409 }
        )
      }
    }

    // Update fields
    if (body.spinRateSUI !== undefined) config.spinRateSUI = body.spinRateSUI
    if (body.adminWalletAddress !== undefined) config.adminWalletAddress = body.adminWalletAddress
    if (body.distributorWalletAddress !== undefined) config.distributorWalletAddress = body.distributorWalletAddress || null
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

    const newWallet = config.adminWalletAddress
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // Dedicated wallet_change audit log (high-risk action)
    if (oldWallet && newWallet && oldWallet !== newWallet) {
      await AdminLogModel.create({
        action: 'wallet_change',
        adminUsername: payload.username,
        targetType: 'config',
        targetId: 'main',
        before: { adminWalletAddress: oldWallet },
        after: { adminWalletAddress: newWallet, forced: !!body.force },
        ip,
      })
    }

    // Log the general config update
    await AdminLogModel.create({
      action: 'config_update',
      adminUsername: payload.username,
      targetType: 'config',
      targetId: 'main',
      before,
      after: config.toObject(),
      ip,
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
    })
  } catch (error) {
    console.error('Admin config PUT error:', error)

    // Surface Mongoose validation errors to the admin
    if (error instanceof Error && error.name === 'ValidationError' && 'errors' in error) {
      const mongooseErr = error as Error & { errors: Record<string, { message: string }> }
      const messages = Object.values(mongooseErr.errors).map((e) => e.message)
      return NextResponse.json(
        { success: false, error: messages.join('; ') },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 })
  }
}
