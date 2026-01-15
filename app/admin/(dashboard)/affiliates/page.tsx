'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle, Clock, XCircle, Users, DollarSign } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, SkeletonCardGrid, EmptyState } from '@/components/ui'

interface AffiliateReward {
  _id: string
  referrerWallet: string
  refereeWallet: string
  originalPrizeUSD: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  createdAt: string
}

interface Stats {
  pendingTweet: number
  ready: number
  paid: number
  pendingVICT: number
  pendingUSD: number
}

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [rewards, setRewards] = useState<AffiliateReward[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [txHash, setTxHash] = useState('')
  const [paying, setPaying] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: filter, page: String(page), limit: String(limit) })
      const res = await fetch(`/api/admin/affiliates?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        setRewards(data.data?.items || [])
        setStats(data.data?.stats || null)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [filter, page, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [filter])

  const handleSelectAll = () => {
    const readyIds = rewards.filter(r => r.payoutStatus === 'ready').map(r => r._id)
    setSelectedIds(selectedIds.length === readyIds.length ? [] : readyIds)
  }

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handlePay = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Mark ${selectedIds.length} rewards as paid?`)) return
    
    setPaying(true)
    try {
      const res = await fetch('/api/admin/affiliates/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: selectedIds, txHash: txHash || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Successfully marked ${data.count} rewards as paid!`)
        setSelectedIds([])
        setTxHash('')
        fetchData()
      } else {
        alert(data.error || 'Failed')
      }
    } catch (err) { alert('Network error') }
    setPaying(false)
  }

  const formatWallet = (w: string) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'
  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  const getTweetIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={16} className="text-green-400" />
    if (status === 'clicked') return <Clock size={16} className="text-yellow-400" />
    return <XCircle size={16} className="text-red-400" />
  }

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Paid</span>
    if (status === 'ready') return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">Ready</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pending</span>
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Affiliate Rewards</h2>
          <p className="text-text-secondary">Manage referral commissions</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {/* Stats */}
      {loading && !stats ? (
        <SkeletonCardGrid count={5} />
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-[var(--text-secondary)] text-xs mb-1">Pending Tweet</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingTweet}</p>
          </div>
          <div className="card p-4">
            <p className="text-[var(--text-secondary)] text-xs mb-1">Ready to Pay</p>
            <p className="text-2xl font-bold text-blue-400">{stats.ready}</p>
          </div>
          <div className="card p-4">
            <p className="text-[var(--text-secondary)] text-xs mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
          </div>
          <div className="card p-4">
            <p className="text-[var(--text-secondary)] text-xs mb-1">Pending VICT</p>
            <p className="text-2xl font-bold text-white">{(stats.pendingVICT || 0).toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-[var(--text-secondary)] text-xs mb-1">Pending USD</p>
            <p className="text-2xl font-bold text-[var(--accent)]">${(stats.pendingUSD || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {['all', 'pending_tweet', 'ready', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-black' : 'bg-card text-text-secondary border border-border hover:border-white/20'}`}>
            {f === 'all' ? 'All' : f === 'pending_tweet' ? 'Pending Tweet' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {rewards.some(r => r.payoutStatus === 'ready') && (
        <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
          <button onClick={handleSelectAll} className="btn btn-ghost btn-sm">
            {selectedIds.length ? 'Deselect All' : 'Select Ready'}
          </button>
          <span className="text-text-secondary text-sm">{selectedIds.length} selected</span>
          <input
            type="text"
            placeholder="TX Hash (optional)"
            value={txHash}
            onChange={e => setTxHash(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg flex-1 min-w-[200px]"
          />
          <button onClick={handlePay} disabled={!selectedIds.length || paying} className="btn btn-primary">
            {paying ? 'Processing...' : 'Mark as Paid'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} columns={8} />
        ) : rewards.length === 0 ? (
          <EmptyState
            title="No rewards found"
            message={filter !== 'all' ? `No rewards with status "${filter}"` : 'No affiliate rewards have been generated yet.'}
            icon={Users}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">SELECT</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">REFERRER</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">REFEREE</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">PRIZE</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">COMMISSION</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">TWEET</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">STATUS</th>
                    <th className="text-left py-3 px-4 text-xs text-[var(--text-secondary)]">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                      <td className="py-3 px-4">
                        {r.payoutStatus === 'ready' && (
                          <input type="checkbox" checked={selectedIds.includes(r._id)} onChange={() => handleToggle(r._id)} className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{formatWallet(r.referrerWallet)}</td>
                      <td className="py-3 px-4 font-mono text-sm text-[var(--text-secondary)]">{formatWallet(r.refereeWallet)}</td>
                      <td className="py-3 px-4">${(r.originalPrizeUSD || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                        <span className="text-[var(--text-muted)] text-xs ml-1">({(r.rewardAmountVICT || 0).toLocaleString()})</span>
                      </td>
                      <td className="py-3 px-4">{getTweetIcon(r.tweetStatus)}</td>
                      <td className="py-3 px-4">{getStatusBadge(r.payoutStatus)}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
