// ============================================
// User Profile API
// ============================================
// GET /api/users/[identifier] - Get user profile by slug or wallet

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, SpinModel } from '@/lib/db/models'
import { errors, success } from '@/lib/utils/apiResponse'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { getUserBadgeProgress } from '@/lib/badges'

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
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('history') === 'true'
    const historyPage = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const historyLimit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

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
      .select('wallet profileSlug totalSpins totalWinsUSD biggestWinUSD longestStreak currentStreak createdAt')
      .lean()

    if (!user) {
      return errors.notFound('User')
    }

    // Get user's earned badges
    const { earned: badges } = await getUserBadgeProgress(user.wallet)

    // Get spin history if requested
    let spinHistory = null
    if (includeHistory) {
      const [spins, totalSpins] = await Promise.all([
        SpinModel.find({ wallet: user.wallet.toLowerCase() })
          .sort({ createdAt: -1 })
          .skip((historyPage - 1) * historyLimit)
          .limit(historyLimit)
          .select('prizeType prizeAmount prizeValueUSD lockDuration status createdAt')
          .lean(),
        SpinModel.countDocuments({ wallet: user.wallet.toLowerCase() }),
      ])

      spinHistory = {
        spins: spins.map((s: any) => ({
          id: String(s._id),
          prizeType: s.prizeType,
          prizeAmount: s.prizeAmount,
          prizeValueUSD: s.prizeValueUSD,
          lockDuration: s.lockDuration || null,
          status: s.status,
          createdAt: s.createdAt,
        })),
        pagination: {
          page: historyPage,
          limit: historyLimit,
          total: totalSpins,
          totalPages: Math.ceil(totalSpins / historyLimit),
        },
      }
    }

    return success({
      wallet: user.wallet,
      slug: user.profileSlug,
      totalSpins: user.totalSpins || 0,
      totalWinsUSD: user.totalWinsUSD || 0,
      biggestWinUSD: user.biggestWinUSD || 0,
      longestStreak: user.longestStreak || 0,
      currentStreak: user.currentStreak || 0,
      joinedAt: user.createdAt,
      badges: badges.map((b: any) => ({
        id: b.badgeId,
        name: b.badge?.name || b.badgeId,
        description: b.badge?.description || '',
        tier: b.badge?.tier || 'bronze',
        icon: b.badge?.icon || '🏆',
        earnedAt: b.unlockedAt,
      })),
      spinHistory,
    })
  } catch (error) {
    console.error('User profile error:', error)
    return errors.internal('Failed to get user profile')
  }
}
