// ============================================
// Profile API
// ============================================
// GET /api/profile - Get own profile
// PUT /api/profile - Create or update profile

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserProfileModel, AdminConfigModel } from '@/lib/db/models'
import { nanoid } from '@/lib/utils/nanoid'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { validateBody, profileUpdateSchema } from '@/lib/validations'
import { errors, success } from '@/lib/utils/apiResponse'

// GET /api/profile - Get own profile
export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    await connectDB()

    const [user, profile, config] = await Promise.all([
      UserModel.findOne({ wallet }).lean(),
      UserProfileModel.findOne({ wallet }).lean(),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ])

    if (!user) {
      return errors.notFound('User')
    }

    const minSpins = config?.profileShareMinSpins || 10
    const isEligible = user.totalSpins >= minSpins
    const isEnabled = config?.profileSharingEnabled !== false

    return success({
      isEligible,
      isEnabled,
      minSpins,
      currentSpins: user.totalSpins,
      profile: profile || null,
    })
  } catch (error) {
    console.error('Profile GET error:', error)
    return errors.internal()
  }
})

// PUT /api/profile - Create or update profile
export const PUT = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    // Rate limit check
    const rateLimit = checkRateLimit(request, 'default')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Validate request body
    const { data, error } = await validateBody(request, profileUpdateSchema)
    if (error) return error

    const { isPublic, displayName, bio, featuredBadges } = data

    await connectDB()

    const [user, config] = await Promise.all([
      UserModel.findOne({ wallet }).lean(),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ])

    if (!user) {
      return errors.notFound('User')
    }

    const minSpins = config?.profileShareMinSpins || 10
    if (user.totalSpins < minSpins) {
      return errors.notEligible(`Complete ${minSpins} spins to unlock profile`)
    }

    if (!config?.profileSharingEnabled) {
      return errors.featureDisabled('Profile sharing')
    }

    // Find or create profile
    let profile = await UserProfileModel.findOne({ wallet })

    if (!profile) {
      // Generate unique slug
      const slug = nanoid(8).toLowerCase()

      profile = await UserProfileModel.create({
        wallet,
        slug,
        isPublic: isPublic === true,
        displayName,
        bio,
        featuredBadges: featuredBadges || [],
        stats: {
          totalSpins: user.totalSpins,
          totalWinsUSD: user.totalWinsUSD,
          biggestWinUSD: user.biggestWinUSD,
          totalReferred: user.totalReferred,
          currentStreak: user.currentStreak || 0,
          longestStreak: user.longestStreak || 0,
          memberSince: user.createdAt,
          lastActive: user.lastActiveAt,
        },
        unlockedAt: new Date(),
      })

      // Update user with profile slug
      await UserModel.updateOne(
        { wallet },
        {
          $set: {
            profileSlug: slug,
            isProfilePublic: isPublic === true,
            profileUnlockedAt: new Date(),
          },
        }
      )
    } else {
      // Update existing profile
      profile.isPublic = isPublic === true
      if (displayName !== undefined) profile.displayName = displayName
      if (bio !== undefined) profile.bio = bio
      if (featuredBadges !== undefined) profile.featuredBadges = featuredBadges

      // Update stats
      profile.stats = {
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        biggestWinUSD: user.biggestWinUSD,
        totalReferred: user.totalReferred,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        memberSince: user.createdAt,
        lastActive: user.lastActiveAt,
      }

      await profile.save()

      await UserModel.updateOne({ wallet }, { $set: { isProfilePublic: isPublic === true } })
    }

    return success({
      profile: profile.toObject(),
      shareUrl: profile.isPublic ? `/u/${profile.slug}` : null,
    })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return errors.internal()
  }
})
