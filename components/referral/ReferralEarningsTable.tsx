'use client'

import { useState, useEffect } from 'react'
import TweetToClaimButton from './TweetToClaimButton'
import { Pagination, PaginationInfo, SkeletonListItem, EmptyState } from '@/components/ui'
import { Gift } from 'lucide-react'
import { useReferralStore } from '@/lib/stores/referralStore'

export default function ReferralEarningsTable() {
  const {
    earnings,
    earningsPage: page,
    earningsTotalPages: totalPages,
    earningsTotal: total,
    earningsFilter: filter,
    isLoadingEarnings: loading,
    fetchEarnings,
    updateEarning
  } = useReferralStore()

  const limit = 10

  // Fetch on mount
  useEffect(() => {
    fetchEarnings(1, 'all')
  }, [])

  const handleFilterChange = (newFilter: string) => {
    fetchEarnings(1, newFilter)
  }

  const handlePageChange = (newPage: number) => {
    fetchEarnings(newPage, filter)
  }

  const handleTweetComplete = (id: string) => {
    updateEarning(id, { tweetStatus: 'completed', payoutStatus: 'ready' })
  }

  const formatWallet = (w: string | undefined) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'

  const getStatusBadge = (r: any) => {
    if (r.payoutStatus === 'paid') return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Paid</span>
    if (r.payoutStatus === 'ready') return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">Ready</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Tweet Required</span>
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'pending_tweet', label: 'Pending Tweet' },
    { value: 'ready', label: 'Ready' },
    { value: 'paid', label: 'Paid' },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => handleFilterChange(f.value)} className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${filter === f.value ? 'bg-[var(--accent)] text-black' : 'bg-surface text-[var(--text-secondary)] border border-[var(--border)] hover:border-white/20'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : earnings.length === 0 ? (
        <EmptyState
          title="No earnings yet"
          message={filter !== 'all' ? `No earnings with status "${filter}"` : 'Share your link to start earning!'}
          icon={Gift}
        />
      ) : (
        <>
          <div className="space-y-2 sm:space-y-3">
            {earnings.map(r => (
              <div key={r._id} className="p-3 sm:p-4 rounded-xl bg-surface border border-[var(--border)] hover:border-white/20 transition-colors">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white font-medium text-sm sm:text-base">{formatWallet(r.refereeWallet || r.fromWallet)}</span>
                      {getStatusBadge(r)}
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      Won <span className="text-white">${(r.originalPrizeUSD || 0).toFixed(2)}</span> →
                      You earn <span className="text-green-400 font-semibold">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                      <span className="text-[var(--text-muted)] ml-1 sm:ml-2 block sm:inline mt-0.5 sm:mt-0">({(r.rewardAmountVICT || 0).toLocaleString()} VICT)</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.payoutStatus === 'pending_tweet' && (
                      <TweetToClaimButton reward={r} onComplete={() => handleTweetComplete(r._id)} />
                    )}
                    {r.payoutStatus === 'paid' && r.paidTxHash && (
                      <a href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'}/tx/${r.paidTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                        View TX
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
