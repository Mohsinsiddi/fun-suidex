// ============================================
// Admin Distribution Sync API
// Verifies distributed prize TX hashes on-chain
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, DistributionCheckpointModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { batchVerifyDistributions } from '@/lib/sui/client'

// GET - Return current checkpoint status
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const checkpoint = await DistributionCheckpointModel.findById('main').lean()

    // Count how many distributed spins exist at all
    const distributedCount = await SpinModel.countDocuments({
      status: 'distributed',
      distributedTxHash: { $ne: null },
    })

    return NextResponse.json({
      success: true,
      data: {
        _id: 'main',
        lastSyncedAt: checkpoint?.lastSyncedAt ?? null,
        lastTxDigest: checkpoint?.lastTxDigest ?? null,
        totalVerified: checkpoint?.totalVerified ?? 0,
        totalFailed: checkpoint?.totalFailed ?? 0,
        totalSkipped: checkpoint?.totalSkipped ?? 0,
        syncInProgress: checkpoint?.syncInProgress ?? false,
        updatedBy: checkpoint?.updatedBy ?? 'system',
        // Extra context so the UI can show meaningful messages
        hasDistributions: distributedCount > 0,
        totalDistributed: distributedCount,
      },
    })
  } catch (error) {
    console.error('Admin distribute sync GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get checkpoint status' }, { status: 500 })
  }
}

// POST - Trigger distribution sync verification
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

    // Get or create checkpoint
    const checkpoint = await DistributionCheckpointModel.findById('main')

    // Prevent double-sync
    if (checkpoint?.syncInProgress) {
      return NextResponse.json(
        { success: false, error: 'Sync already in progress' },
        { status: 409 }
      )
    }

    // Mark sync as in progress
    await DistributionCheckpointModel.findOneAndUpdate(
      { _id: 'main' },
      { $set: { syncInProgress: true, updatedBy: payload.username } },
      { upsert: true }
    )

    try {
      // Build query for distributed spins with TX hashes
      const query: Record<string, unknown> = {
        status: 'distributed',
        distributedTxHash: { $ne: null },
      }

      // If we have a last sync timestamp, only fetch spins since then
      // Otherwise fetch the last 100 distributed spins
      if (checkpoint?.lastSyncedAt) {
        query.distributedAt = { $gte: checkpoint.lastSyncedAt }
      }

      const spinsToVerify = await SpinModel.find(query)
        .select('_id distributedTxHash wallet prizeAmount prizeType distributedAt')
        .sort({ distributedAt: -1 })
        .limit(checkpoint?.lastSyncedAt ? 0 : 100)
        .lean()

      if (spinsToVerify.length === 0) {
        // Nothing to verify, release the lock
        await DistributionCheckpointModel.findOneAndUpdate(
          { _id: 'main' },
          {
            $set: {
              syncInProgress: false,
              lastSyncedAt: new Date(),
              updatedBy: payload.username,
            },
          },
          { upsert: true }
        )

        // Check if there are any distributions at all
        const hasAny = await SpinModel.exists({
          status: 'distributed',
          distributedTxHash: { $ne: null },
        })

        return NextResponse.json({
          success: true,
          data: {
            verified: 0,
            failed: 0,
            total: 0,
            message: hasAny
              ? 'All distributions already synced. Nothing new to verify.'
              : 'No distributions found. Distribute prizes first before syncing.',
          },
        })
      }

      // Collect TX hashes for batch verification
      const txHashes = spinsToVerify
        .map((s) => s.distributedTxHash)
        .filter((hash): hash is string => !!hash)

      // Batch verify on SUI blockchain
      const verifyResults = await batchVerifyDistributions(txHashes)

      // Process results — categorize into verified / failed / skipped
      let verified = 0
      let failed = 0
      let skipped = 0

      for (const spin of spinsToVerify) {
        if (!spin.distributedTxHash) continue

        const result = verifyResults.get(spin.distributedTxHash)
        if (!result) continue

        if (result.valid) {
          verified++
        } else if (result.notFound) {
          // TX doesn't exist on-chain — likely mock/test data, don't mark as failed
          skipped++
        } else {
          // TX exists but verification failed (wrong status, invalid transfer, etc.)
          failed++
          await SpinModel.findByIdAndUpdate(spin._id, {
            $set: {
              status: 'failed',
              failureReason: result.reason || 'On-chain verification failed',
            },
          })
        }
      }

      const total = verified + failed + skipped

      // Update checkpoint — only count real verified/failed, not skipped
      await DistributionCheckpointModel.findOneAndUpdate(
        { _id: 'main' },
        {
          $set: {
            syncInProgress: false,
            lastSyncedAt: new Date(),
            updatedBy: payload.username,
          },
          $inc: {
            totalVerified: verified,
            totalFailed: failed,
            totalSkipped: skipped,
          },
        },
        { upsert: true }
      )

      // Log the sync action
      await AdminLogModel.create({
        action: 'distribution_sync',
        adminUsername: payload.username,
        targetType: 'spin',
        targetId: 'batch',
        after: { verified, failed, skipped, total },
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      })

      // Build a descriptive message
      const parts: string[] = []
      if (verified > 0) parts.push(`${verified} verified`)
      if (failed > 0) parts.push(`${failed} failed`)
      if (skipped > 0) parts.push(`${skipped} skipped (TX not found on-chain)`)
      const message = parts.length > 0
        ? `Sync complete: ${parts.join(', ')}.`
        : 'Sync complete. No results to report.'

      return NextResponse.json({
        success: true,
        data: { verified, failed, skipped, total, message },
      })
    } catch (syncError) {
      // Release the lock on error
      await DistributionCheckpointModel.findOneAndUpdate(
        { _id: 'main' },
        { $set: { syncInProgress: false } },
        { upsert: true }
      )
      throw syncError
    }
  } catch (error) {
    console.error('Admin distribute sync POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to sync distributions' }, { status: 500 })
  }
}

// PUT - Reset sync counters
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const admin = await AdminModel.findOne({ username: payload.username })
      .select('permissions role')
      .lean()

    if (!admin?.permissions?.canDistributePrizes && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const before = await DistributionCheckpointModel.findById('main').lean()

    await DistributionCheckpointModel.findOneAndUpdate(
      { _id: 'main' },
      {
        $set: {
          totalVerified: 0,
          totalFailed: 0,
          totalSkipped: 0,
          lastSyncedAt: null,
          lastTxDigest: null,
          syncInProgress: false,
          updatedBy: payload.username,
        },
      },
      { upsert: true }
    )

    await AdminLogModel.create({
      action: 'sync_reset',
      adminUsername: payload.username,
      targetType: 'checkpoint',
      targetId: 'main',
      before: before ? { totalVerified: before.totalVerified, totalFailed: before.totalFailed } : null,
      after: { totalVerified: 0, totalFailed: 0 },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({
      success: true,
      message: 'Sync counters reset successfully',
    })
  } catch (error) {
    console.error('Admin distribute sync PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to reset counters' }, { status: 500 })
  }
}
