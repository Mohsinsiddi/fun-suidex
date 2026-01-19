// ============================================
// PWA Push Test API
// ============================================
// POST /api/pwa/push/test - Send a test push notification

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyPWAAccessToken } from '@/lib/auth/jwt'
import { errors, success } from '@/lib/utils/apiResponse'
import { sendPushNotification } from '@/lib/push/webPush'

export async function POST(request: NextRequest) {
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

    // Find user and their push subscription
    const user = await UserModel.findOne({
      wallet: payload.wallet.toLowerCase(),
    })
      .select('pwaPushSubscription')
      .lean()

    if (!user) {
      return errors.notFound('User not found')
    }

    if (!user.pwaPushSubscription?.endpoint) {
      return errors.badRequest('Push notifications not enabled. Enable them in Settings first.')
    }

    // Send test notification
    const result = await sendPushNotification(user.pwaPushSubscription, {
      title: '🔔 Test Notification',
      body: 'Push notifications are working! You\'ll receive alerts when prizes are distributed.',
      tag: 'test',
      data: {
        type: 'test',
        timestamp: Date.now(),
      },
    })

    if (!result.success) {
      if (result.error === 'subscription_expired') {
        // Clean up expired subscription
        await UserModel.updateOne(
          { wallet: payload.wallet.toLowerCase() },
          { $set: { pwaPushSubscription: null } }
        )
        return errors.badRequest('Push subscription expired. Please re-enable notifications.')
      }
      return errors.internal(`Failed to send notification: ${result.error}`)
    }

    return success({ sent: true, message: 'Test notification sent!' })
  } catch (error) {
    console.error('Push test error:', error)
    return errors.internal('Failed to send test notification')
  }
}
