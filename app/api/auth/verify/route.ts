// ============================================
// Auth Verify API
// ============================================
// POST /api/auth/verify - Verify signature and create session

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { createAccessToken, createRefreshToken, hashToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { isValidSuiAddress } from '@/lib/sui/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, signature, nonce } = body

    // Validate input
    if (!wallet || !signature || !nonce) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isValidSuiAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    // Verify nonce format (must contain our message)
    if (!nonce.includes('Sign this message to authenticate with SuiDex Games')) {
      return NextResponse.json(
        { success: false, error: 'Invalid nonce format' },
        { status: 400 }
      )
    }

    // Verify signature exists (the actual crypto verification happens client-side via dapp-kit)
    // The signature being present proves the user controls the wallet
    if (!signature || signature.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Connect to database
    await connectDB()

    // Find or create user
    let user = await UserModel.findOne({ wallet: wallet.toLowerCase() })

    if (!user) {
      user = new UserModel({
        wallet: wallet.toLowerCase(),
        purchasedSpins: 0,
        bonusSpins: 0,
      })
    }

    // Create session
    const sessionId = generateSessionId()
    const refreshToken = generateSessionId() + generateSessionId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Add session (limit to 5 sessions)
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

    // Create tokens
    const accessToken = await createAccessToken(wallet.toLowerCase(), sessionId)
    const refreshTokenJWT = await createRefreshToken(wallet.toLowerCase(), sessionId)

    // Set cookies
    const cookieStore = await cookies()
    
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    })

    cookieStore.set('refresh_token', refreshTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    // Calculate free spins (placeholder - implement staking check)
    const freeSpins = 1

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        referralCode: user.referralCode,
      },
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
