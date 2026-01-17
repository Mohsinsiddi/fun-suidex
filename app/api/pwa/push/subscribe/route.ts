// ============================================
// PWA Push Subscribe API
// ============================================
// POST /api/pwa/push/subscribe - Subscribe to push notifications
// DELETE /api/pwa/push/subscribe - Unsubscribe from push notifications

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyPWAAccessToken } from '@/lib/auth/jwt'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { errors, success } from '@/lib/utils/apiResponse'
import { z } from 'zod'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
})

// Helper to get and verify PWA token from Bearer header
async function getPWAPayload(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7)
  return verifyPWAAccessToken(token)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimit = checkRateLimit(request, 'auth')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Verify PWA token
    const payload = await getPWAPayload(request)
    if (!payload) {
      return errors.unauthorized('Invalid or expired token')
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return errors.badRequest('Invalid subscription data')
    }

    const { subscription } = parsed.data

    await connectDB()

    // Find user and update push subscription
    const user = await UserModel.findOneAndUpdate(
      {
        wallet: payload.wallet.toLowerCase(),
        pwaWallet: payload.pwaWallet.toLowerCase(),
      },
      {
        $set: {
          pwaPushSubscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
        },
      },
      { new: true }
    )

    if (!user) {
      return errors.unauthorized('PWA wallet not linked')
    }

    return success({
      subscribed: true,
      wallet: user.wallet,
    })
  } catch (error) {
    console.error('PWA push subscribe error:', error)
    return errors.internal('Failed to subscribe to push notifications')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify PWA token
    const payload = await getPWAPayload(request)
    if (!payload) {
      return errors.unauthorized('Invalid or expired token')
    }

    await connectDB()

    // Find user and remove push subscription
    const user = await UserModel.findOneAndUpdate(
      {
        wallet: payload.wallet.toLowerCase(),
        pwaWallet: payload.pwaWallet.toLowerCase(),
      },
      {
        $set: { pwaPushSubscription: null },
      },
      { new: true }
    )

    if (!user) {
      return errors.unauthorized('PWA wallet not linked')
    }

    return success({
      subscribed: false,
      wallet: user.wallet,
    })
  } catch (error) {
    console.error('PWA push unsubscribe error:', error)
    return errors.internal('Failed to unsubscribe from push notifications')
  }
}
