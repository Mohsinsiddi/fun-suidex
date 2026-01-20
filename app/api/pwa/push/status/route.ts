// ============================================
// PWA Push Status API
// ============================================
// GET /api/pwa/push/status - Check if push notifications are enabled

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyPWAAccessToken } from '@/lib/auth/jwt'
import { errors, success } from '@/lib/utils/apiResponse'

export async function GET(request: NextRequest) {
  try {
    // Verify PWA token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errors.unauthorized('Missing token')
    }
    const token = authHeader.slice(7)
    const payload = await verifyPWAAccessToken(token)
    if (!payload) {
      return errors.unauthorized('Invalid or expired token')
    }

    await connectDB()

    // Find user and check push subscription
    const user = await UserModel.findOne({
      wallet: payload.wallet.toLowerCase(),
    })
      .select('pwaPushSubscription')
      .lean()

    if (!user) {
      return errors.notFound('User not found')
    }

    const hasSubscription = !!(user.pwaPushSubscription?.endpoint)

    return success({
      enabled: hasSubscription,
      hasSubscription,
      // Return endpoint so frontend can verify it matches browser subscription
      endpoint: user.pwaPushSubscription?.endpoint || null,
    })
  } catch (error) {
    console.error('Push status error:', error)
    return errors.internal('Failed to get push status')
  }
}
