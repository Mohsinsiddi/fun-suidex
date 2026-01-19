// ============================================
// Global Activity Feed API
// ============================================
// Returns recent wins for live activity display

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { SpinModel, UserProfileModel } from '@/lib/db/models'

// Simple in-memory cache (10 second TTL)
let cache: { data: any; timestamp: number } | null = null
const CACHE_TTL = 10000 // 10 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // Check cache
    const now = Date.now()
    if (cache && now - cache.timestamp < CACHE_TTL) {
      // Return cached data, but slice to requested limit
      return NextResponse.json({
        success: true,
        data: {
          activities: cache.data.activities.slice(0, limit),
          lastUpdated: cache.data.lastUpdated,
        },
      })
    }

    await connectDB()

    // Fetch recent wins (exclude no_prize)
    const spins = await SpinModel.find({
      prizeType: { $ne: 'no_prize' },
    })
      .sort({ createdAt: -1 })
      .limit(50) // Cache more than needed
      .select('wallet prizeType prizeAmount prizeValueUSD lockDuration createdAt')
      .lean()

    // Get public profiles for these wallets
    const wallets = Array.from(new Set(spins.map((s) => s.wallet)))
    const profiles = await UserProfileModel.find({
      wallet: { $in: wallets },
      isPublic: true,
    })
      .select('wallet slug')
      .lean()

    const profileMap = new Map(profiles.map((p) => [p.wallet, p.slug]))

    // Format activities
    const activities = spins.map((spin) => ({
      id: String(spin._id),
      wallet: spin.wallet,
      walletShort: `${spin.wallet.slice(0, 6)}...${spin.wallet.slice(-4)}`,
      prizeType: spin.prizeType,
      prizeAmount: spin.prizeAmount,
      prizeValueUSD: spin.prizeValueUSD,
      lockDuration: spin.lockDuration || null,
      createdAt: spin.createdAt,
      profileSlug: profileMap.get(spin.wallet) || null,
    }))

    // Update cache
    cache = {
      data: {
        activities,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: now,
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: activities.slice(0, limit),
        lastUpdated: cache.data.lastUpdated,
      },
    })
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}
