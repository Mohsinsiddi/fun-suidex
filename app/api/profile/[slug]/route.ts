import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserProfileModel, UserBadgeModel } from '@/lib/db/models'
import type { PublicProfileData } from '@/types/profile'

// GET /api/profile/[slug] - Get public profile (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug || slug.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Invalid profile' },
        { status: 400 }
      )
    }

    await connectDB()

    const profile = await UserProfileModel.findOne({
      slug: slug.toLowerCase(),
      isPublic: true,
    }).lean()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get featured badges with details
    const featuredBadges = profile.featuredBadges?.length
      ? await UserBadgeModel.find({
          wallet: profile.wallet,
          badgeId: { $in: profile.featuredBadges },
        })
          .populate('badge')
          .lean()
      : []

    // Get total badge count
    const totalBadges = await UserBadgeModel.countDocuments({
      wallet: profile.wallet,
    })

    // Format wallet address
    const walletShort = `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}`

    const publicData: PublicProfileData = {
      slug: profile.slug,
      displayName: profile.displayName,
      bio: profile.bio,
      stats: profile.stats,
      badges: {
        total: totalBadges,
        featured: featuredBadges as any,
      },
      walletShort,
    }

    return NextResponse.json({
      success: true,
      data: publicData,
    })
  } catch (error) {
    console.error('Public profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
