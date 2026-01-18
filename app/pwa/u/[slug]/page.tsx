'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import { registerCacheClear } from '@/lib/utils/pwaCacheManager'
import { generateAvatarSVG } from '@/lib/utils/avatar'
import {
  ChevronLeft,
  User,
  Trophy,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  CircleDot,
  History,
  Search,
  Settings,
  Calendar,
  Flame,
  Zap,
  Medal,
  ChevronDown,
  Gift,
  Lock,
  Coins,
  Award,
} from 'lucide-react'

interface Badge {
  id: string
  name: string
  description: string
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary' | 'special'
  icon: string
  earnedAt: string
}

interface Spin {
  id: string
  prizeType: string
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: number | null
  status: string
  createdAt: string
}

interface SpinHistory {
  spins: Spin[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UserProfile {
  wallet: string
  slug: string | null
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number
  longestStreak: number
  currentStreak: number
  joinedAt: string
  badges: Badge[]
  spinHistory: SpinHistory | null
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'bg-orange-900/20', border: 'border-orange-600/40', text: 'text-orange-400' },
  silver: { bg: 'bg-gray-600/20', border: 'border-gray-400/40', text: 'text-gray-300' },
  gold: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/40', text: 'text-yellow-400' },
  diamond: { bg: 'bg-cyan-900/20', border: 'border-cyan-400/40', text: 'text-cyan-300' },
  legendary: { bg: 'bg-purple-900/20', border: 'border-purple-400/40', text: 'text-purple-300' },
  special: { bg: 'bg-pink-900/20', border: 'border-pink-400/40', text: 'text-pink-300' },
}

const PRIZE_ICONS: Record<string, React.ReactNode> = {
  VICT: <Coins className="w-3.5 h-3.5 text-yellow-400" />,
  SUITRUMP: <Gift className="w-3.5 h-3.5 text-purple-400" />,
  VICT_LOCKED: <Lock className="w-3.5 h-3.5 text-cyan-400" />,
  NOTHING: <CircleDot className="w-3.5 h-3.5 text-gray-500" />,
}

// Profile cache (60 seconds, keyed by slug)
const profileCache: Map<string, { data: UserProfile; timestamp: number }> = new Map()
const PROFILE_CACHE_DURATION = 60 * 1000

// Clear cache function
function clearProfileCache() {
  profileCache.clear()
}

// Register with cache manager
registerCacheClear(clearProfileCache)

export default function PWAUserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false) // Separate flag for dedup
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const slug = params.slug as string

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Fetch user profile
  useEffect(() => {
    if (mounted && isAuthenticated && slug) {
      fetchProfile(true)
    }
  }, [mounted, isAuthenticated, slug])

  const fetchProfile = async (includeHistory: boolean = false, force: boolean = false) => {
    // Check cache first (only for initial load with history)
    if (includeHistory && !force) {
      const cached = profileCache.get(slug)
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
        setProfile(cached.data)
        setLoading(false)
        return
      }
    }

    // Prevent duplicate calls
    if (fetching && includeHistory) return
    if (includeHistory) setFetching(true)

    if (!includeHistory) {
      setLoadingHistory(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const historyParams = `?history=true&page=${includeHistory ? 1 : historyPage}&limit=10`
      const res = await pwaFetch(`/api/users/${encodeURIComponent(slug)}${historyParams}`)
      const data = await res.json()

      if (data.success) {
        setProfile(data.data)
        // Update cache
        if (includeHistory) {
          profileCache.set(slug, { data: data.data, timestamp: Date.now() })
        }
      } else {
        setError(data.error || 'User not found')
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('Failed to load profile')
    }

    setLoading(false)
    setLoadingHistory(false)
    if (includeHistory) setFetching(false)
  }

  const loadMoreHistory = useCallback(async () => {
    if (!profile?.spinHistory || loadingHistory) return

    const nextPage = historyPage + 1
    if (nextPage > profile.spinHistory.pagination.totalPages) return

    setLoadingHistory(true)

    try {
      const res = await pwaFetch(`/api/users/${encodeURIComponent(slug)}?history=true&page=${nextPage}&limit=10`)
      const data = await res.json()

      if (data.success && data.data.spinHistory) {
        setProfile(prev => {
          if (!prev) return prev
          return {
            ...prev,
            spinHistory: {
              spins: [...(prev.spinHistory?.spins || []), ...data.data.spinHistory.spins],
              pagination: data.data.spinHistory.pagination,
            },
          }
        })
        setHistoryPage(nextPage)
      }
    } catch (err) {
      console.error('Load more error:', err)
    }

    setLoadingHistory(false)
  }, [profile, historyPage, loadingHistory, slug])

  const formatWallet = (w: string) => {
    return `${w.slice(0, 6)}...${w.slice(-4)}`
  }

  const copyWallet = () => {
    if (profile?.wallet) {
      navigator.clipboard.writeText(profile.wallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  const formatSpinDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPrizeLabel = (spin: Spin) => {
    if (spin.prizeType === 'NOTHING') return 'No Prize'
    if (spin.prizeType === 'VICT_LOCKED') return `${spin.prizeAmount} VICT (${spin.lockDuration}d Lock)`
    return `${spin.prizeAmount} ${spin.prizeType}`
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed' || status === 'distributed') return 'text-green-400'
    if (status === 'pending') return 'text-yellow-400'
    return 'text-gray-400'
  }

  // Format large numbers compactly to prevent overflow
  const formatCompact = (value: number, prefix = '') => {
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 10000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`
    }
    if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`
    }
    return `${prefix}${value.toLocaleString()}`
  }

  if (!mounted) return null

  // Generate avatar
  const avatarSvg = profile ? generateAvatarSVG(profile.wallet, 80) : ''
  const avatarDataUrl = avatarSvg ? `data:image/svg+xml;base64,${btoa(avatarSvg)}` : ''

  // Badges to show
  const visibleBadges = showAllBadges ? profile?.badges : profile?.badges?.slice(0, 4)

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Player Profile</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <User className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-white font-medium mb-2">User Not Found</p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <Link
            href="/pwa/search"
            className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium"
          >
            Search Users
          </Link>
        </div>
      ) : profile ? (
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-surface via-surface to-accent/5 rounded-2xl border border-border p-6 text-center relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />

            {/* Avatar */}
            <div className="relative mx-auto mb-4 w-20 h-20">
              <img
                src={avatarDataUrl}
                alt=""
                className="w-20 h-20 rounded-2xl border-2 border-accent/30 shadow-lg shadow-accent/20"
              />
              {profile.currentStreak > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1 border-2 border-background">
                  <Flame className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Name */}
            {profile.slug ? (
              <h2 className="text-xl font-bold text-white mb-1">@{profile.slug}</h2>
            ) : (
              <h2 className="text-xl font-bold text-white mb-1 font-mono">
                {formatWallet(profile.wallet)}
              </h2>
            )}

            {/* Wallet */}
            <button
              onClick={copyWallet}
              className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors"
            >
              <span className="font-mono">{formatWallet(profile.wallet)}</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Join Date & Streak */}
            <div className="flex items-center justify-center gap-3 text-text-muted text-xs mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(profile.joinedAt)}
              </span>
              {profile.currentStreak > 0 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="w-3 h-3" />
                  {profile.currentStreak} day streak
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-xl border border-border p-3 text-center overflow-hidden">
              <div className="text-xl font-bold text-white mb-1 truncate">
                {formatCompact(profile.totalSpins)}
              </div>
              <div className="text-text-muted text-[10px] flex items-center justify-center gap-1">
                <CircleDot className="w-3 h-3" />
                Total Spins
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-accent/30 p-3 text-center overflow-hidden">
              <div className="text-xl font-bold text-accent mb-1 truncate">
                {formatCompact(profile.totalWinsUSD, '$')}
              </div>
              <div className="text-text-muted text-[10px] flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-accent" />
                Total Won
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-3 text-center overflow-hidden">
              <div className="text-xl font-bold text-yellow-400 mb-1 truncate">
                {formatCompact(profile.biggestWinUSD, '$')}
              </div>
              <div className="text-text-muted text-[10px] flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                Biggest Win
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-3 text-center overflow-hidden">
              <div className="text-xl font-bold text-orange-400 mb-1 truncate">
                {profile.longestStreak}
              </div>
              <div className="text-text-muted text-[10px] flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />
                Best Streak
              </div>
            </div>
          </div>

          {/* Badges Section */}
          {profile.badges && profile.badges.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold text-white">Badges</span>
                  <span className="text-xs text-text-muted">({profile.badges.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {visibleBadges?.map((badge) => {
                  const tierStyle = TIER_COLORS[badge.tier] || TIER_COLORS.bronze
                  return (
                    <div
                      key={badge.id}
                      className={`${tierStyle.bg} border ${tierStyle.border} rounded-lg p-3`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{badge.icon}</span>
                        <span className={`text-xs font-medium ${tierStyle.text}`}>
                          {badge.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted line-clamp-2">
                        {badge.description}
                      </p>
                    </div>
                  )
                })}
              </div>

              {profile.badges.length > 4 && (
                <button
                  onClick={() => setShowAllBadges(!showAllBadges)}
                  className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-text-muted hover:text-white transition-colors"
                >
                  {showAllBadges ? 'Show Less' : `Show All (${profile.badges.length})`}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllBadges ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Spin History Section */}
          {profile.spinHistory && profile.spinHistory.spins.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold text-white">Recent Spins</span>
                  <span className="text-xs text-text-muted">({profile.spinHistory.pagination.total})</span>
                </div>
              </div>

              <div className="space-y-2">
                {profile.spinHistory.spins.map((spin) => (
                  <div
                    key={spin.id}
                    className="flex items-center justify-between p-2 bg-background/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {PRIZE_ICONS[spin.prizeType] || <Gift className="w-3.5 h-3.5 text-gray-400" />}
                      <div>
                        <div className="text-xs text-white font-medium">
                          {getPrizeLabel(spin)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {formatSpinDate(spin.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {spin.prizeValueUSD > 0 && (
                        <div className="text-xs text-accent font-medium">
                          ${spin.prizeValueUSD.toLocaleString()}
                        </div>
                      )}
                      <div className={`text-[10px] capitalize ${getStatusColor(spin.status)}`}>
                        {spin.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {profile.spinHistory.pagination.page < profile.spinHistory.pagination.totalPages && (
                <button
                  onClick={loadMoreHistory}
                  disabled={loadingHistory}
                  className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-xs text-accent hover:text-white border border-accent/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingHistory ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* View on Web */}
          <a
            href={`/u/${profile.slug || profile.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-surface border border-border rounded-xl text-text-secondary text-sm hover:text-white hover:border-accent/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Profile on Web
          </a>
        </div>
      ) : null}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/game" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <CircleDot className="w-5 h-5" />
            <span className="text-[10px] font-medium">Play</span>
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
