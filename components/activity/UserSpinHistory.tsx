'use client'

import { useState, useEffect, useRef } from 'react'
import { ExternalLink, Trophy, Lock, Coins, History, X, Clock, CheckCircle2, Loader2, Zap, Gift, Sparkles } from 'lucide-react'
import { Pagination, PaginationInfo, EmptyState } from '@/components/ui'

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

const prizeIcons = {
  liquid_victory: { Icon: Coins, color: 'text-yellow-500' },
  locked_victory: { Icon: Lock, color: 'text-purple-400' },
  suitrump: { Icon: Trophy, color: 'text-red-400' },
  no_prize: { Icon: X, color: 'text-gray-500' },
}

const lockLabels: Record<string, string> = {
  '1_week': '1W',
  '3_month': '3M',
  '1_year': '1Y',
  '3_year': '3Y',
}

export default function UserSpinHistory() {
  const [spins, setSpins] = useState<Spin[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<string>('')

  const fetchHistory = async (targetPage: number, targetFilter: string) => {
    const fetchKey = `${targetPage}-${targetFilter}`
    if (fetchingRef.current || lastFetchRef.current === fetchKey) return

    fetchingRef.current = true
    lastFetchRef.current = fetchKey
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
        filter: targetFilter,
      })
      const res = await fetch(`/api/spin/history?${params}`)
      const data = await res.json()

      if (data.success) {
        setSpins(data.data?.spins || [])
        if (data.data?.stats) setStats(data.data.stats)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchHistory(1, 'all')
  }, [])

  const handleFilterChange = (newFilter: string) => {
    if (newFilter === filter) return
    setFilter(newFilter)
    setPage(1)
    lastFetchRef.current = ''
    fetchHistory(1, newFilter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return
    setPage(newPage)
    lastFetchRef.current = ''
    fetchHistory(newPage, filter)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'wins', label: 'Wins' },
    { value: 'no_prize', label: 'No Win' },
  ]

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      {stats && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-muted">
            <span className="text-white font-semibold">{stats.totalSpins}</span> spins
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-green-400 font-semibold">{stats.totalWins}</span> wins
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-yellow-400 font-semibold">${stats.totalWinningsUSD.toFixed(0)}</span> won
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-accent font-semibold">{stats.winRate}%</span> rate
          </span>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === f.value
                ? 'bg-accent text-black'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Spin List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : spins.length === 0 ? (
        <EmptyState
          title="No spins"
          message={filter !== 'all' ? 'Try another filter' : 'Spin the wheel to start!'}
          icon={History}
        />
      ) : (
        <>
          <div className="space-y-1">
            {spins.map((spin) => {
              const { Icon, color } = prizeIcons[spin.prizeType]
              const isWin = spin.prizeType !== 'no_prize'
              const isPending = spin.status === 'pending' && isWin

              return (
                <div
                  key={spin.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>

                  {/* Prize Info */}
                  <div className="flex-1 min-w-0">
                    {isWin ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold text-white">
                          ${spin.prizeValueUSD.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {spin.prizeAmount >= 1000
                            ? `${(spin.prizeAmount / 1000).toFixed(0)}K`
                            : spin.prizeAmount} VICT
                        </span>
                        {spin.lockDuration && (
                          <span className="text-[10px] text-purple-400">
                            {lockLabels[spin.lockDuration]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">No prize</span>
                    )}
                  </div>

                  {/* Status & Time */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isWin && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        isPending ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {isPending ? (
                          <><Clock className="w-2.5 h-2.5" /> Pending</>
                        ) : (
                          <><CheckCircle2 className="w-2.5 h-2.5" /> Sent</>
                        )}
                      </span>
                    )}

                    <span className="text-[10px] text-text-muted w-8 text-right">
                      {formatTime(spin.createdAt)}
                    </span>

                    {spin.distributedTxHash && (
                      <a
                        href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'}/tx/${spin.distributedTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-accent/60 hover:text-accent hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
