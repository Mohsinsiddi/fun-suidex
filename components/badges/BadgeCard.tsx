'use client'

import { Lock } from 'lucide-react'
import { BADGE_TIER_COLORS } from '@/constants/badges'
import type { Badge, BadgeTier } from '@/types/badge'

interface BadgeCardProps {
  badge: Badge
  isUnlocked?: boolean
  progressPercent?: number
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  onClick?: () => void
}

export function BadgeCard({
  badge,
  isUnlocked = false,
  progressPercent = 0,
  size = 'md',
  showProgress = true,
  onClick,
}: BadgeCardProps) {
  const tierColors = BADGE_TIER_COLORS[badge.tier]

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl border transition-all duration-200
        ${sizeClasses[size]}
        ${isUnlocked
          ? `${tierColors.bg} ${tierColors.border} shadow-lg ${tierColors.glow}`
          : 'bg-white/[0.02] border-white/[0.06] opacity-60'
        }
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
      `}
    >
      {/* Lock overlay for locked badges */}
      {!isUnlocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}

      {/* Badge Icon */}
      <div className={`${iconSizes[size]} mb-2 ${isUnlocked ? '' : 'grayscale'}`}>
        {badge.icon}
      </div>

      {/* Badge Name */}
      <h4 className={`font-semibold text-sm mb-1 ${isUnlocked ? tierColors.text : 'text-gray-500'}`}>
        {badge.name}
      </h4>

      {/* Description */}
      <p className="text-xs text-text-muted line-clamp-2">
        {badge.description}
      </p>

      {/* Progress Bar */}
      {showProgress && !isUnlocked && progressPercent > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-text-muted mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tierColors.bg.replace('/10', '/50').replace('/20', '/60')}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Tier Badge */}
      <div className={`
        absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
        ${tierColors.bg} ${tierColors.text} ${tierColors.border} border
      `}>
        {badge.tier}
      </div>
    </div>
  )
}
