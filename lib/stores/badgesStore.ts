import { create } from 'zustand'
import type { Badge, UserBadge, BadgeProgress, BadgeTier } from '@/types/badge'

// ============================================
// Badges Store - Badge System State
// ============================================
// Caches all badges and user's earned badges
// Pattern: Cache for 10 minutes, refresh on badge unlock

interface BadgeStats {
  totalBadges: number
  badgesByTier: Record<BadgeTier, number>
}

interface BadgesState {
  // All badges (public data)
  allBadges: Badge[]
  isLoadingAll: boolean
  lastFetchedAll: number | null

  // User's earned badges
  userBadges: UserBadge[]
  badgeProgress: BadgeProgress[]
  badgeStats: BadgeStats
  isLoadingUser: boolean
  lastFetchedUser: number | null

  // Error state
  error: string | null

  // Actions
  fetchAllBadges: () => Promise<void>
  fetchUserBadges: () => Promise<void>
  addUserBadge: (badge: UserBadge) => void
  invalidate: () => void
}

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000

const initialBadgeStats: BadgeStats = {
  totalBadges: 0,
  badgesByTier: {
    bronze: 0,
    silver: 0,
    gold: 0,
    diamond: 0,
    legendary: 0,
    special: 0,
  },
}

const initialState = {
  allBadges: [],
  isLoadingAll: false,
  lastFetchedAll: null,
  userBadges: [],
  badgeProgress: [],
  badgeStats: initialBadgeStats,
  isLoadingUser: false,
  lastFetchedUser: null,
  error: null,
}

export const useBadgesStore = create<BadgesState>((set, get) => ({
  ...initialState,

  // Fetch all available badges (public endpoint)
  fetchAllBadges: async () => {
    const state = get()

    // Check cache
    if (state.lastFetchedAll) {
      const cacheAge = Date.now() - state.lastFetchedAll
      if (cacheAge < CACHE_DURATION && state.allBadges.length > 0) {
        return // Use cached data
      }
    }

    if (state.isLoadingAll) return

    set({ isLoadingAll: true, error: null })

    try {
      const res = await fetch('/api/badges')
      const data = await res.json()

      if (data.success) {
        set({
          isLoadingAll: false,
          allBadges: data.data?.badges || [],
          lastFetchedAll: Date.now(),
        })
      } else {
        set({
          isLoadingAll: false,
          error: data.error || 'Failed to fetch badges',
        })
      }
    } catch (error) {
      set({
        isLoadingAll: false,
        error: 'Failed to fetch badges',
      })
    }
  },

  // Fetch user's earned badges (requires auth)
  fetchUserBadges: async () => {
    const state = get()

    // Check cache
    if (state.lastFetchedUser) {
      const cacheAge = Date.now() - state.lastFetchedUser
      if (cacheAge < CACHE_DURATION && state.userBadges.length > 0) {
        return // Use cached data
      }
    }

    if (state.isLoadingUser) return

    set({ isLoadingUser: true, error: null })

    try {
      const res = await fetch('/api/badges/user')
      const data = await res.json()

      if (data.success) {
        const earned = data.data?.earned || []
        const progress = data.data?.progress || []
        const stats = data.data?.stats || initialBadgeStats

        set({
          isLoadingUser: false,
          userBadges: earned,
          badgeProgress: progress,
          badgeStats: {
            totalBadges: stats.totalBadges || earned.length,
            badgesByTier: stats.badgesByTier || initialBadgeStats.badgesByTier,
          },
          lastFetchedUser: Date.now(),
        })
      } else {
        set({
          isLoadingUser: false,
          error: data.error || 'Failed to fetch user badges',
        })
      }
    } catch (error) {
      set({
        isLoadingUser: false,
        error: 'Failed to fetch user badges',
      })
    }
  },

  // Add a newly unlocked badge locally
  addUserBadge: (badge: UserBadge) => {
    const state = get()
    // Avoid duplicates
    if (state.userBadges.some((b) => b.badgeId === badge.badgeId)) return

    set({
      userBadges: [...state.userBadges, badge],
      badgeStats: {
        ...state.badgeStats,
        totalBadges: state.badgeStats.totalBadges + 1,
      },
    })
  },

  // Force refresh on next fetch
  invalidate: () => {
    set({
      lastFetchedAll: null,
      lastFetchedUser: null,
    })
  },
}))

// ============================================
// Helper Hooks
// ============================================

// Check if user has a specific badge
export const useHasBadge = (badgeId: string) => {
  const { userBadges } = useBadgesStore()
  return userBadges.some((b) => b.badgeId === badgeId)
}

// Get badges by tier
export const useBadgesByTier = (tier: BadgeTier) => {
  const { allBadges, userBadges } = useBadgesStore()
  const tierBadges = allBadges.filter((b) => b.tier === tier)
  const earnedIds = new Set(userBadges.map((b) => b.badgeId))

  return tierBadges.map((badge) => ({
    ...badge,
    isEarned: earnedIds.has(badge._id),
  }))
}

// Get next badges to unlock (closest to completion)
export const useNextBadges = (limit = 3) => {
  const { badgeProgress } = useBadgesStore()
  return badgeProgress
    .filter((p) => !p.isUnlocked && p.progressPercent < 100)
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, limit)
}
