'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import { generateAvatarSVG } from '@/lib/utils/avatar'
import {
  Search,
  ChevronLeft,
  User,
  Trophy,
  X,
  Loader2,
  Home,
  History,
  Settings,
  Crown,
  Flame,
  Medal,
  CircleDot,
} from 'lucide-react'

interface UserResult {
  wallet: string
  slug: string | null
  totalSpins: number
  totalWinsUSD: number
}

interface LeaderboardEntry {
  rank: number
  wallet: string
  displayWallet: string
  displayName: string | null
  value: number
  totalSpins: number
  totalWinsUSD: number
  profileSlug: string | null
  hasProfile: boolean
}

// Simple cache for leaderboard data (60 seconds)
let leaderboardCache: { data: LeaderboardEntry[]; timestamp: number } | null = null
const CACHE_DURATION = 60 * 1000

export default function PWASearchPage() {
  const router = useRouter()
  const { isAuthenticated } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Fetch leaderboard on mount (with cache)
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchLeaderboard()
    }
  }, [mounted, isAuthenticated])

  const fetchLeaderboard = async (force = false) => {
    // Use cache if fresh
    if (!force && leaderboardCache && Date.now() - leaderboardCache.timestamp < CACHE_DURATION) {
      setLeaderboard(leaderboardCache.data)
      setLoadingLeaderboard(false)
      return
    }

    try {
      const res = await pwaFetch('/api/leaderboard?type=spins&limit=20')
      const data = await res.json()
      if (data.success) {
        const entries = data.data.entries || []
        setLeaderboard(entries)
        // Update cache
        leaderboardCache = { data: entries, timestamp: Date.now() }
      }
    } catch (err) {
      console.error('Leaderboard error:', err)
    }
    setLoadingLeaderboard(false)
  }

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await pwaFetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.success) {
        setResults(data.data.users || [])
      } else {
        setError(data.error || 'Search failed')
        setResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search users')
      setResults([])
    }

    setLoading(false)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
  }

  const formatWallet = (w: string) => {
    return `${w.slice(0, 6)}...${w.slice(-4)}`
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
    return <span className="text-text-muted text-xs font-mono">#{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30'
    if (rank === 2) return 'bg-gray-400/10 border-gray-400/30'
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/30'
    return 'bg-surface border-border'
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/pwa/home" className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-accent" />
          Search & Leaderboard
        </h1>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search username or wallet..."
          className="w-full bg-[#0a0c10] border-2 border-border rounded-xl px-4 py-3 pl-10 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-accent"
          autoComplete="off"
          spellCheck={false}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Button (only show if query exists) */}
      {query.trim().length >= 2 && (
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-3 bg-accent text-black rounded-xl font-medium text-sm mb-4 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searched && !loading && (
        <div className="mb-6">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-surface rounded-xl border border-border">
              <User className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-white font-medium mb-1">No users found</p>
              <p className="text-text-muted text-sm">Try a different search</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-text-muted text-xs mb-2">
                Found {results.length} user{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((user) => {
                const avatarSvg = generateAvatarSVG(user.wallet, 40)
                const avatarDataUrl = `data:image/svg+xml;base64,${btoa(avatarSvg)}`

                return (
                  <Link
                    key={user.wallet}
                    href={`/pwa/u/${user.slug || user.wallet}`}
                    className="block bg-surface rounded-xl border border-border p-3 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={avatarDataUrl} alt="" className="w-10 h-10 rounded-xl" />
                      <div className="flex-1 min-w-0">
                        {user.slug ? (
                          <span className="text-white font-medium text-sm truncate block">@{user.slug}</span>
                        ) : (
                          <span className="text-white font-mono text-sm">{formatWallet(user.wallet)}</span>
                        )}
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span>{user.totalSpins} spins</span>
                          <span className="text-accent">${user.totalWinsUSD.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Top 20 Spinners Leaderboard */}
      {!searched && (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-sm font-bold text-white">Top 20 Spinners</h2>
          </div>

          {loadingLeaderboard ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-surface rounded-xl border border-border p-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-border rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-border rounded w-24 mb-2" />
                      <div className="h-3 bg-border rounded w-16" />
                    </div>
                    <div className="h-4 bg-border rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-surface rounded-xl border border-border">
              <Trophy className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-text-muted text-sm">No leaderboard data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const avatarSvg = generateAvatarSVG(entry.wallet, 40)
                const avatarDataUrl = `data:image/svg+xml;base64,${btoa(avatarSvg)}`

                return (
                  <Link
                    key={entry.wallet}
                    href={`/pwa/u/${entry.profileSlug || entry.wallet}`}
                    className={`block rounded-xl border p-3 transition-colors hover:border-accent/50 ${getRankBg(entry.rank)}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-7 flex items-center justify-center">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <img src={avatarDataUrl} alt="" className="w-10 h-10 rounded-xl" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {entry.displayName ? (
                          <span className="text-white font-medium text-sm truncate block">{entry.displayName}</span>
                        ) : entry.profileSlug ? (
                          <span className="text-white font-medium text-sm truncate block">@{entry.profileSlug}</span>
                        ) : (
                          <span className="text-white font-mono text-sm">{entry.displayWallet}</span>
                        )}
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <CircleDot className="w-3 h-3" />
                          <span>{entry.value.toLocaleString()} spins</span>
                        </div>
                      </div>

                      {/* Wins */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-accent text-sm font-bold">
                          <Trophy className="w-3.5 h-3.5" />
                          ${entry.totalWinsUSD?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/home" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-accent">
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
