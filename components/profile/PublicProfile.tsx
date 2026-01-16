'use client'

import { Trophy, Zap, Users, Flame, Calendar, Clock } from 'lucide-react'
import { BADGE_TIER_COLORS } from '@/constants/badges'
import type { PublicProfileData } from '@/types/profile'

interface PublicProfileProps {
  profile: PublicProfileData
}

export function PublicProfile({ profile }: PublicProfileProps) {
  const { stats, badges } = profile

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f1218] to-[#0a0c10] border border-white/[0.08] overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-accent/20 via-purple-500/20 to-yellow-500/20" />

        {/* Profile Info */}
        <div className="px-6 pb-6 -mt-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center text-3xl mb-4 border-4 border-[#0a0c10] shadow-lg">
            🎮
          </div>

          {/* Name & Bio */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              {profile.displayName || profile.walletShort}
            </h1>
            {profile.bio && (
              <p className="text-text-secondary">{profile.bio}</p>
            )}
            <p className="text-sm text-text-muted mt-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Member since {formatDate(stats.memberSince)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Zap className="w-4 h-4" />}
              label="Total Spins"
              value={stats.totalSpins.toLocaleString()}
              color="accent"
            />
            <StatCard
              icon={<Trophy className="w-4 h-4" />}
              label="Total Won"
              value={`$${stats.totalWinsUSD.toLocaleString()}`}
              color="yellow"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Referrals"
              value={stats.totalReferred.toLocaleString()}
              color="purple"
            />
            <StatCard
              icon={<Flame className="w-4 h-4" />}
              label="Best Streak"
              value={`${stats.longestStreak} days`}
              color="red"
            />
          </div>

          {/* Featured Badges */}
          {badges.featured.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Featured Badges ({badges.total})
              </h3>
              <div className="flex flex-wrap gap-3">
                {badges.featured.map((ub) => {
                  const badge = ub.badge
                  if (!badge) return null
                  const colors = BADGE_TIER_COLORS[badge.tier]

                  return (
                    <div
                      key={ub._id}
                      className={`
                        px-3 py-2 rounded-xl flex items-center gap-2
                        ${colors.bg} ${colors.border} border
                      `}
                      title={badge.description}
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <span className={`text-sm font-medium ${colors.text}`}>
                        {badge.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Active */}
      <div className="text-center mt-4 text-xs text-text-muted flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" />
        Last active {formatDate(stats.lastActive)}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    accent: { bg: 'bg-accent/10', text: 'text-accent' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  }

  const c = colorClasses[color]

  return (
    <div className={`p-3 rounded-xl ${c.bg}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${c.text}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}
