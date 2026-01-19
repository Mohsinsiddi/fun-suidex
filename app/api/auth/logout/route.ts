// ============================================
// Auth Logout API
// ============================================
// POST /api/auth/logout - Clear session and cookies

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { success } from '@/lib/utils/apiResponse'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    // Try to invalidate session in database if we have a valid token
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken)
        if (payload?.wallet && payload?.sessionId) {
          await connectDB()

          // Mark the session as inactive
          await UserModel.updateOne(
            {
              wallet: payload.wallet.toLowerCase(),
              'sessions.sessionId': payload.sessionId
            },
            {
              $set: { 'sessions.$.isActive': false }
            }
          )
        }
      } catch {
        // Token might be expired or invalid - that's fine, just clear cookies
      }
    }

    // Clear cookies regardless of token validity
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')

    return success({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)

    // Still try to clear cookies even if there's an error
    try {
      const cookieStore = await cookies()
      cookieStore.delete('access_token')
      cookieStore.delete('refresh_token')
    } catch {
      // Ignore cookie errors
    }

    return success({ message: 'Logged out' })
  }
}
