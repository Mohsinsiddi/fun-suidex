// ============================================
// Admin Payment Approve/Reject API
// ============================================
// POST /api/admin/payments/approve - Approve a pending payment
// POST /api/admin/payments/reject  - Reject a pending payment

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { ChainTransactionModel, UserModel, AdminConfigModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { validateBody, mongoIdSchema } from '@/lib/validations'
import { z } from 'zod'

// ----------------------------------------
// Validation Schemas
// ----------------------------------------

const approveSchema = z.object({
  paymentId: mongoIdSchema,
  note: z.string().max(500).optional(),
})

const rejectSchema = z.object({
  paymentId: mongoIdSchema,
  reason: z.string().max(500).optional(),
})

// ----------------------------------------
// POST handler
// ----------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params

    // Validate action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 }
      )
    }

    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })
    }

    const { username } = payload

    await connectDB()

    if (action === 'approve') {
      return handleApprove(request, username)
    } else {
      return handleReject(request, username)
    }
  } catch (error) {
    console.error('Admin payment action error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ----------------------------------------
// Approve Handler
// ----------------------------------------

async function handleApprove(request: NextRequest, adminUsername: string) {
  const { data, error } = await validateBody(request, approveSchema)
  if (error) return error

  const { paymentId, note } = data

  // Find chain transaction
  const chainTx = await ChainTransactionModel.findOne({
    _id: paymentId,
    creditStatus: 'pending_approval',
  })

  if (!chainTx) {
    return NextResponse.json(
      { success: false, error: 'Payment not found or not pending approval' },
      { status: 404 }
    )
  }

  // Get config for spin rate
  const config = await AdminConfigModel.findById('main')
  if (!config) {
    return NextResponse.json(
      { success: false, error: 'System configuration not found' },
      { status: 500 }
    )
  }

  // Calculate spins
  const spinsCredited = Math.floor(+(chainTx.amountSUI / config.spinRateSUI).toFixed(6))

  if (spinsCredited <= 0) {
    return NextResponse.json(
      { success: false, error: 'Payment amount too small to credit any spins' },
      { status: 400 }
    )
  }

  // Update chain transaction atomically
  const updated = await ChainTransactionModel.findOneAndUpdate(
    { _id: paymentId, creditStatus: 'pending_approval' },
    {
      $set: {
        creditStatus: 'credited',
        spinsCredited,
        creditedByAdmin: adminUsername,
        adminNote: note || null,
      },
    },
    { new: true }
  )

  if (!updated) {
    return NextResponse.json(
      { success: false, error: 'Payment was already processed' },
      { status: 409 }
    )
  }

  // Credit spins to user
  const updatedUser = await UserModel.findOneAndUpdate(
    { wallet: chainTx.claimedBy },
    { $inc: { purchasedSpins: spinsCredited } },
    { new: true }
  )

  if (!updatedUser) {
    // Rollback
    await ChainTransactionModel.findByIdAndUpdate(paymentId, {
      $set: { creditStatus: 'pending_approval', spinsCredited: 0, creditedByAdmin: null, adminNote: null },
    })
    return NextResponse.json(
      { success: false, error: 'User not found. Payment rolled back.' },
      { status: 404 }
    )
  }

  // Create audit log
  await AdminLogModel.create({
    action: 'approve_payment',
    adminUsername,
    targetType: 'payment',
    targetId: paymentId,
    before: { creditStatus: 'pending_approval', spinsCredited: 0 },
    after: { creditStatus: 'credited', spinsCredited, wallet: chainTx.claimedBy },
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  })

  return NextResponse.json({
    success: true,
    data: {
      paymentId,
      spinsCredited,
      wallet: chainTx.claimedBy,
      amountSUI: chainTx.amountSUI,
    },
  })
}

// ----------------------------------------
// Reject Handler
// ----------------------------------------

async function handleReject(request: NextRequest, adminUsername: string) {
  const { data, error } = await validateBody(request, rejectSchema)
  if (error) return error

  const { paymentId, reason } = data

  // Find and update atomically
  const updated = await ChainTransactionModel.findOneAndUpdate(
    { _id: paymentId, creditStatus: 'pending_approval' },
    {
      $set: {
        creditStatus: 'rejected',
        adminNote: reason || null,
      },
    },
    { new: true }
  )

  if (!updated) {
    return NextResponse.json(
      { success: false, error: 'Payment not found or not pending approval' },
      { status: 404 }
    )
  }

  // Create audit log
  await AdminLogModel.create({
    action: 'reject_payment',
    adminUsername,
    targetType: 'payment',
    targetId: paymentId,
    before: { creditStatus: 'pending_approval' },
    after: { creditStatus: 'rejected', reason: reason || null },
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  })

  return NextResponse.json({
    success: true,
    data: {
      paymentId,
      status: 'rejected',
    },
  })
}
