// ============================================
// PWA Transfer API - Retrieve Transfer Data
// ============================================
// GET /api/pwa/transfer/[token] - Get and consume transfer token
// Rate limited to prevent brute-force attacks

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { TransferToken } from '@/lib/db/models/TransferToken'
import { success, errors } from '@/lib/utils/apiResponse'
import { rateLimit } from '@/lib/utils/rateLimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Strict rate limit - 5 per minute to prevent token brute-force
    if (!rateLimit(request, 'transfer')) {
      return errors.rateLimited(60)
    }

    const { token } = await params

    if (!token || token.length !== 8) {
      return errors.badRequest('Invalid transfer token')
    }

    // Validate token format (should be uppercase hex)
    if (!/^[A-F0-9]{8}$/.test(token.toUpperCase())) {
      return errors.badRequest('Invalid transfer token format')
    }

    await connectDB()

    // Find the token first to check its status
    const existingToken = await TransferToken.findOne({
      token: token.toUpperCase(),
    })

    if (!existingToken) {
      return errors.notFound('Transfer code not found or expired')
    }

    // Check if already used - return 410 Gone
    if (existingToken.status === 'used') {
      return NextResponse.json(
        { success: false, error: 'Transfer code already used' },
        { status: 410 } // 410 Gone
      )
    }

    // Check if expired
    if (existingToken.status === 'expired' || new Date(existingToken.expiresAt) < new Date()) {
      // Update status if needed
      if (existingToken.status === 'active') {
        await TransferToken.updateOne(
          { _id: existingToken._id },
          { $set: { status: 'expired' } }
        )
      }
      return errors.badRequest('Transfer code has expired')
    }

    // Mark as used instead of deleting (keeps the encrypted data cleared for security)
    await TransferToken.updateOne(
      { _id: existingToken._id, status: 'active' },
      {
        $set: {
          status: 'used',
          usedAt: new Date(),
          // Clear encrypted data for security after use
          'encryptedData.ciphertext': '',
          'encryptedData.salt': '',
          'encryptedData.iv': '',
        }
      }
    )

    return success({
      encryptedData: existingToken.encryptedData,
      pwaWallet: existingToken.pwaWallet,
      mainWallet: existingToken.mainWallet,
    })
  } catch (error) {
    console.error('PWA transfer retrieve error:', error)
    return errors.internal('Failed to retrieve transfer data')
  }
}
