// ============================================
// Leaderboard API - Public Rankings
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'

// Leaderboard types
type LeaderboardType = 'spins' | 'wins' | 'streak' | 'referrals' | 'biggestWin'

interface LeaderboardEntry {
  rank: number
  wallet: string
  displayWallet: string
  value: number
  totalSpins?: number
  profileSlug?: string | null
  hasProfile: boolean
}

// ----------------------------------------
// Simple in-memory cache (60 second TTL)
// ----------------------------------------
interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 1000 // 60 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

const LEADERBOARD_CONFIG: Record<LeaderboardType, { field: string; label: string }> = {
  spins: { field: 'totalSpins', label: 'Total Spins' },
  wins: { field: 'totalWinsUSD', label: 'Total Won ($)' },
  streak: { field: 'longestStreak', label: 'Longest Streak' },
  referrals: { field: 'totalReferred', label: 'Referrals' },
  biggestWin: { field: 'biggestWinUSD', label: 'Biggest Win ($)' },
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = (url.searchParams.get('type') || 'spins') as LeaderboardType
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '25', 10)))

    // Validate type
    if (!LEADERBOARD_CONFIG[type]) {
      return NextResponse.json(
        { success: false, error: 'Invalid leaderboard type' },
        { status: 400 }
      )
    }

    const config = LEADERBOARD_CONFIG[type]
    const cacheKey = `leaderboard:${type}:${page}:${limit}`

    // Check cache first
    const cached = getCached<{
      entries: LeaderboardEntry[]
      topThree: LeaderboardEntry[]
      total: number
    }>(cacheKey)

    if (cached) {
      return NextResponse.json(
        {
          success: true,
          data: {
            type,
            label: config.label,
            entries: cached.entries,
            topThree: cached.topThree,
            pagination: {
              page,
              limit,
              total: cached.total,
              totalPages: Math.ceil(cached.total / limit),
              hasNext: page < Math.ceil(cached.total / limit),
              hasPrev: page > 1,
            },
          },
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=60',
          },
        }
      )
    }

    await connectDB()

    const skip = (page - 1) * limit

    // Get leaderboard entries - only users with at least 1 spin
    // Include profile fields for linking
    const [users, total] = await Promise.all([
      UserModel.find({
        hasCompletedFirstSpin: true,
        [config.field]: { $gt: 0 },
      })
        .select(`wallet ${config.field} totalSpins profileSlug isProfilePublic`)
        .sort({ [config.field]: -1, createdAt: 1 }) // Secondary sort by createdAt for tie-breaking
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments({
        hasCompletedFirstSpin: true,
        [config.field]: { $gt: 0 },
      }),
    ])

    // Format entries with rank and profile info
    const entries: LeaderboardEntry[] = users.map((user: any, index: number) => ({
      rank: skip + index + 1,
      wallet: user.wallet,
      displayWallet: `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`,
      value: user[config.field] || 0,
      totalSpins: user.totalSpins,
      profileSlug: user.isProfilePublic ? user.profileSlug : null,
      hasProfile: Boolean(user.profileSlug && user.isProfilePublic),
    }))

    // Get top 3 for highlights (only on first page)
    let topThree: LeaderboardEntry[] = []
    if (page === 1 && entries.length >= 3) {
      topThree = entries.slice(0, 3)
    }

    // Cache the results
    setCache(cacheKey, { entries, topThree, total })

    return NextResponse.json(
      {
        success: true,
        data: {
          type,
          label: config.label,
          entries,
          topThree,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      }
    )
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
