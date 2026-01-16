import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, UserProfileModel, AdminConfigModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { nanoid } from '@/lib/utils/nanoid'

// GET /api/profile - Get own profile
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    await connectDB()

    const [user, profile, config] = await Promise.all([
      UserModel.findOne({ wallet: payload.wallet }).lean(),
      UserProfileModel.findOne({ wallet: payload.wallet }).lean(),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const minSpins = config?.profileShareMinSpins || 10
    const isEligible = user.totalSpins >= minSpins
    const isEnabled = config?.profileSharingEnabled !== false

    return NextResponse.json({
      success: true,
      data: {
        isEligible,
        isEnabled,
        minSpins,
        currentSpins: user.totalSpins,
        profile: profile || null,
      },
    })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Create or update profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { isPublic, displayName, bio, featuredBadges } = body

    await connectDB()

    const [user, config] = await Promise.all([
      UserModel.findOne({ wallet: payload.wallet }).lean(),
      AdminConfigModel.findById('main').select('profileShareMinSpins profileSharingEnabled').lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const minSpins = config?.profileShareMinSpins || 10
    if (user.totalSpins < minSpins) {
      return NextResponse.json(
        { success: false, error: `Complete ${minSpins} spins to unlock profile` },
        { status: 403 }
      )
    }

    if (!config?.profileSharingEnabled) {
      return NextResponse.json(
        { success: false, error: 'Profile sharing is disabled' },
        { status: 403 }
      )
    }

    // Validate inputs
    const cleanDisplayName = displayName?.trim().slice(0, 50) || undefined
    const cleanBio = bio?.trim().slice(0, 160) || undefined
    const cleanFeaturedBadges = Array.isArray(featuredBadges)
      ? featuredBadges.slice(0, 5)
      : []

    // Find or create profile
    let profile = await UserProfileModel.findOne({ wallet: payload.wallet })

    if (!profile) {
      // Generate unique slug
      const slug = nanoid(8).toLowerCase()

      profile = await UserProfileModel.create({
        wallet: payload.wallet,
        slug,
        isPublic: isPublic === true,
        displayName: cleanDisplayName,
        bio: cleanBio,
        featuredBadges: cleanFeaturedBadges,
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
        { wallet: payload.wallet },
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
      if (cleanDisplayName !== undefined) profile.displayName = cleanDisplayName
      if (cleanBio !== undefined) profile.bio = cleanBio
      profile.featuredBadges = cleanFeaturedBadges

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

      await UserModel.updateOne(
        { wallet: payload.wallet },
        { $set: { isProfilePublic: isPublic === true } }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profile.toObject(),
        shareUrl: profile.isPublic ? `/u/${profile.slug}` : null,
      },
    })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
