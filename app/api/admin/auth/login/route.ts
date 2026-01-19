// ============================================
// Admin Login API
// ============================================
// POST /api/admin/auth/login

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel } from '@/lib/db/models'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { createAdminToken } from '@/lib/auth/jwt'
import { generateAdminSessionId } from '@/lib/utils/nanoid'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { ERRORS } from '@/constants'

// Dummy hash for timing attack prevention - computed once at startup
// This ensures consistent timing whether user exists or not
// Bcrypt hash format: $2b$[cost]$[22 char salt][31 char hash]
const DUMMY_HASH = '$2b$12$dummysaltvalue1234567890uDummyHashValue1234567890abcdef'

export async function POST(request: NextRequest) {
  try {
    // Rate limit admin login attempts - 5 per minute per IP
    const rateLimit = checkRateLimit(request, 'adminLogin')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          }
        }
      )
    }

    const body = await request.json()
    const { username, password } = body

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find admin
    const admin = await AdminModel.findOne({
      username: username.toLowerCase().trim(),
    })

    // SECURITY: Always perform password verification to prevent timing attacks
    // This ensures consistent response time whether user exists or not
    const hashToVerify = admin?.passwordHash || DUMMY_HASH
    const isValid = await verifyPassword(password, hashToVerify)

    // Check both conditions: admin must exist AND password must be valid
    if (!admin || !isValid) {
      return NextResponse.json(
        { success: false, error: ERRORS.INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    // Create session
    const sessionId = generateAdminSessionId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Add session to admin (limit to 5 sessions)
    admin.sessions = [
      {
        sessionId,
        createdAt: new Date(),
        expiresAt,
        ip,
        userAgent,
      },
      ...admin.sessions.slice(0, 4), // Keep only 4 previous sessions
    ]
    admin.lastLoginAt = new Date()
    await admin.save()

    // Create JWT token
    const token = await createAdminToken(admin.username, admin.role, sessionId)

    // Set HTTP-only cookies
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })
    // Also set admin_session for middleware check
    cookieStore.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return NextResponse.json({
      success: true,
      data: {
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
