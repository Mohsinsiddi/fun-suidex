'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Activity, Radio, ChevronRight, Zap, TrendingUp, Trophy } from 'lucide-react'
import ActivityItem, { type Activity as ActivityType } from './ActivityItem'
import { SkeletonListItem } from '@/components/ui'

interface LiveActivityFeedProps {
  limit?: number
  compact?: boolean
  showHeader?: boolean
  showViewAll?: boolean
  showStats?: boolean
  className?: string
}

interface ActivityResponse {
  success: boolean
  data: {
    activities: ActivityType[]
    lastUpdated: string
  }
}

export default function LiveActivityFeed({
  limit = 10,
  compact = false,
  showHeader = true,
  showViewAll = true,
  showStats = true,
  className = '',
}: LiveActivityFeedProps) {
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set())
  const previousIdsRef = useRef<Set<string>>(new Set())
  const [countdown, setCountdown] = useState(10)

  const { data, isLoading, error, dataUpdatedAt, isFetching } = useQuery<ActivityResponse>({
    queryKey: ['activity', limit],
    queryFn: async () => {
      const res = await fetch(`/api/activity?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      return res.json()
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  })

  // Countdown timer for next refresh
  useEffect(() => {
    if (!dataUpdatedAt) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - dataUpdatedAt) / 1000)
      const remaining = Math.max(0, 10 - elapsed)
      setCountdown(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [dataUpdatedAt])

  // Track new activities for animations
  useEffect(() => {
    if (data?.data?.activities) {
      const currentIds = new Set(data.data.activities.map((a) => a.id))
      const newIds = new Set<string>()

      currentIds.forEach((id) => {
        if (!previousIdsRef.current.has(id)) {
          newIds.add(id)
        }
      })

      if (previousIdsRef.current.size > 0 && newIds.size > 0) {
        setNewActivityIds(newIds)
        setTimeout(() => setNewActivityIds(new Set()), 1500)
      }

      previousIdsRef.current = currentIds
    }
  }, [data])

  const activities = data?.data?.activities || []

  // Calculate stats
  const stats = {
    totalValue: activities.reduce((sum, a) => sum + a.prizeValueUSD, 0),
    topWin: Math.max(...activities.map((a) => a.prizeValueUSD), 0),
    winCount: activities.length,
  }

  return (
    <div className={className}>
      {/* Compact Header */}
      {showHeader && (
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)]" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success)] border border-[var(--background)]"></span>
              </span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Live Wins
                <span className="px-1.5 py-0.5 rounded bg-[var(--success)]/10 border border-[var(--success)]/30 text-[9px] sm:text-[10px] font-medium text-[var(--success)] uppercase tracking-wide">
                  Live
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                {isFetching ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
                    Updating...
                  </span>
                ) : (
                  <span>Refreshing in {countdown}s</span>
                )}
              </p>
            </div>
          </div>
          {showViewAll && (
            <Link
              href="/activity"
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-all"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* Compact Stats Bar */}
      {showStats && activities.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <Zap className="w-3 h-3 text-[var(--warning)]" />
              <span className="text-[9px] sm:text-[10px]">Wins</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white">{stats.winCount}</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <TrendingUp className="w-3 h-3 text-[var(--success)]" />
              <span className="text-[9px] sm:text-[10px]">Total</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-[var(--success)]">${stats.totalValue.toFixed(0)}</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <Trophy className="w-3 h-3 text-[var(--accent)]" />
              <span className="text-[9px] sm:text-[10px]">Top</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-[var(--accent)]">${stats.topWin.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Live Feed Indicator */}
      <div className="flex items-center justify-between gap-2 mb-3 px-2.5 py-1.5 rounded-lg bg-[var(--success)]/5 border border-[var(--success)]/20">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[var(--success)] animate-pulse" />
          <span className="text-[10px] sm:text-xs text-[var(--success)] font-semibold">LIVE FEED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Auto-refresh</span>
          <div className="w-6 sm:w-8 h-1 rounded-full bg-[var(--success)]/20 overflow-hidden">
            <div
              className="h-full bg-[var(--success)] rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-xs text-center">
          <p className="font-medium">Connection issue</p>
          <p className="text-[10px] opacity-70 mt-0.5">Will retry automatically...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
          </div>
          <p className="text-sm font-medium text-white mb-0.5">No wins yet</p>
          <p className="text-xs text-[var(--text-muted)]">Be the first to spin and win!</p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`transition-all duration-500 ${
                newActivityIds.has(activity.id)
                  ? 'animate-slideIn'
                  : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ActivityItem activity={activity} compact={compact} isNew={newActivityIds.has(activity.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
