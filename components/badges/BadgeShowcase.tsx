'use client'

import Link from 'next/link'
import { Award, ChevronRight } from 'lucide-react'
import { BADGE_TIER_COLORS } from '@/constants/badges'
import type { UserBadge, BadgeTier } from '@/types/badge'

interface BadgeShowcaseProps {
  badges: UserBadge[]
  totalCount: number
  badgesByTier?: Record<BadgeTier, number>
  maxShow?: number
  showViewAll?: boolean
}

export function BadgeShowcase({
  badges,
  totalCount,
  badgesByTier,
  maxShow = 6,
  showViewAll = true,
}: BadgeShowcaseProps) {
  const displayBadges = badges.slice(0, maxShow)

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-white">My Badges</h3>
          <span className="text-sm text-text-muted">({totalCount})</span>
        </div>
        {showViewAll && (
          <Link
            href="/badges"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Tier Summary */}
      {badgesByTier && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.entries(badgesByTier) as [BadgeTier, number][])
            .filter(([_, count]) => count > 0)
            .map(([tier, count]) => {
              const colors = BADGE_TIER_COLORS[tier]
              return (
                <span
                  key={tier}
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${colors.bg} ${colors.text} ${colors.border} border`}
                >
                  {count} {tier}
                </span>
              )
            })}
        </div>
      )}

      {/* Badge Icons */}
      {displayBadges.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {displayBadges.map((ub) => {
            const badge = ub.badge
            if (!badge) return null
            const colors = BADGE_TIER_COLORS[badge.tier]

            return (
              <div
                key={ub._id}
                className={`
                  relative w-14 h-14 rounded-xl flex items-center justify-center
                  ${colors.bg} ${colors.border} border
                  hover:scale-110 transition-transform cursor-pointer
                `}
                title={`${badge.name} - ${badge.description}`}
              >
                <span className="text-2xl">{badge.icon}</span>
              </div>
            )
          })}

          {totalCount > maxShow && (
            <Link
              href="/badges"
              className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] hover:border-accent/30 transition-colors"
            >
              <span className="text-sm text-text-muted">+{totalCount - maxShow}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-text-muted text-sm">No badges earned yet</p>
          <Link href="/wheel" className="text-accent text-sm hover:underline mt-1 inline-block">
            Start spinning to earn badges!
          </Link>
        </div>
      )}
    </div>
  )
}
