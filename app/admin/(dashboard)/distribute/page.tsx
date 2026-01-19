'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Gift, DollarSign, Check, ExternalLink, Search, X } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, SkeletonCardGrid, EmptyState } from '@/components/ui'
import { useDistributeStore, type PendingPrize } from '@/lib/stores/admin'


export default function AdminDistributePage() {
  const router = useRouter()
  const {
    items: prizes,
    page,
    totalPages,
    total,
    isLoading: loading,
    error,
    fetch: fetchPrizes,
    setPage,
    refresh,
    removeItem,
    setFilters,
    filters
  } = useDistributeStore()

  const [processing, setProcessing] = useState<string | null>(null)
  const limit = 20

  // Search input state
  const [searchInput, setSearchInput] = useState('')

  // Fetch on mount
  useEffect(() => {
    fetchPrizes(1)
  }, [])

  // Handle unauthorized
  useEffect(() => {
    if (error === 'Unauthorized') {
      router.push('/admin/login')
    }
  }, [error, router])

  const handleRefresh = () => {
    refresh()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // Get active wallet filter from store
  const activeFilter = filters.wallet || ''

  const handleSearch = () => {
    if (searchInput.trim()) {
      setFilters({ wallet: searchInput.trim() })
    }
  }

  const handleClearFilter = () => {
    setSearchInput('')
    setFilters({})
  }

  const handleDistribute = async (spinId: string, txHash: string) => {
    if (!txHash) return
    setProcessing(spinId)
    try {
      const res = await fetch('/api/admin/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinId, txHash }),
      })
      const data = await res.json()
      if (data.success) removeItem(spinId)
    } catch (err) { console.error(err) }
    setProcessing(null)
  }

  const getPrizeTypeLabel = (type: string) => {
    switch (type) {
      case 'liquid_victory': return 'Liquid VICT'
      case 'locked_victory': return 'Locked VICT'
      case 'suitrump': return 'SuiTrump'
      default: return type
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Prize Distribution</h2>
          <p className="text-text-secondary text-sm sm:text-base">Distribute pending prizes to winners</p>
        </div>
        <button onClick={handleRefresh} disabled={loading} className="btn btn-ghost self-start sm:self-auto text-sm sm:text-base">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Wallet Search */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter wallet address to search..."
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchInput.trim()}
            className="btn btn-primary text-sm px-6 disabled:opacity-50"
          >
            Search
          </button>
          {activeFilter && (
            <button
              onClick={handleClearFilter}
              className="btn btn-ghost text-sm px-4"
            >
              Clear
            </button>
          )}
        </div>

        {/* Active Filter Status */}
        {activeFilter && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
            <Search className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm">
              Showing prizes for: <strong className="text-[var(--accent)] font-mono">{activeFilter}</strong>
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              ({total} found)
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      {loading && prizes.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <SkeletonCardGrid count={3} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Pending Prizes</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--warning)]">{total}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex-shrink-0"><Gift className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
          </div>
          <div className="card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Total Value (USD)</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--success)]">${prizes.reduce((s, p) => s + p.prizeValueUSD, 0).toFixed(0)}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-[var(--success)]/10 text-[var(--success)] flex-shrink-0"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
          </div>
          <div className="card p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Total VICT</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--accent)] truncate">{prizes.filter(p => p.prizeType !== 'suitrump').reduce((s, p) => s + p.prizeAmount, 0).toLocaleString()}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0"><Gift className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Prizes Table */}
      <div className="card">
        <div className="p-3 sm:p-4 border-b border-[var(--border)]">
          <h3 className="text-base sm:text-lg font-semibold">Pending Prizes</h3>
        </div>
        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : prizes.length === 0 ? (
          <EmptyState
            title={activeFilter ? "No matching prizes" : "No pending prizes"}
            message={activeFilter ? "No pending prizes found for this wallet address." : "All prizes have been distributed! 🎉"}
            icon={Gift}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Wallet</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Type</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Amount</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Value</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Lock</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Date</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prizes.map((prize) => (
                    <tr key={prize._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-mono text-xs sm:text-sm">{prize.wallet.slice(0, 6)}...{prize.wallet.slice(-4)}</span>
                          <a href={`https://suiscan.xyz/mainnet/account/${prize.wallet}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent)]">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${
                          prize.prizeType === 'liquid_victory' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                          prize.prizeType === 'locked_victory' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {getPrizeTypeLabel(prize.prizeType)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-xs sm:text-sm">{prize.prizeAmount.toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--success)] text-xs sm:text-sm">${prize.prizeValueUSD}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--text-secondary)] text-xs sm:text-sm">{prize.lockDuration || '-'}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--text-secondary)] text-xs sm:text-sm whitespace-nowrap">{new Date(prize.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <button
                          onClick={() => {
                            const txHash = prompt('Enter transaction hash:')
                            if (txHash) handleDistribute(prize._id, txHash)
                          }}
                          disabled={processing === prize._id}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--success)] hover:bg-[var(--success)]/80 rounded text-white text-[10px] sm:text-xs disabled:opacity-50 whitespace-nowrap"
                        >
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {processing === prize._id ? 'Processing...' : 'Mark Sent'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
