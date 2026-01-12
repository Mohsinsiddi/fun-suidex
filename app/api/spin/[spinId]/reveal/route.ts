// ============================================
// Spin Reveal API
// ============================================
// GET /api/spin/[spinId]/reveal - Get prize details

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ERRORS } from '@/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spinId: string }> }
) {
  try {
    const { spinId } = await params

    // Verify user session
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    await connectDB()

    // Find spin
    const spin = await SpinModel.findById(spinId)

    if (!spin) {
      return NextResponse.json(
        { success: false, error: ERRORS.SPIN_NOT_FOUND },
        { status: 404 }
      )
    }

    // Verify spin belongs to user
    if (spin.wallet.toLowerCase() !== payload.wallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 403 }
      )
    }

    // Return full prize details
    return NextResponse.json({
      success: true,
      data: {
        spinId: spin._id.toString(),
        slotIndex: spin.slotIndex,
        prizeType: spin.prizeType,
        prizeAmount: spin.prizeAmount,
        prizeValueUSD: spin.prizeValueUSD,
        lockDuration: spin.lockDuration,
        status: spin.status,
        createdAt: spin.createdAt,
      },
    })
  } catch (error) {
    console.error('Spin reveal error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
