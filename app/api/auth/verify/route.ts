import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { createAccessToken, createRefreshToken, hashToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { isValidSuiAddress } from '@/lib/sui/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, signature, nonce, referrer } = body

    if (!wallet || !signature || !nonce) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    if (!isValidSuiAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }
    if (!nonce.includes('Sign this message to authenticate with SuiDex Games')) {
      return NextResponse.json({ success: false, error: 'Invalid nonce format' }, { status: 400 })
    }
    if (!signature || signature.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 })
    }

    await connectDB()

    let user = await UserModel.findOne({ wallet: wallet.toLowerCase() })
    const isNewUser = !user

    if (!user) {
      user = new UserModel({ wallet: wallet.toLowerCase(), purchasedSpins: 0, bonusSpins: 0 })
    }

    // Link referral for new users or users without referrer
    if (referrer && !user.referredBy && referrer.toLowerCase() !== wallet.toLowerCase()) {
      const referrerUser = await UserModel.findOne({ wallet: referrer.toLowerCase(), hasCompletedFirstSpin: true })
      if (referrerUser) {
        const existingRef = await ReferralModel.findOne({ referredWallet: wallet.toLowerCase() })
        if (!existingRef) {
          user.referredBy = referrer.toLowerCase()
          await ReferralModel.create({ referrerWallet: referrer.toLowerCase(), referredWallet: wallet.toLowerCase(), linkedAt: new Date() })
          await UserModel.updateOne({ wallet: referrer.toLowerCase() }, { $inc: { totalReferred: 1 } })
        }
      }
    }

    const sessionId = generateSessionId()
    const refreshToken = generateSessionId() + generateSessionId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    user.sessions = [
      { sessionId, refreshToken: hashToken(refreshToken), createdAt: new Date(), expiresAt, userAgent, ip, isActive: true },
      ...user.sessions.filter((s: any) => s.isActive).slice(0, 4),
    ]
    user.lastActiveAt = new Date()
    await user.save()

    const accessToken = await createAccessToken(wallet.toLowerCase(), sessionId)
    const refreshTokenJWT = await createRefreshToken(wallet.toLowerCase(), sessionId)

    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 })
    cookieStore.set('refresh_token', refreshTokenJWT, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt })

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins: 0,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        referralCode: user.referralCode,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        referredBy: user.referredBy,
      },
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 })
  }
}
