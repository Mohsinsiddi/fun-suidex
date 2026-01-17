// ============================================
// PWA Unlink API - Remove PWA wallet from account
// ============================================
// POST /api/pwa/unlink - Unlink PWA wallet from user account

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { UserModel } from '@/lib/db/models'
import { success, errors } from '@/lib/utils/apiResponse'

export const POST = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    // Find user and remove PWA data
    const user = await UserModel.findOneAndUpdate(
      { wallet: wallet.toLowerCase() },
      {
        $unset: {
          pwaWallet: 1,
          pwaLinkedAt: 1,
          pwaPushSubscription: 1,
        },
      },
      { new: true }
    )

    if (!user) {
      return errors.notFound('User not found')
    }

    return success({
      message: 'PWA unlinked successfully',
      wallet: wallet,
    })
  } catch (error) {
    console.error('PWA unlink error:', error)
    return errors.internal('Failed to unlink PWA')
  }
})
