// ============================================
// PWA Refresh Token API
// ============================================
// POST /api/pwa/refresh - Refresh PWA access token

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import {
  verifyPWARefreshToken,
  createPWAAccessToken,
  createPWARefreshToken,
} from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { errors, success } from '@/lib/utils/apiResponse'
import { z } from 'zod'

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
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
    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) {
      return errors.badRequest('Invalid request body')
    }

    const { refreshToken } = parsed.data

    // Verify the refresh token
    const payload = await verifyPWARefreshToken(refreshToken)
    if (!payload) {
      return errors.sessionExpired()
    }

    await connectDB()

    // Find user and verify PWA wallet is still linked
    const user = await UserModel.findOne({
      wallet: payload.wallet.toLowerCase(),
      pwaWallet: payload.pwaWallet.toLowerCase(),
    })

    if (!user) {
      return errors.unauthorized('PWA wallet no longer linked')
    }

    // Update last active
    user.lastActiveAt = new Date()
    await user.save()

    // Create new tokens
    const sessionId = generateSessionId()
    const newAccessToken = await createPWAAccessToken(
      payload.wallet,
      payload.pwaWallet,
      sessionId
    )
    const newRefreshToken = await createPWARefreshToken(
      payload.wallet,
      payload.pwaWallet,
      sessionId
    )

    return success({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      wallet: user.wallet,
      pwaWallet: user.pwaWallet,
    })
  } catch (error) {
    console.error('PWA refresh error:', error)
    return errors.internal('Token refresh failed')
  }
}
