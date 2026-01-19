'use client'

import Link from 'next/link'
import { Trophy, Lock, Coins, Sparkles, Clock } from 'lucide-react'
import { generateAvatarSVG } from '@/lib/utils/avatar'

export interface Activity {
  id: string
  wallet: string
  walletShort: string
  prizeType: 'liquid_victory' | 'locked_victory' | 'suitrump'
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: string | null
  createdAt: string
  profileSlug: string | null
}

interface ActivityItemProps {
  activity: Activity
  compact?: boolean
  isNew?: boolean
}

const prizeConfig = {
  liquid_victory: {
    label: 'Liquid VICT',
    shortLabel: 'VICT',
    color: 'text-[var(--prize-liquid)]',
    bgColor: 'bg-[var(--prize-liquid)]/10',
    borderColor: 'border-[var(--prize-liquid)]/30',
    Icon: Coins,
  },
  locked_victory: {
    label: 'Locked VICT',
    shortLabel: 'Locked',
    color: 'text-[var(--prize-purple)]',
    bgColor: 'bg-[var(--prize-purple)]/10',
    borderColor: 'border-[var(--prize-purple)]/30',
    Icon: Lock,
  },
  suitrump: {
    label: 'SuiTrump',
    shortLabel: 'TRUMP',
    color: 'text-[var(--prize-cyan)]',
    bgColor: 'bg-[var(--prize-cyan)]/10',
    borderColor: 'border-[var(--prize-cyan)]/30',
    Icon: Trophy,
  },
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

export default function ActivityItem({ activity, compact = false, isNew = false }: ActivityItemProps) {
  const config = prizeConfig[activity.prizeType]
  const Icon = config.Icon

  // Generate avatar inline
  const avatarSvg = generateAvatarSVG(activity.wallet, 40)
  const avatarDataUrl = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(avatarSvg) : Buffer.from(avatarSvg).toString('base64')}`

  const WalletDisplay = activity.profileSlug ? (
    <Link
      href={`/u/${activity.profileSlug}`}
      className="font-mono text-xs sm:text-sm font-medium text-white hover:text-[var(--accent)] transition-colors"
    >
      {activity.walletShort}
    </Link>
  ) : (
    <span className="font-mono text-xs sm:text-sm font-medium text-white">
      {activity.walletShort}
    </span>
  )

  // Compact view - used everywhere now
  if (compact) {
    return (
      <div className={`group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all duration-200 ${isNew ? 'ring-1 ring-[var(--success)]/50' : ''}`}>
        {/* New indicator line */}
        {isNew && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-[var(--success)]" />
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={avatarDataUrl}
            alt=""
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded ${config.bgColor} border ${config.borderColor} flex items-center justify-center`}>
            <Icon className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${config.color}`} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {WalletDisplay}
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">won</span>
            <span className={`text-xs sm:text-sm font-bold ${config.color}`}>
              ${activity.prizeValueUSD.toFixed(0)}
            </span>
            {isNew && (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-[var(--success)]/10 border border-[var(--success)]/30 text-[8px] sm:text-[9px] text-[var(--success)] font-medium">
                <Sparkles className="w-2 h-2" />
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] sm:text-[10px] ${config.color} opacity-80`}>
              {config.shortLabel}
            </span>
            {activity.lockDuration && (
              <span className="text-[9px] sm:text-[10px] text-[var(--prize-purple)]/70">
                · {activity.lockDuration.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[var(--text-muted)] whitespace-nowrap">
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {getRelativeTime(activity.createdAt)}
        </div>
      </div>
    )
  }

  // Full view - more compact than before
  return (
    <div className={`group relative overflow-hidden rounded-xl transition-all duration-200 ${isNew ? 'ring-1 ring-[var(--success)]/50' : ''}`}>
      {/* Background */}
      <div className={`absolute inset-0 ${config.bgColor} opacity-30`} />

      {/* Border */}
      <div className={`absolute inset-0 rounded-xl border ${config.borderColor}`} />

      {/* Content */}
      <div className="relative flex items-center gap-3 p-3 sm:p-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={avatarDataUrl}
            alt=""
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg"
          />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-md ${config.bgColor} border border-[var(--background)] ${config.borderColor} flex items-center justify-center`}>
            <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${config.color}`} />
          </div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {WalletDisplay}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              <Icon className="w-2.5 h-2.5" />
              {config.shortLabel}
            </span>
            {isNew && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--success)]/10 border border-[var(--success)]/30 text-[10px] text-[var(--success)] font-medium">
                <Sparkles className="w-2.5 h-2.5" />
                NEW
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[var(--text-secondary)] text-xs">Won</span>
            <span className={`text-base sm:text-lg font-bold ${config.color}`}>
              {activity.prizeAmount.toLocaleString()}
            </span>
            <span className={`text-xs ${config.color} opacity-80`}>VICT</span>
            <span className="text-xs text-[var(--text-muted)]">
              (${activity.prizeValueUSD.toFixed(2)})
            </span>
          </div>

          {activity.lockDuration && (
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs text-[var(--prize-purple)]">
              <Lock className="w-2.5 h-2.5" />
              <span>Locked {activity.lockDuration.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--background)]/50 text-[10px] sm:text-xs text-[var(--text-muted)] flex-shrink-0">
          <Clock className="w-3 h-3" />
          {getRelativeTime(activity.createdAt)}
        </div>
      </div>
    </div>
  )
}
