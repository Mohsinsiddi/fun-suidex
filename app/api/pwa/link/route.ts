// ============================================
// PWA Link API
// ============================================
// POST /api/pwa/link - Link PWA wallet to main wallet (one-time setup)

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { createPWAAccessToken, createPWARefreshToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { errors, success } from '@/lib/utils/apiResponse'
import {
  verifyDerivationSignature,
  verifyDerivedWallet,
  PWA_UNLOCK_MIN_SPINS,
} from '@/lib/pwa/auth'
import { z } from 'zod'

const linkSchema = z.object({
  mainWallet: z.string().min(1),
  pwaWallet: z.string().min(1),
  derivationSignature: z.string().min(1),
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
    const parsed = linkSchema.safeParse(body)
    if (!parsed.success) {
      return errors.badRequest('Invalid request body')
    }

    const { mainWallet, pwaWallet, derivationSignature } = parsed.data

    await connectDB()

    // Find user by main wallet
    const user = await UserModel.findOne({ wallet: mainWallet.toLowerCase() })
    if (!user) {
      return errors.notFound('User')
    }

    // Check if user already has a PWA wallet linked
    if (user.pwaWallet) {
      // If same PWA wallet, just re-issue tokens (re-linking/recovery)
      if (user.pwaWallet.toLowerCase() === pwaWallet.toLowerCase()) {
        const sessionId = generateSessionId()
        const accessToken = await createPWAAccessToken(
          mainWallet.toLowerCase(),
          pwaWallet.toLowerCase(),
          sessionId
        )
        const refreshToken = await createPWARefreshToken(
          mainWallet.toLowerCase(),
          pwaWallet.toLowerCase(),
          sessionId
        )

        return success({
          accessToken,
          refreshToken,
          wallet: user.wallet,
          pwaWallet: user.pwaWallet,
          isRelink: true,
        })
      }
      return errors.conflict('A different PWA wallet is already linked to this account')
    }

    // Check if user has enough spins to unlock PWA
    if (user.totalSpins < PWA_UNLOCK_MIN_SPINS) {
      return errors.notEligible(
        `Complete ${PWA_UNLOCK_MIN_SPINS} spins to unlock PWA. You have ${user.totalSpins} spins.`
      )
    }

    // Verify the derivation signature (proves main wallet ownership)
    const isSignatureValid = await verifyDerivationSignature(mainWallet, derivationSignature)
    if (!isSignatureValid) {
      return errors.unauthorized('Invalid derivation signature')
    }

    // Verify the PWA wallet matches the derived address
    const isWalletValid = verifyDerivedWallet(derivationSignature, pwaWallet)
    if (!isWalletValid) {
      return errors.badRequest('PWA wallet does not match derived address')
    }

    // Check if this PWA wallet is already linked to another user
    const existingPwaUser = await UserModel.findOne({ pwaWallet: pwaWallet.toLowerCase() })
    if (existingPwaUser && existingPwaUser.wallet !== mainWallet.toLowerCase()) {
      return errors.conflict('This PWA wallet is linked to another account')
    }

    // Link the PWA wallet
    user.pwaWallet = pwaWallet.toLowerCase()
    user.pwaLinkedAt = new Date()
    await user.save()

    // Create PWA tokens
    const sessionId = generateSessionId()
    const accessToken = await createPWAAccessToken(
      mainWallet.toLowerCase(),
      pwaWallet.toLowerCase(),
      sessionId
    )
    const refreshToken = await createPWARefreshToken(
      mainWallet.toLowerCase(),
      pwaWallet.toLowerCase(),
      sessionId
    )

    return success({
      accessToken,
      refreshToken,
      wallet: user.wallet,
      pwaWallet: user.pwaWallet,
      isRelink: false,
    })
  } catch (error) {
    console.error('PWA link error:', error)
    return errors.internal('Failed to link PWA wallet')
  }
}
