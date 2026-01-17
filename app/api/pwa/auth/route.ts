// ============================================
// PWA Auth API
// ============================================
// POST /api/pwa/auth - Authenticate with PWA wallet signature

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { createPWAAccessToken, createPWARefreshToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { errors, success } from '@/lib/utils/apiResponse'
import {
  verifyPWASignature,
  createPWAAuthMessage,
  isTimestampValid,
} from '@/lib/pwa/auth'
import { z } from 'zod'

const authSchema = z.object({
  pwaWallet: z.string().min(1),
  signature: z.string().min(1),
  timestamp: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimit = checkRateLimit(request, 'auth')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = authSchema.safeParse(body)
    if (!parsed.success) {
      return errors.badRequest('Invalid request body')
    }

    const { pwaWallet, signature, timestamp } = parsed.data

    // Validate timestamp (prevent replay attacks)
    if (!isTimestampValid(timestamp)) {
      return errors.badRequest('Timestamp expired. Please try again.')
    }

    await connectDB()

    // Find user by PWA wallet
    const user = await UserModel.findOne({ pwaWallet: pwaWallet.toLowerCase() })
    if (!user) {
      return errors.notFound('PWA wallet not linked to any account')
    }

    // Verify signature
    const message = createPWAAuthMessage(pwaWallet, timestamp)
    const isValid = await verifyPWASignature(pwaWallet, signature, message)
    if (!isValid) {
      return errors.unauthorized('Invalid signature')
    }

    // Update last active
    user.lastActiveAt = new Date()
    await user.save()

    // Create new tokens
    const sessionId = generateSessionId()
    const accessToken = await createPWAAccessToken(
      user.wallet,
      pwaWallet.toLowerCase(),
      sessionId
    )
    const refreshToken = await createPWARefreshToken(
      user.wallet,
      pwaWallet.toLowerCase(),
      sessionId
    )

    return success({
      accessToken,
      refreshToken,
      wallet: user.wallet,
      pwaWallet: user.pwaWallet,
      user: {
        wallet: user.wallet,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        totalSpins: user.totalSpins,
        referralCode: user.referralCode,
        totalWinsUSD: user.totalWinsUSD,
      },
    })
  } catch (error) {
    console.error('PWA auth error:', error)
    return errors.internal('Authentication failed')
  }
}
