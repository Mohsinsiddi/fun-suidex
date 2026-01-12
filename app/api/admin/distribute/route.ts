// Admin Distribute API
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, AdminModel, AdminLogModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

// GET - Get pending prizes
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    
    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })

    await connectDB()

    const pendingPrizes = await SpinModel.find({
      status: 'pending',
      prizeType: { $ne: 'no_prize' },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, data: pendingPrizes })
  } catch (error) {
    console.error('Admin distribute GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get pending prizes' }, { status: 500 })
  }
}

// POST - Mark prize as distributed
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
    if (!admin?.permissions?.canDistributePrizes && admin?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { spinId, txHash } = body

    if (!spinId || !txHash) {
      return NextResponse.json({ success: false, error: 'Missing spinId or txHash' }, { status: 400 })
    }

    const spin = await SpinModel.findById(spinId)
    if (!spin) {
      return NextResponse.json({ success: false, error: 'Spin not found' }, { status: 404 })
    }

    if (spin.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Spin already processed' }, { status: 400 })
    }

    // Update spin
    spin.status = 'distributed'
    spin.distributedAt = new Date()
    spin.distributedBy = payload.username
    spin.distributionTxHash = txHash
    await spin.save()

    // Log
    await AdminLogModel.create({
      action: 'distribute_prize',
      adminUsername: payload.username,
      targetType: 'spin',
      targetId: spinId,
      after: { txHash, wallet: spin.wallet, amount: spin.prizeAmount },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({ success: true, message: 'Prize marked as distributed' })
  } catch (error) {
    console.error('Admin distribute POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to distribute prize' }, { status: 500 })
  }
}
