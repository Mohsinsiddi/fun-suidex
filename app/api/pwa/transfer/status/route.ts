// ============================================
// PWA Transfer Status API
// ============================================
// GET /api/pwa/transfer/status - Check transfer token status without consuming it
// REQUIRES AUTHENTICATION

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { TransferToken } from '@/lib/db/models/TransferToken'
import { success, errors } from '@/lib/utils/apiResponse'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'

interface TransferTokenDoc {
  _id: string
  token: string
  status: 'active' | 'used' | 'expired'
  expiresAt: Date
  usedAt?: Date
  mainWallet: string
  pwaWallet: string
}

export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext): Promise<NextResponse> => {
  try {
    await connectDB()

    // Find the most recent token for this wallet
    const token = await TransferToken.findOne({
      mainWallet: wallet.toLowerCase(),
    }).sort({ createdAt: -1 }).lean() as TransferTokenDoc | null

    if (!token) {
      return success({
        hasActiveToken: false,
        status: 'none' as const,
      })
    }

    const now = new Date()
    const expiresAt = new Date(token.expiresAt)

    // Check if token is expired (but status wasn't updated yet)
    if (token.status === 'active' && expiresAt < now) {
      // Update status to expired in background
      TransferToken.updateOne(
        { _id: token._id, status: 'active' },
        { $set: { status: 'expired' } }
      ).exec()

      return success({
        hasActiveToken: false,
        status: 'expired' as const,
        expiresAt: expiresAt.toISOString(),
      })
    }

    if (token.status === 'used') {
      return success({
        hasActiveToken: false,
        status: 'used' as const,
        usedAt: token.usedAt?.toISOString(),
      })
    }

    if (token.status === 'expired') {
      return success({
        hasActiveToken: false,
        status: 'expired' as const,
        expiresAt: expiresAt.toISOString(),
      })
    }

    // Token is active
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))

    return success({
      hasActiveToken: true,
      token: token.token,
      status: 'active' as const,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
    })
  } catch (error) {
    console.error('PWA transfer status error:', error)
    return errors.internal('Failed to check transfer status')
  }
})
