// ============================================
// Auth Verify API
// ============================================
// POST /api/auth/verify - Verify wallet signature and create session

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPersonalMessageSignature } from '@mysten/sui/verify'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { createAccessToken, createRefreshToken, hashToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { validateBody, authVerifySchema } from '@/lib/validations'
import { errors, success } from '@/lib/utils/apiResponse'
import { validateAndConsumeNonce } from '@/lib/auth/nonceStore'

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (IP-based for unauthenticated endpoint)
    const rateLimit = checkRateLimit(request, 'auth')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Validate request body
    const { data, error } = await validateBody(request, authVerifySchema)
    if (error) return error

    const { wallet, signature, nonce, referrer } = data

    // Validate nonce format
    if (!nonce.includes('Sign this message to authenticate with SuiDex Games')) {
      return errors.badRequest('Invalid nonce format')
    }

    // Validate and consume nonce (one-time use, prevents replay attacks)
    const nonceResult = validateAndConsumeNonce(wallet, nonce)
    if (!nonceResult.valid) {
      return errors.badRequest(nonceResult.reason)
    }

    // Cryptographically verify the signature
    try {
      const messageBytes = new TextEncoder().encode(nonce)
      const publicKey = await verifyPersonalMessageSignature(messageBytes, signature)
      const signerAddress = publicKey.toSuiAddress().toLowerCase()

      if (signerAddress !== wallet.toLowerCase()) {
        return errors.unauthorized('Signature does not match wallet address')
      }
    } catch (sigError) {
      console.error('Signature verification failed:', sigError)
      return errors.unauthorized('Invalid signature')
    }

    await connectDB()

    let user = await UserModel.findOne({ wallet: wallet.toLowerCase() })

    if (!user) {
      user = new UserModel({ wallet: wallet.toLowerCase(), purchasedSpins: 0, bonusSpins: 0 })
    }

    // Link referral for new users or users without referrer
    if (referrer && !user.referredBy && referrer.toLowerCase() !== wallet.toLowerCase()) {
      const referrerUser = await UserModel.findOne({
        wallet: referrer.toLowerCase(),
        hasCompletedFirstSpin: true,
      })
      if (referrerUser) {
        const existingRef = await ReferralModel.findOne({ referredWallet: wallet.toLowerCase() })
        if (!existingRef) {
          user.referredBy = referrer.toLowerCase()
          await ReferralModel.create({
            referrerWallet: referrer.toLowerCase(),
            referredWallet: wallet.toLowerCase(),
            linkedAt: new Date(),
          })
          await UserModel.updateOne(
            { wallet: referrer.toLowerCase() },
            { $inc: { totalReferred: 1 } }
          )
        }
      }
    }

    const sessionId = generateSessionId()
    const refreshToken = generateSessionId() + generateSessionId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    user.sessions = [
      {
        sessionId,
        refreshToken: hashToken(refreshToken),
        createdAt: new Date(),
        expiresAt,
        userAgent,
        ip,
        isActive: true,
      },
      ...user.sessions.filter((s: any) => s.isActive).slice(0, 4),
    ]
    user.lastActiveAt = new Date()
    await user.save()

    const accessToken = await createAccessToken(wallet.toLowerCase(), sessionId)
    const refreshTokenJWT = await createRefreshToken(wallet.toLowerCase(), sessionId)

    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    cookieStore.set('refresh_token', refreshTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return success({
      wallet: user.wallet,
      freeSpins: 0,
      purchasedSpins: user.purchasedSpins,
      bonusSpins: user.bonusSpins,
      referralCode: user.referralCode,
      hasCompletedFirstSpin: user.hasCompletedFirstSpin,
      referredBy: user.referredBy,
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return errors.internal('Authentication failed')
  }
}
