// ============================================
// Auth Wrapper for API Routes
// ============================================
// Eliminates duplicate auth boilerplate across APIs

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken, verifyAdminToken } from '@/lib/auth/jwt'
import { ERRORS } from '@/constants'

// Types for authenticated handlers
export interface AuthContext {
  wallet: string
  userId: string
}

export interface AdminAuthContext {
  sessionId: string
  username: string
  role: 'super_admin' | 'admin'
}

type AuthenticatedHandler<T = AuthContext> = (
  request: NextRequest,
  context: T
) => Promise<NextResponse>

// Standard error responses
const unauthorizedResponse = () =>
  NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

const sessionExpiredResponse = () =>
  NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })

const serverErrorResponse = (message = ERRORS.INTERNAL_ERROR) =>
  NextResponse.json({ success: false, error: message }, { status: 500 })

/**
 * Wrap an API handler with user authentication
 * Automatically handles token verification and DB connection
 * Supports both cookie-based auth (web) and Bearer token auth (PWA)
 *
 * Usage:
 * export const GET = withAuth(async (request, { wallet }) => {
 *   // wallet is guaranteed to be valid here
 *   return NextResponse.json({ success: true, data: { wallet } })
 * })
 */
export function withAuth(handler: AuthenticatedHandler<AuthContext>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Try cookie first (web app)
      const cookieStore = await cookies()
      let token = cookieStore.get('access_token')?.value

      // Try Bearer token if no cookie (PWA)
      if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7)
        }
      }

      if (!token) {
        return unauthorizedResponse()
      }

      const payload = await verifyAccessToken(token)
      if (!payload) {
        return sessionExpiredResponse()
      }

      await connectDB()

      // Verify user exists
      const user = await UserModel.findOne({ wallet: payload.wallet }).select('_id wallet').lean()
      if (!user) {
        return unauthorizedResponse()
      }

      return handler(request, {
        wallet: payload.wallet,
        userId: String(user._id),
      })
    } catch (error) {
      console.error('Auth wrapper error:', error)
      return serverErrorResponse()
    }
  }
}

/**
 * Wrap an API handler with admin authentication
 *
 * Usage:
 * export const GET = withAdminAuth(async (request, { username, role }) => {
 *   if (role !== 'super_admin') {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 *   }
 *   return NextResponse.json({ success: true })
 * })
 */
export function withAdminAuth(handler: AuthenticatedHandler<AdminAuthContext>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('admin_token')?.value

      if (!token) {
        return unauthorizedResponse()
      }

      const payload = await verifyAdminToken(token)
      if (!payload) {
        return sessionExpiredResponse()
      }

      await connectDB()

      return handler(request, {
        sessionId: payload.sessionId,
        username: payload.username,
        role: payload.role,
      })
    } catch (error) {
      console.error('Admin auth wrapper error:', error)
      return serverErrorResponse()
    }
  }
}

/**
 * Optional auth - doesn't fail if not authenticated
 * Useful for public endpoints that behave differently when logged in
 * Supports both cookie-based auth (web) and Bearer token auth (PWA)
 *
 * Usage:
 * export const GET = withOptionalAuth(async (request, context) => {
 *   if (context) {
 *     // User is logged in
 *     return NextResponse.json({ wallet: context.wallet })
 *   }
 *   // Public response
 *   return NextResponse.json({ public: true })
 * })
 */
export function withOptionalAuth(handler: AuthenticatedHandler<AuthContext | null>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Try cookie first (web app)
      const cookieStore = await cookies()
      let token = cookieStore.get('access_token')?.value

      // Try Bearer token if no cookie (PWA)
      if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7)
        }
      }

      let context: AuthContext | null = null

      if (token) {
        const payload = await verifyAccessToken(token)
        if (payload) {
          await connectDB()
          const user = await UserModel.findOne({ wallet: payload.wallet }).select('_id wallet').lean()
          if (user) {
            context = {
              wallet: payload.wallet,
              userId: String(user._id),
            }
          }
        }
      }

      return handler(request, context)
    } catch (error) {
      console.error('Optional auth wrapper error:', error)
      return serverErrorResponse()
    }
  }
}
