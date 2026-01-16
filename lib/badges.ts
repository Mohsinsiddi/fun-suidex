// ============================================
// Badge System Utilities
// ============================================

import { BadgeModel, UserBadgeModel, UserModel, AdminConfigModel } from '@/lib/db/models'
import { BADGE_DEFINITIONS } from '@/constants/badges'
import type { Badge, BadgeProgress, UserBadge, BadgeTier } from '@/types/badge'

// ----------------------------------------
// Initialize Badges in Database
// ----------------------------------------

export async function initializeBadges(): Promise<void> {
  const existingCount = await BadgeModel.countDocuments()
  if (existingCount > 0) return

  const badges = BADGE_DEFINITIONS.map(badge => ({
    ...badge,
    createdAt: new Date(),
  }))

  await BadgeModel.insertMany(badges)
  console.log(`Initialized ${badges.length} badges`)
}

// ----------------------------------------
// Check if User Qualifies for Badge
// ----------------------------------------

interface UserStats {
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number
  totalReferred: number
  totalCommissionUSD: number
  totalTweets: number
  longestStreak: number
  createdAt: Date
}

export function checkBadgeCriteria(
  badge: Omit<Badge, 'createdAt'>,
  userStats: UserStats,
  config?: { earlyBirdCutoffDate?: Date | null }
): boolean {
  // Special badges (no auto-criteria)
  if (badge.category === 'special') return false

  // Special activity badges
  if (badge._id === 'early_bird') {
    if (!config?.earlyBirdCutoffDate) return false
    return userStats.createdAt <= config.earlyBirdCutoffDate
  }

  if (badge._id === 'og') {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return userStats.createdAt <= sixMonthsAgo && userStats.totalSpins >= 100
  }

  // Standard criteria check
  if (!badge.criteria) return false

  const { field, operator, value } = badge.criteria
  const userValue = userStats[field as keyof UserStats]

  if (typeof userValue !== 'number') return false

  if (operator === 'gte') return userValue >= value
  if (operator === 'eq') return userValue === value

  return false
}

// ----------------------------------------
// Get User's Badge Progress
// ----------------------------------------

export async function getUserBadgeProgress(
  wallet: string
): Promise<{ earned: UserBadge[]; progress: BadgeProgress[] }> {
  const [user, earnedBadgesRaw, allBadges, config] = await Promise.all([
    UserModel.findOne({ wallet }).select(
      'totalSpins totalWinsUSD biggestWinUSD totalReferred totalCommissionUSD totalTweets longestStreak createdAt'
    ).lean(),
    UserBadgeModel.find({ wallet }).lean(),
    BadgeModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    AdminConfigModel.findById('main').select('earlyBirdCutoffDate').lean(),
  ])

  if (!user) {
    return { earned: [], progress: [] }
  }

  // Create badge lookup map
  const badgeMap = new Map(allBadges.map(b => [b._id, b]))

  // Manually join badge data to earned badges
  const earnedBadges = earnedBadgesRaw.map(ub => ({
    _id: String(ub._id),
    wallet: ub.wallet,
    badgeId: ub.badgeId,
    badge: badgeMap.get(ub.badgeId) as Badge | undefined,
    unlockedAt: ub.unlockedAt,
    awardedBy: ub.awardedBy,
    awardReason: ub.awardReason,
  }))

  const earnedBadgeIds = new Set(earnedBadgesRaw.map(ub => ub.badgeId))

  const userStats: UserStats = {
    totalSpins: user.totalSpins || 0,
    totalWinsUSD: user.totalWinsUSD || 0,
    biggestWinUSD: user.biggestWinUSD || 0,
    totalReferred: user.totalReferred || 0,
    totalCommissionUSD: user.totalCommissionUSD || 0,
    totalTweets: user.totalTweets || 0,
    longestStreak: user.longestStreak || 0,
    createdAt: user.createdAt,
  }

  const progress: BadgeProgress[] = allBadges.map(badge => {
    const isUnlocked = earnedBadgeIds.has(badge._id)
    const earnedBadge = earnedBadges.find(ub => ub.badgeId === badge._id)

    let currentValue = 0
    let targetValue = 0

    if (badge.criteria) {
      const field = badge.criteria.field as keyof UserStats
      currentValue = (userStats[field] as number) || 0
      targetValue = badge.criteria.value
    }

    // Special cases
    if (badge._id === 'og') {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const accountAgeProgress = Math.min(100, (Date.now() - new Date(userStats.createdAt).getTime()) / (180 * 24 * 60 * 60 * 1000) * 100)
      const spinProgress = Math.min(100, (userStats.totalSpins / 100) * 100)
      currentValue = Math.min(accountAgeProgress, spinProgress)
      targetValue = 100
    }

    const progressPercent = targetValue > 0
      ? Math.min(100, Math.round((currentValue / targetValue) * 100))
      : isUnlocked ? 100 : 0

    return {
      badge: badge as Badge,
      isUnlocked,
      unlockedAt: earnedBadge?.unlockedAt,
      currentValue,
      targetValue,
      progressPercent,
    }
  })

  return {
    earned: earnedBadges as UserBadge[],
    progress,
  }
}

// ----------------------------------------
// Check and Award New Badges
// ----------------------------------------

export async function checkAndAwardBadges(wallet: string): Promise<UserBadge[]> {
  const [user, earnedBadges, allBadges, config] = await Promise.all([
    UserModel.findOne({ wallet }).select(
      'totalSpins totalWinsUSD biggestWinUSD totalReferred totalCommissionUSD totalTweets longestStreak createdAt'
    ).lean(),
    UserBadgeModel.find({ wallet }).select('badgeId').lean(),
    BadgeModel.find({ isActive: true }).lean(),
    AdminConfigModel.findById('main').select('earlyBirdCutoffDate badgesEnabled').lean(),
  ])

  if (!user || !config?.badgesEnabled) return []

  const earnedBadgeIds = new Set(earnedBadges.map(ub => ub.badgeId))

  const userStats: UserStats = {
    totalSpins: user.totalSpins || 0,
    totalWinsUSD: user.totalWinsUSD || 0,
    biggestWinUSD: user.biggestWinUSD || 0,
    totalReferred: user.totalReferred || 0,
    totalCommissionUSD: user.totalCommissionUSD || 0,
    totalTweets: user.totalTweets || 0,
    longestStreak: user.longestStreak || 0,
    createdAt: user.createdAt,
  }

  const newBadges: UserBadge[] = []

  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge._id)) continue

    // Check if qualifies
    const qualifies = checkBadgeCriteria(badge, userStats, {
      earlyBirdCutoffDate: config.earlyBirdCutoffDate,
    })

    if (qualifies) {
      try {
        const userBadge = await UserBadgeModel.create({
          wallet,
          badgeId: badge._id,
          unlockedAt: new Date(),
        })

        newBadges.push({
          _id: String(userBadge._id),
          wallet,
          badgeId: badge._id,
          badge: badge as Badge,
          unlockedAt: userBadge.unlockedAt,
        })
      } catch (err) {
        // Ignore duplicate key errors (race condition)
        if ((err as any)?.code !== 11000) throw err
      }
    }
  }

  return newBadges
}

// ----------------------------------------
// Award Special Badge (Admin)
// ----------------------------------------

export async function awardSpecialBadge(
  wallet: string,
  badgeId: string,
  awardedBy: string,
  reason?: string
): Promise<UserBadge | null> {
  const badge = await BadgeModel.findById(badgeId).lean()

  if (!badge || badge.category !== 'special') {
    throw new Error('Invalid special badge')
  }

  // Check if already has badge
  const existing = await UserBadgeModel.findOne({ wallet, badgeId })
  if (existing) {
    throw new Error('User already has this badge')
  }

  const userBadge = await UserBadgeModel.create({
    wallet,
    badgeId,
    unlockedAt: new Date(),
    awardedBy,
    awardReason: reason,
  })

  return {
    _id: String(userBadge._id),
    wallet,
    badgeId,
    badge: badge as Badge,
    unlockedAt: userBadge.unlockedAt,
    awardedBy,
    awardReason: reason,
  }
}

// ----------------------------------------
// Update Streak on Spin
// ----------------------------------------

export async function updateStreak(wallet: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const user = await UserModel.findOne({ wallet }).select('lastSpinDate currentStreak longestStreak')

  if (!user) {
    throw new Error('User not found')
  }

  const now = new Date()
  const lastSpin = user.lastSpinDate

  let newStreak = 1

  if (lastSpin) {
    const lastSpinDay = new Date(lastSpin).setHours(0, 0, 0, 0)
    const todayStart = new Date(now).setHours(0, 0, 0, 0)
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

    if (lastSpinDay === todayStart) {
      // Same day - keep current streak
      newStreak = user.currentStreak || 1
    } else if (lastSpinDay === yesterdayStart) {
      // Yesterday - increment streak
      newStreak = (user.currentStreak || 0) + 1
    }
    // Otherwise reset to 1 (gap > 1 day)
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak || 0)

  await UserModel.updateOne(
    { wallet },
    {
      $set: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastSpinDate: now,
      },
    }
  )

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
  }
}

// ----------------------------------------
// Get Badge Stats for User
// ----------------------------------------

export async function getUserBadgeStats(wallet: string): Promise<{
  totalBadges: number
  badgesByTier: Record<BadgeTier, number>
}> {
  const earnedBadges = await UserBadgeModel.find({ wallet }).populate('badge').lean()

  const badgesByTier: Record<BadgeTier, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    diamond: 0,
    legendary: 0,
    special: 0,
  }

  for (const ub of earnedBadges) {
    const badge = ub.badge as unknown as Badge
    if (badge?.tier) {
      badgesByTier[badge.tier]++
    }
  }

  return {
    totalBadges: earnedBadges.length,
    badgesByTier,
  }
}

// ----------------------------------------
// Get All Badges for Admin
// ----------------------------------------

export async function getAllBadgesWithStats(): Promise<
  (Badge & { earnedCount: number })[]
> {
  const [badges, badgeCounts] = await Promise.all([
    BadgeModel.find().sort({ sortOrder: 1 }).lean(),
    UserBadgeModel.aggregate([
      { $group: { _id: '$badgeId', count: { $sum: 1 } } },
    ]),
  ])

  const countMap = new Map(badgeCounts.map(b => [b._id, b.count]))

  return badges.map(badge => ({
    ...badge,
    earnedCount: countMap.get(badge._id) || 0,
  })) as (Badge & { earnedCount: number })[]
}
