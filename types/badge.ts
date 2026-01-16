// ============================================
// Badge System Types
// ============================================

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary' | 'special'

export type BadgeCategory =
  | 'referral'      // Referral count badges
  | 'spins'         // Total spins badges
  | 'earnings'      // Total USD won badges
  | 'single_win'    // Biggest single win badges
  | 'commission'    // Referral earnings badges
  | 'activity'      // Streak, early bird, OG badges
  | 'social'        // Tweet-to-claim badges
  | 'special'       // Admin-awarded badges

export interface BadgeCriteria {
  field: string           // User field to check (e.g., 'totalSpins', 'totalReferred')
  operator: 'gte' | 'eq'  // Greater than or equal, or exact match
  value: number           // Threshold value
}

export interface Badge {
  _id: string             // Unique badge ID (e.g., 'spin_100')
  name: string            // Display name
  description: string     // How to earn
  icon: string            // Emoji or icon name
  tier: BadgeTier
  category: BadgeCategory
  criteria: BadgeCriteria | null  // null for special (admin-awarded) badges
  isActive: boolean       // Can be earned
  sortOrder: number       // Display order
  createdAt: Date
}

export interface UserBadge {
  _id: string
  wallet: string
  badgeId: string
  badge?: Badge           // Populated on query
  unlockedAt: Date
  awardedBy?: string      // Admin username if special badge
  awardReason?: string    // Reason for special badge
  isSeedUser?: boolean    // Marker for test data
}

export interface BadgeProgress {
  badge: Badge
  isUnlocked: boolean
  unlockedAt?: Date
  currentValue: number
  targetValue: number
  progressPercent: number
}

export interface UserBadgeStats {
  totalBadges: number
  badgesByTier: Record<BadgeTier, number>
  recentBadges: UserBadge[]
  nextBadges: BadgeProgress[]  // Top 3 closest to unlock
}

// API Response types
export interface BadgeListResponse {
  badges: Badge[]
  userProgress?: BadgeProgress[]  // If authenticated
}

export interface UserBadgesResponse {
  earned: UserBadge[]
  stats: UserBadgeStats
  progress: BadgeProgress[]
}
