// ============================================
// Badge Definitions - 35 Badges
// ============================================

import type { Badge, BadgeTier, BadgeCategory } from '@/types/badge'

// Tier colors for UI
export const BADGE_TIER_COLORS: Record<BadgeTier, { bg: string; border: string; text: string; glow: string }> = {
  bronze: {
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/50',
    text: 'text-amber-500',
    glow: 'shadow-amber-500/20',
  },
  silver: {
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/50',
    text: 'text-slate-300',
    glow: 'shadow-slate-300/20',
  },
  gold: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-400/30',
  },
  diamond: {
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/50',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-300/40',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    border: 'border-purple-400/50',
    text: 'text-purple-300',
    glow: 'shadow-purple-400/50',
  },
  special: {
    bg: 'bg-gradient-to-br from-accent/20 to-emerald-500/20',
    border: 'border-accent/50',
    text: 'text-accent',
    glow: 'shadow-accent/40',
  },
}

// Category labels
export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  referral: 'Referrals',
  spins: 'Spins',
  earnings: 'Earnings',
  single_win: 'Big Wins',
  commission: 'Commissions',
  activity: 'Activity',
  social: 'Social',
  special: 'Special',
}

// All badge definitions
export const BADGE_DEFINITIONS: Omit<Badge, 'createdAt'>[] = [
  // ============================================
  // REFERRAL BADGES (5)
  // ============================================
  {
    _id: 'ref_1',
    name: 'First Referral',
    description: 'Refer your first user',
    icon: '👋',
    tier: 'bronze',
    category: 'referral',
    criteria: { field: 'totalReferred', operator: 'gte', value: 1 },
    isActive: true,
    sortOrder: 100,
  },
  {
    _id: 'ref_5',
    name: 'Networker',
    description: 'Refer 5 users',
    icon: '🤝',
    tier: 'silver',
    category: 'referral',
    criteria: { field: 'totalReferred', operator: 'gte', value: 5 },
    isActive: true,
    sortOrder: 101,
  },
  {
    _id: 'ref_25',
    name: 'Influencer',
    description: 'Refer 25 users',
    icon: '📣',
    tier: 'gold',
    category: 'referral',
    criteria: { field: 'totalReferred', operator: 'gte', value: 25 },
    isActive: true,
    sortOrder: 102,
  },
  {
    _id: 'ref_100',
    name: 'Ambassador',
    description: 'Refer 100 users',
    icon: '🏆',
    tier: 'diamond',
    category: 'referral',
    criteria: { field: 'totalReferred', operator: 'gte', value: 100 },
    isActive: true,
    sortOrder: 103,
  },
  {
    _id: 'ref_500',
    name: 'Legend',
    description: 'Refer 500 users',
    icon: '👑',
    tier: 'legendary',
    category: 'referral',
    criteria: { field: 'totalReferred', operator: 'gte', value: 500 },
    isActive: true,
    sortOrder: 104,
  },

  // ============================================
  // SPIN BADGES (5)
  // ============================================
  {
    _id: 'spin_1',
    name: 'First Spin',
    description: 'Complete your first spin',
    icon: '🎰',
    tier: 'bronze',
    category: 'spins',
    criteria: { field: 'totalSpins', operator: 'gte', value: 1 },
    isActive: true,
    sortOrder: 200,
  },
  {
    _id: 'spin_25',
    name: 'Spinner',
    description: 'Complete 25 spins',
    icon: '🎡',
    tier: 'silver',
    category: 'spins',
    criteria: { field: 'totalSpins', operator: 'gte', value: 25 },
    isActive: true,
    sortOrder: 201,
  },
  {
    _id: 'spin_100',
    name: 'Addict',
    description: 'Complete 100 spins',
    icon: '🔥',
    tier: 'gold',
    category: 'spins',
    criteria: { field: 'totalSpins', operator: 'gte', value: 100 },
    isActive: true,
    sortOrder: 202,
  },
  {
    _id: 'spin_500',
    name: 'Whale Spinner',
    description: 'Complete 500 spins',
    icon: '🐋',
    tier: 'diamond',
    category: 'spins',
    criteria: { field: 'totalSpins', operator: 'gte', value: 500 },
    isActive: true,
    sortOrder: 203,
  },
  {
    _id: 'spin_2000',
    name: 'Spin Master',
    description: 'Complete 2,000 spins',
    icon: '⚡',
    tier: 'legendary',
    category: 'spins',
    criteria: { field: 'totalSpins', operator: 'gte', value: 2000 },
    isActive: true,
    sortOrder: 204,
  },

  // ============================================
  // TOTAL EARNINGS BADGES (5)
  // ============================================
  {
    _id: 'earn_1',
    name: 'First Win',
    description: 'Win your first prize',
    icon: '🎁',
    tier: 'bronze',
    category: 'earnings',
    criteria: { field: 'totalWinsUSD', operator: 'gte', value: 1 },
    isActive: true,
    sortOrder: 300,
  },
  {
    _id: 'earn_50',
    name: 'Lucky',
    description: 'Win $50+ total',
    icon: '🍀',
    tier: 'silver',
    category: 'earnings',
    criteria: { field: 'totalWinsUSD', operator: 'gte', value: 50 },
    isActive: true,
    sortOrder: 301,
  },
  {
    _id: 'earn_250',
    name: 'High Roller',
    description: 'Win $250+ total',
    icon: '💰',
    tier: 'gold',
    category: 'earnings',
    criteria: { field: 'totalWinsUSD', operator: 'gte', value: 250 },
    isActive: true,
    sortOrder: 302,
  },
  {
    _id: 'earn_1000',
    name: 'Big Winner',
    description: 'Win $1,000+ total',
    icon: '💎',
    tier: 'diamond',
    category: 'earnings',
    criteria: { field: 'totalWinsUSD', operator: 'gte', value: 1000 },
    isActive: true,
    sortOrder: 303,
  },
  {
    _id: 'earn_5000',
    name: 'Jackpot King',
    description: 'Win $5,000+ total',
    icon: '🤑',
    tier: 'legendary',
    category: 'earnings',
    criteria: { field: 'totalWinsUSD', operator: 'gte', value: 5000 },
    isActive: true,
    sortOrder: 304,
  },

  // ============================================
  // SINGLE WIN BADGES (4)
  // ============================================
  {
    _id: 'win_25',
    name: 'Nice Hit',
    description: 'Win $25+ in one spin',
    icon: '🎯',
    tier: 'silver',
    category: 'single_win',
    criteria: { field: 'biggestWinUSD', operator: 'gte', value: 25 },
    isActive: true,
    sortOrder: 400,
  },
  {
    _id: 'win_100',
    name: 'Mega Win',
    description: 'Win $100+ in one spin',
    icon: '💥',
    tier: 'gold',
    category: 'single_win',
    criteria: { field: 'biggestWinUSD', operator: 'gte', value: 100 },
    isActive: true,
    sortOrder: 401,
  },
  {
    _id: 'win_500',
    name: 'Jackpot',
    description: 'Win $500+ in one spin',
    icon: '🎰',
    tier: 'diamond',
    category: 'single_win',
    criteria: { field: 'biggestWinUSD', operator: 'gte', value: 500 },
    isActive: true,
    sortOrder: 402,
  },
  {
    _id: 'win_1000',
    name: 'Legendary Pull',
    description: 'Win $1,000+ in one spin',
    icon: '🌟',
    tier: 'legendary',
    category: 'single_win',
    criteria: { field: 'biggestWinUSD', operator: 'gte', value: 1000 },
    isActive: true,
    sortOrder: 403,
  },

  // ============================================
  // REFERRAL EARNINGS BADGES (5)
  // ============================================
  {
    _id: 'comm_1',
    name: 'First Commission',
    description: 'Earn your first referral reward',
    icon: '💵',
    tier: 'bronze',
    category: 'commission',
    criteria: { field: 'totalCommissionUSD', operator: 'gte', value: 1 },
    isActive: true,
    sortOrder: 500,
  },
  {
    _id: 'comm_25',
    name: 'Earner',
    description: 'Earn $25+ in commissions',
    icon: '📈',
    tier: 'silver',
    category: 'commission',
    criteria: { field: 'totalCommissionUSD', operator: 'gte', value: 25 },
    isActive: true,
    sortOrder: 501,
  },
  {
    _id: 'comm_100',
    name: 'Money Maker',
    description: 'Earn $100+ in commissions',
    icon: '🏦',
    tier: 'gold',
    category: 'commission',
    criteria: { field: 'totalCommissionUSD', operator: 'gte', value: 100 },
    isActive: true,
    sortOrder: 502,
  },
  {
    _id: 'comm_500',
    name: 'Passive King',
    description: 'Earn $500+ in commissions',
    icon: '👔',
    tier: 'diamond',
    category: 'commission',
    criteria: { field: 'totalCommissionUSD', operator: 'gte', value: 500 },
    isActive: true,
    sortOrder: 503,
  },
  {
    _id: 'comm_2000',
    name: 'Affiliate God',
    description: 'Earn $2,000+ in commissions',
    icon: '🦅',
    tier: 'legendary',
    category: 'commission',
    criteria: { field: 'totalCommissionUSD', operator: 'gte', value: 2000 },
    isActive: true,
    sortOrder: 504,
  },

  // ============================================
  // ACTIVITY BADGES (4)
  // ============================================
  {
    _id: 'early_bird',
    name: 'Early Bird',
    description: 'Join in the first month of launch',
    icon: '🐦',
    tier: 'bronze',
    category: 'activity',
    criteria: null,  // Special check in code
    isActive: true,
    sortOrder: 600,
  },
  {
    _id: 'streak_7',
    name: 'Daily Player',
    description: 'Spin 7 days in a row',
    icon: '📆',
    tier: 'silver',
    category: 'activity',
    criteria: { field: 'longestStreak', operator: 'gte', value: 7 },
    isActive: true,
    sortOrder: 601,
  },
  {
    _id: 'streak_30',
    name: 'Loyal',
    description: 'Spin 30 days in a row',
    icon: '💪',
    tier: 'gold',
    category: 'activity',
    criteria: { field: 'longestStreak', operator: 'gte', value: 30 },
    isActive: true,
    sortOrder: 602,
  },
  {
    _id: 'og',
    name: 'OG',
    description: 'Account older than 6 months with 100+ spins',
    icon: '🎖️',
    tier: 'diamond',
    category: 'activity',
    criteria: null,  // Special check in code
    isActive: true,
    sortOrder: 603,
  },

  // ============================================
  // SOCIAL BADGES (3)
  // ============================================
  {
    _id: 'social_1',
    name: 'Sharer',
    description: 'Complete first tweet-to-claim',
    icon: '🐦',
    tier: 'bronze',
    category: 'social',
    criteria: { field: 'totalTweets', operator: 'gte', value: 1 },
    isActive: true,
    sortOrder: 700,
  },
  {
    _id: 'social_10',
    name: 'Social Butterfly',
    description: 'Complete 10 tweet-to-claims',
    icon: '🦋',
    tier: 'silver',
    category: 'social',
    criteria: { field: 'totalTweets', operator: 'gte', value: 10 },
    isActive: true,
    sortOrder: 701,
  },
  {
    _id: 'social_50',
    name: 'Viral',
    description: 'Complete 50 tweet-to-claims',
    icon: '🚀',
    tier: 'gold',
    category: 'social',
    criteria: { field: 'totalTweets', operator: 'gte', value: 50 },
    isActive: true,
    sortOrder: 702,
  },

  // ============================================
  // SPECIAL BADGES (4) - Admin Awarded
  // ============================================
  {
    _id: 'beta_tester',
    name: 'Beta Tester',
    description: 'Participated in beta testing',
    icon: '🧪',
    tier: 'special',
    category: 'special',
    criteria: null,
    isActive: true,
    sortOrder: 800,
  },
  {
    _id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Reported a valid bug',
    icon: '🐛',
    tier: 'special',
    category: 'special',
    criteria: null,
    isActive: true,
    sortOrder: 801,
  },
  {
    _id: 'contest_winner',
    name: 'Contest Winner',
    description: 'Won a community contest',
    icon: '🥇',
    tier: 'special',
    category: 'special',
    criteria: null,
    isActive: true,
    sortOrder: 802,
  },
  {
    _id: 'vip',
    name: 'VIP',
    description: 'Special recognition',
    icon: '⭐',
    tier: 'special',
    category: 'special',
    criteria: null,
    isActive: true,
    sortOrder: 803,
  },
]

// Helper to get badge by ID
export function getBadgeById(badgeId: string): Omit<Badge, 'createdAt'> | undefined {
  return BADGE_DEFINITIONS.find(b => b._id === badgeId)
}

// Get badges by category
export function getBadgesByCategory(category: BadgeCategory): Omit<Badge, 'createdAt'>[] {
  return BADGE_DEFINITIONS.filter(b => b.category === category).sort((a, b) => a.sortOrder - b.sortOrder)
}

// Get badges by tier
export function getBadgesByTier(tier: BadgeTier): Omit<Badge, 'createdAt'>[] {
  return BADGE_DEFINITIONS.filter(b => b.tier === tier).sort((a, b) => a.sortOrder - b.sortOrder)
}
