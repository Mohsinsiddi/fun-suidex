'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { WalletAvatar } from '@/components/shared/WalletAvatar'
import {
  Trophy,
  Target,
  Flame,
  Users,
  Sparkles,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  ExternalLink,
} from 'lucide-react'

type LeaderboardType = 'spins' | 'wins' | 'streak' | 'referrals' | 'biggestWin'

interface LeaderboardEntry {
  rank: number
  wallet: string
  displayWallet: string
  value: number
  totalSpins?: number
  profileSlug?: string | null
  hasProfile: boolean
}

interface LeaderboardData {
  type: LeaderboardType
  label: string
  entries: LeaderboardEntry[]
  topThree: LeaderboardEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const TABS: { type: LeaderboardType; label: string; icon: React.ReactNode }[] = [
  { type: 'spins', label: 'Top Spinners', icon: <Target className="w-4 h-4" /> },
  { type: 'wins', label: 'Top Winners', icon: <Sparkles className="w-4 h-4" /> },
  { type: 'biggestWin', label: 'Biggest Wins', icon: <Trophy className="w-4 h-4" /> },
  { type: 'streak', label: 'Best Streaks', icon: <Flame className="w-4 h-4" /> },
  { type: 'referrals', label: 'Top Referrers', icon: <Users className="w-4 h-4" /> },
]

const formatValue = (type: LeaderboardType, value: number): string => {
  if (type === 'wins' || type === 'biggestWin') {
    return `$${value.toFixed(2)}`
  }
  return value.toLocaleString()
}

// Enhanced rank styling
const getRankBadge = (rank: number) => {
  if (rank === 1) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full animate-pulse" />
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <Crown className="w-4 h-4 text-yellow-900" />
        </div>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/20">
        <Medal className="w-4 h-4 text-gray-600" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/20">
        <Medal className="w-4 h-4 text-amber-900" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
      <span className="text-xs font-mono text-text-muted">#{rank}</span>
    </div>
  )
}

const getRankStyle = (rank: number) => {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-l-4 border-l-yellow-400'
  if (rank === 2) return 'bg-gradient-to-r from-gray-400/10 via-gray-400/5 to-transparent border-l-4 border-l-gray-400'
  if (rank === 3) return 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-l-amber-500'
  return 'hover:bg-surface/50'
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('spins')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchLeaderboard()
  }, [activeTab, page])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?type=${activeTab}&page=${page}&limit=25`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (type: LeaderboardType) => {
    setActiveTab(type)
    setPage(1)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 p-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Back to Home
          </Link>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30">
                <Trophy size={32} className="text-yellow-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-text-secondary">See who's winning big on SuiDex Games</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => handleTabChange(tab.type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.type
                    ? 'bg-accent text-black'
                    : 'bg-surface border border-border text-text-secondary hover:text-white hover:border-accent/50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : data ? (
            <>
              {/* Enhanced Top 3 Podium */}
              {data.topThree.length >= 3 && page === 1 && (
                <div className="mb-8">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center">
                      <div className="w-full p-4 pb-6 rounded-2xl bg-gradient-to-b from-gray-400/20 to-gray-500/5 border border-gray-400/30 text-center relative overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

                        <div className="relative">
                          {/* Avatar */}
                          <div className="mx-auto mb-3 relative">
                            <div className="absolute -inset-1 bg-gray-400/30 blur-md rounded-xl" />
                            <WalletAvatar
                              wallet={data.topThree[1].wallet}
                              size={56}
                              className="relative border-2 border-gray-400/50"
                            />
                          </div>

                          {/* Medal */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 flex items-center justify-center mx-auto mb-2 shadow-lg">
                            <span className="text-lg font-bold text-gray-700">2</span>
                          </div>

                          {/* Wallet */}
                          {data.topThree[1].hasProfile ? (
                            <Link
                              href={`/u/${data.topThree[1].profileSlug}`}
                              className="text-xs text-text-secondary hover:text-white truncate block mb-2 hover:underline"
                            >
                              {data.topThree[1].displayWallet}
                            </Link>
                          ) : (
                            <p className="text-xs text-text-secondary truncate mb-2">
                              {data.topThree[1].displayWallet}
                            </p>
                          )}

                          {/* Value */}
                          <p className="text-xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
                            {formatValue(activeTab, data.topThree[1].value)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center -mt-6">
                      <div className="w-full p-4 pb-6 rounded-2xl bg-gradient-to-b from-yellow-400/20 to-amber-500/5 border border-yellow-500/40 text-center relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-yellow-500/20 blur-3xl rounded-full" />

                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent -translate-x-full animate-shimmer" />

                        <div className="relative">
                          {/* Crown */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                            <Crown className="w-6 h-6 text-yellow-400 animate-bounce" />
                          </div>

                          {/* Avatar */}
                          <div className="mx-auto mb-3 mt-4 relative">
                            <div className="absolute -inset-2 bg-yellow-400/40 blur-lg rounded-xl animate-pulse" />
                            <WalletAvatar
                              wallet={data.topThree[0].wallet}
                              size={72}
                              className="relative border-2 border-yellow-400/50"
                            />
                          </div>

                          {/* Medal */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-yellow-500/30">
                            <span className="text-xl font-bold text-yellow-900">1</span>
                          </div>

                          {/* Wallet */}
                          {data.topThree[0].hasProfile ? (
                            <Link
                              href={`/u/${data.topThree[0].profileSlug}`}
                              className="text-sm text-text-secondary hover:text-yellow-400 truncate block mb-2 hover:underline"
                            >
                              {data.topThree[0].displayWallet}
                            </Link>
                          ) : (
                            <p className="text-sm text-text-secondary truncate mb-2">
                              {data.topThree[0].displayWallet}
                            </p>
                          )}

                          {/* Value */}
                          <p className="text-2xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                            {formatValue(activeTab, data.topThree[0].value)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center">
                      <div className="w-full p-4 pb-6 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-center relative overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/5 to-transparent -translate-x-full animate-shimmer" />

                        <div className="relative">
                          {/* Avatar */}
                          <div className="mx-auto mb-3 relative">
                            <div className="absolute -inset-1 bg-amber-500/30 blur-md rounded-xl" />
                            <WalletAvatar
                              wallet={data.topThree[2].wallet}
                              size={56}
                              className="relative border-2 border-amber-500/50"
                            />
                          </div>

                          {/* Medal */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-2 shadow-lg">
                            <span className="text-lg font-bold text-amber-900">3</span>
                          </div>

                          {/* Wallet */}
                          {data.topThree[2].hasProfile ? (
                            <Link
                              href={`/u/${data.topThree[2].profileSlug}`}
                              className="text-xs text-text-secondary hover:text-white truncate block mb-2 hover:underline"
                            >
                              {data.topThree[2].displayWallet}
                            </Link>
                          ) : (
                            <p className="text-xs text-text-secondary truncate mb-2">
                              {data.topThree[2].displayWallet}
                            </p>
                          )}

                          {/* Value */}
                          <p className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                            {formatValue(activeTab, data.topThree[2].value)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-bold text-white">{data.label}</h2>
                  <p className="text-sm text-text-secondary">
                    {data.pagination.total.toLocaleString()} players ranked
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {data.entries.map((entry) => (
                    <div
                      key={`${entry.wallet}-${entry.rank}`}
                      className={`flex items-center justify-between p-4 transition-colors ${getRankStyle(entry.rank)}`}
                    >
                      <div className="flex items-center gap-4">
                        {getRankBadge(entry.rank)}

                        {/* Avatar */}
                        <WalletAvatar wallet={entry.wallet} size={36} />

                        <div>
                          {entry.hasProfile ? (
                            <Link
                              href={`/u/${entry.profileSlug}`}
                              className="font-medium text-white hover:text-accent transition-colors flex items-center gap-1"
                            >
                              {entry.displayWallet}
                              <ExternalLink className="w-3 h-3 text-text-muted" />
                            </Link>
                          ) : (
                            <p className="font-medium text-white">{entry.displayWallet}</p>
                          )}
                          {entry.totalSpins !== undefined && activeTab !== 'spins' && (
                            <p className="text-xs text-text-muted">
                              {entry.totalSpins.toLocaleString()} spins
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            entry.rank === 1
                              ? 'text-yellow-400'
                              : entry.rank === 2
                                ? 'text-gray-300'
                                : entry.rank === 3
                                  ? 'text-amber-500'
                                  : 'text-white'
                          }`}
                        >
                          {formatValue(activeTab, entry.value)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {data.entries.length === 0 && (
                    <div className="p-8 text-center text-text-muted">
                      No entries yet. Be the first!
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!data.pagination.hasPrev}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent/50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>
                    <span className="text-sm text-text-secondary">
                      Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.pagination.hasNext}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent/50 transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-text-muted">Failed to load leaderboard</div>
          )}
        </div>
      </main>

      <Footer />

      {/* Add shimmer animation to global styles */}
      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}
