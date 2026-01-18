'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'
import { generateAvatarSVG } from '@/lib/utils/avatar'
import {
  CircleDot,
  Sparkles,
  Trophy,
  Lock,
  Coins,
  Clock,
  RefreshCw,
  Settings,
  History,
  Search,
  Home,
  ChevronRight,
  Zap,
  TrendingUp,
  Gift,
} from 'lucide-react'

interface Activity {
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

const prizeConfig = {
  liquid_victory: {
    label: 'Liquid VICT',
    shortLabel: 'VICT',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    Icon: Coins,
  },
  locked_victory: {
    label: 'Locked VICT',
    shortLabel: 'Locked',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    Icon: Lock,
  },
  suitrump: {
    label: 'SuiTrump',
    shortLabel: 'TRUMP',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    Icon: TrendingUp,
  },
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d`
}

export default function PWAHomePage() {
  const router = useRouter()
  const { isAuthenticated, purchasedSpins, bonusSpins, totalWinsUSD, fetchUser } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const totalSpins = purchasedSpins + bonusSpins

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Fetch fresh user data and activity feed on mount
  useEffect(() => {
    if (mounted && isAuthenticated) {
      // Always fetch fresh data on page load
      fetchUser()
      fetchActivityFeed()
    }
  }, [mounted, isAuthenticated])

  const fetchActivityFeed = async () => {
    try {
      const res = await fetch('/api/activity?limit=10')
      const data = await res.json()
      if (data.success) {
        setActivities(data.data.activities)
      }
    } catch (err) {
      console.error('Activity feed error:', err)
    }
    setLoadingFeed(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchUser(),
      fetchActivityFeed()
    ])
    setRefreshing(false)
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">SuiDex Games</h1>
            <p className="text-[10px] text-text-muted">Play & Win Rewards</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-text-secondary hover:text-accent transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-surface rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs text-text-muted">Spins</span>
            </div>
            <div className="text-xl font-bold text-white">{totalSpins}</div>
          </div>
          <div className="flex-1 bg-surface rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-text-muted">Won</span>
            </div>
            <div className="text-xl font-bold text-accent">${totalWinsUSD.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Games Section */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Games
          </h2>
        </div>

        {/* Wheel of Victory Game Card */}
        <Link href="/pwa/game" className="block">
          <div className="relative overflow-hidden bg-gradient-to-br from-accent/20 via-surface to-purple-500/20 rounded-2xl border border-accent/30 p-4 group active:scale-[0.98] transition-transform">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4">
              {/* Game Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 flex-shrink-0">
                <CircleDot className="w-7 h-7 text-black" />
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base mb-0.5">Wheel of Victory</h3>
                <p className="text-text-muted text-xs mb-2">Spin to win VICT & SuiTrump</p>

                {/* Prizes Preview */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-yellow-400/10 rounded text-yellow-400 text-[9px] font-medium">Up to $3.5K</span>
                  <span className="px-1.5 py-0.5 bg-purple-400/10 rounded text-purple-400 text-[9px] font-medium">Locked</span>
                  <span className="px-1.5 py-0.5 bg-cyan-400/10 rounded text-cyan-400 text-[9px] font-medium">Trump</span>
                </div>
              </div>

              {/* Play Arrow */}
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <ChevronRight className="w-5 h-5 text-black" />
              </div>
            </div>

            {/* Spins Badge */}
            {totalSpins > 0 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent/20 border border-accent/30 rounded-full">
                <span className="text-accent text-[9px] font-bold">{totalSpins} spins</span>
              </div>
            )}
          </div>
        </Link>

        {/* Coming Soon Games */}
        <div className="mt-3 opacity-50">
          <div className="bg-surface/50 rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <div className="w-11 h-11 bg-border/50 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-text-muted" />
            </div>
            <div className="flex-1">
              <h3 className="text-text-muted font-medium text-sm">More Games</h3>
              <p className="text-text-muted/60 text-xs">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed Section */}
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Live Wins
          </h2>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          {loadingFeed ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl border border-border p-2.5 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-border rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3 bg-border rounded w-20 mb-1.5" />
                    <div className="h-2 bg-border rounded w-14" />
                  </div>
                  <div className="h-3 bg-border rounded w-10" />
                </div>
              </div>
            ))
          ) : activities.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => {
              const config = prizeConfig[activity.prizeType]
              const Icon = config.Icon
              const avatarSvg = generateAvatarSVG(activity.wallet, 28)
              const avatarDataUrl = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(avatarSvg) : ''}`

              return (
                <div
                  key={activity.id}
                  className="bg-surface rounded-xl border border-border p-2.5 flex items-center gap-2.5"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {mounted && (
                      <img
                        src={avatarDataUrl}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                      />
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded ${config.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-2 h-2 ${config.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[11px] text-white">{activity.walletShort}</span>
                      <span className="text-[9px] text-text-muted">won</span>
                      <span className={`text-[11px] font-bold ${config.color}`}>
                        ${activity.prizeValueUSD.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-[9px] text-text-muted">
                      {config.shortLabel}
                      {activity.lockDuration && ` · ${activity.lockDuration.replace('_', ' ')}`}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-0.5 text-[9px] text-text-muted">
                    <Clock className="w-2.5 h-2.5" />
                    {getRelativeTime(activity.createdAt)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/home" className="flex flex-col items-center gap-1 py-1 px-3 text-accent">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>
          <Link href="/pwa/settings" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
