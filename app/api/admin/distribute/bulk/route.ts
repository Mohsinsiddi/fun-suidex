// ============================================
// Admin Bulk Distribute API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { isValidObjectId, isValidTxHash, extractTxHash } from '@/lib/utils/validation'
import { verifyDistributionTx } from '@/lib/sui/client'

const MAX_BATCH_SIZE = 50

// POST - Bulk mark prizes as distributed
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    // Check permission
    const admin = await AdminModel.findOne({ username: payload.username })
      .select('permissions role')
      .lean()

    if (!admin?.permissions?.canDistributePrizes && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { spinIds, txHash: rawTxHash } = body

    // Validate spinIds array
    if (!Array.isArray(spinIds) || spinIds.length === 0) {
      return NextResponse.json({ success: false, error: 'spinIds must be a non-empty array' }, { status: 400 })
    }

    if (spinIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_BATCH_SIZE} items per batch` },
        { status: 400 }
      )
    }

    // Validate each spinId
    for (const id of spinIds) {
      if (!id || typeof id !== 'string' || !isValidObjectId(id)) {
        return NextResponse.json(
          { success: false, error: `Invalid spinId: ${id}` },
          { status: 400 }
        )
      }
    }

    // Validate txHash
    if (!rawTxHash || !isValidTxHash(rawTxHash)) {
      return NextResponse.json({ success: false, error: 'Invalid txHash' }, { status: 400 })
    }

    // Extract clean hash from URL if needed
    const txHash = extractTxHash(rawTxHash)

    // Verify TX on-chain
    const txVerification = await verifyDistributionTx(txHash)
    if (!txVerification.valid) {
      return NextResponse.json(
        { success: false, error: `TX verification failed: ${txVerification.reason || 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Atomically update all pending spins matching the given IDs
    const now = new Date()
    const updateResult = await SpinModel.updateMany(
      {
        _id: { $in: spinIds },
        status: 'pending',
        prizeType: { $ne: 'no_prize' },
      },
      {
        $set: {
          status: 'distributed',
          distributedAt: now,
          distributedBy: payload.username,
          distributedTxHash: txHash,
        },
      }
    )

    const updated = updateResult.modifiedCount
    const failed = spinIds.length - updated

    // Create audit log entries for each successfully updated spin
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // Fetch the updated spins to get wallet/amount info for audit logs
    const updatedSpins = await SpinModel.find({
      _id: { $in: spinIds },
      status: 'distributed',
      distributedTxHash: txHash,
      distributedAt: now,
    })
      .select('_id wallet prizeAmount prizeType')
      .lean()

    if (updatedSpins.length > 0) {
      const logEntries = updatedSpins.map((spin) => ({
        action: 'bulk_distribute_prize',
        adminUsername: payload.username,
        targetType: 'spin' as const,
        targetId: spin._id.toString(),
        after: { txHash, wallet: spin.wallet, amount: spin.prizeAmount, prizeType: spin.prizeType },
        ip,
      }))

      await AdminLogModel.insertMany(logEntries)
    }

    return NextResponse.json({
      success: true,
      data: {
        updated,
        failed,
      },
    })
  } catch (error) {
    console.error('Admin bulk distribute POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to bulk distribute prizes' }, { status: 500 })
  }
}
