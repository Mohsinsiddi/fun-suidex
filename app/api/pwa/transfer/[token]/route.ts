// ============================================
// PWA Transfer API - Retrieve Transfer Data
// ============================================
// GET /api/pwa/transfer/[token] - Get and consume transfer token

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { TransferToken } from '@/lib/db/models/TransferToken'
import { success, errors } from '@/lib/utils/apiResponse'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 8) {
      return errors.badRequest('Invalid transfer token')
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
