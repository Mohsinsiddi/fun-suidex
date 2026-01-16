// ============================================
// User Profile Types
// ============================================

import type { UserBadge } from './badge'

export interface UserProfile {
  _id: string
  wallet: string
  slug: string              // Unique shareable slug
  isPublic: boolean
  displayName?: string      // Optional custom name
  bio?: string              // Short bio (max 160 chars)

  // Public stats (only shown if public)
  stats: {
    totalSpins: number
    totalWinsUSD: number
    biggestWinUSD: number
    totalReferred: number
    currentStreak: number
    longestStreak: number
    memberSince: Date
    lastActive: Date
  }

  // Featured badges (user can select up to 5)
  featuredBadges: string[]  // Badge IDs

  unlockedAt: Date          // When profile was unlocked
  createdAt: Date
  updatedAt: Date
}

export interface PublicProfileData {
  slug: string
  displayName?: string
  bio?: string
  stats: {
    totalSpins: number
    totalWinsUSD: number
    biggestWinUSD: number
    totalReferred: number
    currentStreak: number
    longestStreak: number
    memberSince: Date
    lastActive: Date
  }
  badges: {
    total: number
    featured: UserBadge[]
  }
  walletShort: string       // First 6...last 4 chars
}

export interface ProfileSettings {
  isPublic: boolean
  displayName?: string
  bio?: string
  featuredBadges: string[]
}
