'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Gift, DollarSign, Check, ExternalLink } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, SkeletonCardGrid, EmptyState } from '@/components/ui'

interface PendingPrize {
  _id: string
  wallet: string
  prizeType: string
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: string | null
  status: string
  createdAt: string
}

export default function AdminDistributePage() {
  const router = useRouter()
  const [prizes, setPrizes] = useState<PendingPrize[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchPrizes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      const res = await fetch(`/api/admin/distribute?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        setPrizes(data.data?.items || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [page, router])

  useEffect(() => { fetchPrizes() }, [fetchPrizes])

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
      if (data.success) setPrizes(prev => prev.filter(p => p._id !== spinId))
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Prize Distribution</h2>
          <p className="text-text-secondary">Distribute pending prizes to winners</p>
        </div>
        <button onClick={fetchPrizes} disabled={loading} className="btn btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {/* Summary */}
      {loading && prizes.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCardGrid count={3} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Pending Prizes</p>
                <p className="text-2xl font-bold mt-1 text-[var(--warning)]">{total}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)]"><Gift className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Total Value (USD)</p>
                <p className="text-2xl font-bold mt-1 text-[var(--success)]">${prizes.reduce((s, p) => s + p.prizeValueUSD, 0).toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--success)]/10 text-[var(--success)]"><DollarSign className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[var(--text-secondary)] text-sm">Total VICT</p>
                <p className="text-2xl font-bold mt-1 text-[var(--accent)]">{prizes.filter(p => p.prizeType !== 'suitrump').reduce((s, p) => s + p.prizeAmount, 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]"><Gift className="w-5 h-5" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Prizes Table */}
      <div className="card">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Pending Prizes</h3>
        </div>
        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : prizes.length === 0 ? (
          <EmptyState
            title="No pending prizes"
            message="All prizes have been distributed! 🎉"
            icon={Gift}
          />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Wallet</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Type</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Value</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Lock</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map((prize) => (
                  <tr key={prize._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{prize.wallet.slice(0, 8)}...{prize.wallet.slice(-4)}</span>
                        <a href={`https://suiscan.xyz/mainnet/account/${prize.wallet}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent)]">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        prize.prizeType === 'liquid_victory' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                        prize.prizeType === 'locked_victory' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {getPrizeTypeLabel(prize.prizeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{prize.prizeAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[var(--success)]">${prize.prizeValueUSD}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{prize.lockDuration || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{new Date(prize.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const txHash = prompt('Enter transaction hash:')
                          if (txHash) handleDistribute(prize._id, txHash)
                        }}
                        disabled={processing === prize._id}
                        className="flex items-center gap-1 px-3 py-1 bg-[var(--success)] hover:bg-[var(--success)]/80 rounded text-white text-xs disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        {processing === prize._id ? 'Processing...' : 'Mark Sent'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
