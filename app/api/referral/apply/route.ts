// ============================================
// Referral Apply API
// ============================================
// POST /api/referral/apply - Link a referrer to user

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { checkAndAwardBadges } from '@/lib/badges'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { validateBody, referralApplySchema } from '@/lib/validations'
import { errors, success } from '@/lib/utils/apiResponse'

export const POST = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    // Rate limit check
    const rateLimit = checkRateLimit(request, 'default')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Validate request body
    const { data, error } = await validateBody(request, referralApplySchema)
    if (error) return error

    const { referrerWallet } = data

    // Cannot refer yourself
    if (referrerWallet.toLowerCase() === wallet.toLowerCase()) {
      return errors.badRequest('Cannot refer yourself')
    }

    await connectDB()

    const user = await UserModel.findOne({ wallet })
    if (user?.referredBy) {
      return errors.conflict('Already referred by another user')
    }

    const referrer = await UserModel.findOne({
      wallet: referrerWallet.toLowerCase(),
      hasCompletedFirstSpin: true,
    })
    if (!referrer) {
      return errors.badRequest('Invalid referrer. Referrer must have completed at least one spin.')
    }

    // Create referral link
    await ReferralModel.create({
      referrerWallet: referrerWallet.toLowerCase(),
      referredWallet: wallet,
    })
    await UserModel.updateOne({ wallet }, { $set: { referredBy: referrerWallet.toLowerCase() } })
    await UserModel.updateOne(
      { wallet: referrerWallet.toLowerCase() },
      { $inc: { totalReferred: 1 } }
    )

    // Check referral badges for the referrer (non-blocking)
    checkAndAwardBadges(referrerWallet.toLowerCase()).catch((err) =>
      console.error('Badge check error:', err)
    )

    return success({ message: 'Referral linked successfully' })
  } catch (error) {
    console.error('Apply referral error:', error)
    return errors.internal()
  }
})
