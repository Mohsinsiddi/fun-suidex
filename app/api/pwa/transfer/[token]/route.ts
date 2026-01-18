// ============================================
// PWA Transfer API - Retrieve Transfer Data
// ============================================
// GET /api/pwa/transfer/[token] - Get and consume transfer token
// Rate limited to prevent brute-force attacks

import { NextRequest } from 'next/server'
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

    // Find and delete the token (one-time use)
    const transfer = await TransferToken.findOneAndDelete({
      token: token.toUpperCase(),
    })

    if (!transfer) {
      return errors.notFound('Transfer token not found or expired')
    }

    return success({
      encryptedData: transfer.encryptedData,
      pwaWallet: transfer.pwaWallet,
      mainWallet: transfer.mainWallet,
    })
  } catch (error) {
    console.error('PWA transfer retrieve error:', error)
    return errors.internal('Failed to retrieve transfer data')
  }
}
