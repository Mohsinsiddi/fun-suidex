'use client'

import { BadgeCard } from './BadgeCard'
import { BADGE_CATEGORY_LABELS } from '@/constants/badges'
import type { BadgeProgress, BadgeCategory } from '@/types/badge'

interface BadgeGridProps {
  progress: BadgeProgress[]
  groupByCategory?: boolean
}

export function BadgeGrid({ progress, groupByCategory = true }: BadgeGridProps) {
  if (!groupByCategory) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {progress.map((p) => (
          <BadgeCard
            key={p.badge._id}
            badge={p.badge}
            isUnlocked={p.isUnlocked}
            progressPercent={p.progressPercent}
          />
        ))}
      </div>
    )
  }

  // Group by category
  const byCategory = progress.reduce((acc, p) => {
    const cat = p.badge.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<BadgeCategory, BadgeProgress[]>)

  const categoryOrder: BadgeCategory[] = [
    'spins',
    'earnings',
    'single_win',
    'referral',
    'commission',
    'activity',
    'social',
    'special',
  ]

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const badges = byCategory[category]
        if (!badges?.length) return null

        const unlockedCount = badges.filter(b => b.isUnlocked).length

        return (
          <div key={category}>
            {/* Category Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {BADGE_CATEGORY_LABELS[category]}
              </h3>
              <span className="text-sm text-text-muted">
                {unlockedCount} / {badges.length}
              </span>
            </div>

            {/* Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {badges.map((p) => (
                <BadgeCard
                  key={p.badge._id}
                  badge={p.badge}
                  isUnlocked={p.isUnlocked}
                  progressPercent={p.progressPercent}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
