'use client'

import { ChevronRight } from 'lucide-react'
import { BADGE_TIER_COLORS } from '@/constants/badges'
import type { BadgeProgress as BadgeProgressType } from '@/types/badge'

interface BadgeProgressProps {
  nextBadges: BadgeProgressType[]
  maxShow?: number
}

export function BadgeProgressList({ nextBadges, maxShow = 3 }: BadgeProgressProps) {
  const badges = nextBadges.slice(0, maxShow)

  if (!badges.length) {
    return (
      <div className="text-center py-6 text-text-muted">
        <p>No badges in progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {badges.map((p) => {
        const tierColors = BADGE_TIER_COLORS[p.badge.tier]
        const remaining = p.targetValue - p.currentValue

        return (
          <div
            key={p.badge._id}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="text-2xl">{p.badge.icon}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold text-sm ${tierColors.text}`}>
                    {p.badge.name}
                  </h4>
                  <span className="text-xs text-text-muted">
                    {p.progressPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                      p.badge.tier === 'gold' ? 'from-yellow-500 to-amber-400' :
                      p.badge.tier === 'diamond' ? 'from-cyan-400 to-blue-400' :
                      p.badge.tier === 'legendary' ? 'from-purple-500 to-pink-500' :
                      p.badge.tier === 'special' ? 'from-accent to-emerald-400' :
                      p.badge.tier === 'silver' ? 'from-slate-400 to-slate-300' :
                      'from-amber-700 to-amber-500'
                    }`}
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>

                {/* Progress Text */}
                <p className="text-[11px] text-text-muted">
                  {p.currentValue.toLocaleString()} / {p.targetValue.toLocaleString()}
                  {remaining > 0 && (
                    <span className="ml-1">
                      ({remaining.toLocaleString()} more to go)
                    </span>
                  )}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
