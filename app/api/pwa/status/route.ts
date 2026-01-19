// ============================================
// PWA Status API
// ============================================
// GET /api/pwa/status - Check if user has PWA enabled

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { UserModel } from '@/lib/db/models'
import { errors, success } from '@/lib/utils/apiResponse'
import { PWA_UNLOCK_MIN_SPINS } from '@/lib/pwa/auth'

export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    const user = await UserModel.findOne({ wallet: wallet.toLowerCase() })
      .select('pwaWallet pwaLinkedAt totalSpins pwaPushSubscription')
      .lean()

    if (!user) {
      return errors.notFound('User')
    }

    const isEligible = user.totalSpins >= PWA_UNLOCK_MIN_SPINS
    const isEnabled = !!user.pwaWallet
    const hasPushEnabled = !!user.pwaPushSubscription?.endpoint

    return success({
      isEnabled,
      isEligible,
      pwaWallet: user.pwaWallet || null,
      linkedAt: user.pwaLinkedAt || null,
      hasPushEnabled,
      requirements: {
        minSpins: PWA_UNLOCK_MIN_SPINS,
        currentSpins: user.totalSpins,
        spinsRemaining: Math.max(0, PWA_UNLOCK_MIN_SPINS - user.totalSpins),
      },
    })
  } catch (error) {
    console.error('PWA status error:', error)
    return errors.internal('Failed to get PWA status')
  }
})
