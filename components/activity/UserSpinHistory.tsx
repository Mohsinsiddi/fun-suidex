'use client'

import { useState, useCallback, useEffect } from 'react'
import { ExternalLink, Trophy, Lock, Coins, History, X, TrendingUp, Target, Percent } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonListItem, EmptyState } from '@/components/ui'

interface Spin {
  id: string
  spinType: 'free' | 'purchased' | 'bonus'
  prizeType: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: string | null
  status: 'pending' | 'distributed' | 'failed'
  distributedTxHash: string | null
  createdAt: string
}

interface Stats {
  totalSpins: number
  totalWins: number
  winRate: string
  totalWinningsUSD: number
}

const prizeConfig = {
  liquid_victory: {
    label: 'Liquid VICT',
    color: 'text-[var(--prize-liquid)]',
    bgColor: 'bg-[var(--prize-liquid)]/10',
    borderColor: 'border-[var(--prize-liquid)]/30',
    Icon: Coins,
  },
  locked_victory: {
    label: 'Locked VICT',
    color: 'text-[var(--prize-purple)]',
    bgColor: 'bg-[var(--prize-purple)]/10',
    borderColor: 'border-[var(--prize-purple)]/30',
    Icon: Lock,
  },
  suitrump: {
    label: 'SuiTrump',
    color: 'text-[var(--prize-cyan)]',
    bgColor: 'bg-[var(--prize-cyan)]/10',
    borderColor: 'border-[var(--prize-cyan)]/30',
    Icon: Trophy,
  },
  no_prize: {
    label: 'No Prize',
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--card)]',
    borderColor: 'border-[var(--border)]',
    Icon: X,
  },
}

const spinTypeLabels = {
  free: { label: 'Free', color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
  purchased: { label: 'Purchased', color: 'text-[var(--info)]', bg: 'bg-[var(--info)]/10' },
  bonus: { label: 'Bonus', color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10' },
}

export default function UserSpinHistory() {
  const [spins, setSpins] = useState<Spin[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        filter,
      })
      const res = await fetch(`/api/spin/history?${params}`)
      const data = await res.json()
      if (data.success) {
        setSpins(data.data?.spins || [])
        if (data.data?.stats) {
          setStats(data.data.stats)
        }
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filter])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'wins', label: 'Wins' },
    { value: 'no_prize', label: 'No Prize' },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Compact Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <History className="w-3 h-3" />
              <span className="text-[9px] sm:text-[10px]">Spins</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white">{stats.totalSpins}</p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <Trophy className="w-3 h-3" />
              <span className="text-[9px] sm:text-[10px]">Wins</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-[var(--success)]">{stats.totalWins}</p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <Percent className="w-3 h-3" />
              <span className="text-[9px] sm:text-[10px]">Rate</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-[var(--accent)]">{stats.winRate}%</p>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-0.5">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[9px] sm:text-[10px]">Won</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-[var(--prize-liquid)]">${stats.totalWinningsUSD.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Compact Filter Tabs */}
      <div className="flex gap-1 sm:gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md font-medium transition-colors ${
              filter === f.value
                ? 'bg-[var(--accent)] text-black'
                : 'bg-[var(--card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Spin List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : spins.length === 0 ? (
        <EmptyState
          title="No spins found"
          message={filter !== 'all' ? `No spins with filter "${filter}"` : "You haven't made any spins yet. Go spin the wheel!"}
          icon={History}
        />
      ) : (
        <>
          <div className="space-y-1.5 sm:space-y-2">
            {spins.map((spin) => {
              const config = prizeConfig[spin.prizeType]
              const spinType = spinTypeLabels[spin.spinType]
              const Icon = config.Icon

              return (
                <div
                  key={spin.id}
                  className={`p-2.5 sm:p-3 rounded-lg ${config.bgColor} border ${config.borderColor} transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-md ${config.bgColor} border ${config.borderColor} flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs sm:text-sm font-semibold ${config.color}`}>
                            {spin.prizeType === 'no_prize'
                              ? 'No Prize'
                              : `${spin.prizeAmount.toLocaleString()} VICT`}
                          </span>
                          {spin.prizeType !== 'no_prize' && (
                            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                              (${spin.prizeValueUSD.toFixed(2)})
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] ${spinType.bg} ${spinType.color}`}>
                            {spinType.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                            {formatDate(spin.createdAt)}
                          </span>
                          {spin.lockDuration && (
                            <span className="text-[10px] sm:text-xs text-[var(--prize-purple)]">
                              · Locked {spin.lockDuration.replace('_', ' ')}
                            </span>
                          )}
                          {spin.status === 'pending' && spin.prizeType !== 'no_prize' && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30">
                              Pending
                            </span>
                          )}
                          {spin.status === 'distributed' && (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                              Distributed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {spin.distributedTxHash && (
                      <a
                        href={`https://suiscan.xyz/mainnet/tx/${spin.distributedTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-[var(--background)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors flex-shrink-0"
                        title="View Transaction"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
