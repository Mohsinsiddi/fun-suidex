// ============================================
// PWA Transfer API - Create Transfer Token
// ============================================
// POST /api/pwa/transfer - Create one-time transfer token for PWA wallet data
// REQUIRES AUTHENTICATION - only logged in users can create transfer tokens

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { TransferToken } from '@/lib/db/models/TransferToken'
import { UserModel } from '@/lib/db/models'
import { success, errors } from '@/lib/utils/apiResponse'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { rateLimit } from '@/lib/utils/rateLimit'
import { z } from 'zod'
import crypto from 'crypto'

// Schema for transfer data
const transferSchema = z.object({
  encryptedData: z.object({
    ciphertext: z.string(),
    salt: z.string(),
    iv: z.string(),
  }),
  pwaWallet: z.string(),
  mainWallet: z.string(),
})

// Minimum spins required to unlock PWA
const MIN_SPINS_FOR_PWA = 25

export const POST = withAuth(async (request: NextRequest, { wallet }: AuthContext): Promise<NextResponse> => {
  try {
    // Rate limit - 5 per minute (creating transfer tokens is sensitive)
    if (!rateLimit(request, 'transfer', wallet)) {
      return errors.rateLimited(60)
    }

    const body = await request.json()
    const parsed = transferSchema.safeParse(body)

    if (!parsed.success) {
      return errors.badRequest('Invalid transfer data')
    }

    const { encryptedData, pwaWallet, mainWallet } = parsed.data

    // Verify the authenticated user matches the mainWallet in the request
    if (wallet.toLowerCase() !== mainWallet.toLowerCase()) {
      return errors.forbidden('Wallet mismatch')
    }

    await connectDB()

    // Verify user has enough spins to unlock PWA
    const user = await UserModel.findOne({ wallet: wallet.toLowerCase() }).select('totalSpins').lean()
    if (!user || (user.totalSpins || 0) < MIN_SPINS_FOR_PWA) {
      return errors.forbidden(`Need ${MIN_SPINS_FOR_PWA}+ total spins to unlock PWA`)
    }

    // Generate unique 8-character token (easy to type manually if needed)
    const token = crypto.randomBytes(4).toString('hex').toUpperCase()

    // Mark any existing active tokens as expired (only allow one active transfer)
    await TransferToken.updateMany(
      { mainWallet: mainWallet.toLowerCase(), status: 'active' },
      { $set: { status: 'expired' } }
    )

    // Set expiration 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Create new transfer token
    await TransferToken.create({
      token,
      status: 'active',
      encryptedData,
      pwaWallet: pwaWallet.toLowerCase(),
      mainWallet: mainWallet.toLowerCase(),
      expiresAt,
    })

    return success({
      token,
      expiresAt: expiresAt.toISOString(),
      expiresIn: 600, // 10 minutes
      transferUrl: `/pwa/transfer/${token}`,
    })
  } catch (error) {
    console.error('PWA transfer create error:', error)
    return errors.internal('Failed to create transfer token')
  }
})
