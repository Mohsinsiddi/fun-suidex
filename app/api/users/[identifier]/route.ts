// ============================================
// User Profile API
// ============================================
// GET /api/users/[identifier] - Get user profile by slug or wallet

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { errors, success } from '@/lib/utils/apiResponse'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    // Rate limit
    const rateLimit = checkRateLimit(request, 'read')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    const { identifier } = await params

    if (!identifier || identifier.length < 2) {
      return errors.badRequest('Invalid identifier')
    }

    await connectDB()

    // Determine if searching by wallet or slug
    const isWallet = identifier.startsWith('0x') && identifier.length > 10

    const query = isWallet
      ? { wallet: identifier.toLowerCase(), isProfilePublic: true }
      : { profileSlug: identifier.toLowerCase(), isProfilePublic: true }

    const user = await UserModel.findOne(query)
      .select('wallet profileSlug totalSpins totalWinsUSD createdAt')
      .lean()

    if (!user) {
      return errors.notFound('User')
    }

    return success({
      wallet: user.wallet,
      slug: user.profileSlug,
      totalSpins: user.totalSpins,
      totalWinsUSD: user.totalWinsUSD,
      joinedAt: user.createdAt,
    })
  } catch (error) {
    console.error('User profile error:', error)
    return errors.internal('Failed to get user profile')
  }
}
