// ============================================
// Auth Me API - Get Current User
// ============================================
// GET /api/auth/me - Get authenticated user info
// Supports optional includes: ?include=profile,badges

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserBadgeModel, UserProfileModel, AdminConfigModel, BadgeModel } from '@/lib/db/models'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { success, errors } from '@/lib/utils/apiResponse'

export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    await connectDB()

    // Parse query params for optional includes
    const url = new URL(request.url)
    const includeParam = url.searchParams.get('include') || ''
    const includes = new Set(includeParam.split(',').map((s) => s.trim().toLowerCase()))

    const includeProfile = includes.has('profile') || includes.has('all')
    const includeBadges = includes.has('badges') || includes.has('all')

    // Base queries - always fetch
    const queries: Promise<any>[] = [
      UserModel.findOne({ wallet }).lean(),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ]

    // Optional profile query
    if (includeProfile) {
      queries.push(UserProfileModel.findOne({ wallet }).lean())
    }

    // Optional badges queries
    if (includeBadges) {
      queries.push(
        UserBadgeModel.find({ wallet })
          .sort({ unlockedAt: -1 })
          .limit(20)
          .lean()
      )
      queries.push(UserBadgeModel.countDocuments({ wallet }))
    }

    const results = await Promise.all(queries)

    const user = results[0]
    const config = results[1]

    if (!user) {
      return errors.unauthorized()
    }

    // Check profile eligibility
    const profileMinSpins = config?.profileShareMinSpins || 10
    const profileEligible =
      user.totalSpins >= profileMinSpins && config?.profileSharingEnabled !== false

    // Build response
    const responseData: any = {
      wallet: user.wallet,
      freeSpins: 0,
      purchasedSpins: user.purchasedSpins,
      bonusSpins: user.bonusSpins,
      totalSpins: user.totalSpins,
      totalWinsUSD: user.totalWinsUSD,
      biggestWinUSD: user.biggestWinUSD,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      hasCompletedFirstSpin: user.hasCompletedFirstSpin,
      totalReferred: user.totalReferred || 0,
      // Streak
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      // Profile basic
      profileSlug: user.profileSlug || null,
      isProfilePublic: user.isProfilePublic || false,
      profileEligible,
      profileMinSpins,
      // Timestamps
      memberSince: user.createdAt,
      lastActiveAt: user.lastActiveAt,
    }

    // Add full profile if requested
    if (includeProfile) {
      const profile = results[2]
      responseData.profile = profile
        ? {
            slug: profile.slug,
            isPublic: profile.isPublic,
            displayName: profile.displayName,
            bio: profile.bio,
            featuredBadges: profile.featuredBadges || [],
            stats: profile.stats,
            unlockedAt: profile.unlockedAt,
          }
        : null
    }

    // Add badges if requested
    if (includeBadges) {
      const userBadges = results[includeProfile ? 3 : 2] || []
      const badgeCount = results[includeProfile ? 4 : 3] || 0

      // Get badge details for earned badges
      const badgeIds = userBadges.map((ub: any) => ub.badgeId)
      const badgeDetails = await BadgeModel.find({ _id: { $in: badgeIds } }).lean()
      const badgeMap = new Map(badgeDetails.map((b: any) => [b._id, b]))

      // Map badges with details
      const earnedBadges = userBadges.map((ub: any) => {
        const badge = badgeMap.get(ub.badgeId)
        return {
          ...ub,
          badge: badge || null,
        }
      })

      // Count badges by tier
      const badgesByTier: Record<string, number> = {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        diamond: 0,
      }
      for (const eb of earnedBadges) {
        if (eb.badge?.tier) {
          badgesByTier[eb.badge.tier] = (badgesByTier[eb.badge.tier] || 0) + 1
        }
      }

      responseData.badges = {
        earned: earnedBadges,
        stats: {
          totalBadges: badgeCount,
          badgesByTier,
        },
      }
    } else {
      // Just include badge count for basic request
      const badgeCount = await UserBadgeModel.countDocuments({ wallet })
      responseData.badgeCount = badgeCount
    }

    return success(responseData)
  } catch (error) {
    console.error('Auth me error:', error)
    return errors.internal()
  }
})
