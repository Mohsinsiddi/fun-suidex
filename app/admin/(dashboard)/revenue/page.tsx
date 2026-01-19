'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react'
import { SkeletonCardGrid, SkeletonTable, EmptyState, Pagination, PaginationInfo } from '@/components/ui'
// Note: Revenue page uses a combined stats+payments API response that doesn't fit the paginated store pattern

interface RevenueStats {
  totalRevenueSUI: number
  totalPayments: number
  todayRevenueSUI: number
  todayPayments: number
  weekRevenueSUI: number
  weekPayments: number
  pendingApproval: number
}

interface Payment {
  _id: string
  senderWallet: string
  amountSUI: number
  spinsCredited: number
  claimStatus: string
  createdAt: string
}

interface RevenueData {
  stats: RevenueStats
  recentPayments: Payment[]
}

export default function AdminRevenuePage() {
  const router = useRouter()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Deduplication refs
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef('')

  const fetchRevenue = async (force = false) => {
    const fetchKey = `${page}`

    // Prevent duplicate fetches
    if (fetchingRef.current) return
    if (!force && lastFetchRef.current === fetchKey) return

    fetchingRef.current = true
    lastFetchRef.current = fetchKey
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      const res = await fetch(`/api/admin/revenue?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setTotalPages(json.pagination?.totalPages || 1)
        setTotal(json.pagination?.total || 0)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
    fetchingRef.current = false
  }

  useEffect(() => { fetchRevenue() }, [page])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Revenue</h2>
          <p className="text-text-secondary text-sm sm:text-base">Track payments and spin purchases</p>
        </div>
        <button onClick={() => { lastFetchRef.current = ''; fetchRevenue() }} disabled={loading} className="btn btn-ghost self-start sm:self-auto text-sm sm:text-base">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <>
          {/* Stats Skeleton */}
          <div className="mb-6 sm:mb-8">
            <SkeletonCardGrid count={4} />
          </div>
          {/* Table Skeleton */}
          <div className="card">
            <div className="p-3 sm:p-4 border-b border-[var(--border)]">
              <h3 className="text-base sm:text-lg font-semibold">Recent Payments</h3>
            </div>
            <SkeletonTable rows={5} columns={5} />
          </div>
        </>
      ) : data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Total Revenue</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-[var(--accent)] truncate">{data.stats?.totalRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">{data.stats?.totalPayments || 0} payments</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Today</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 truncate">{data.stats?.todayRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">{data.stats?.todayPayments || 0} payments</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)] flex-shrink-0"><Calendar className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">This Week</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 truncate">{data.stats?.weekRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">{data.stats?.weekPayments || 0} payments</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)] flex-shrink-0"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Pending</p>
                  <p className={`text-lg sm:text-xl md:text-2xl font-bold mt-1 ${(data.stats?.pendingApproval || 0) > 0 ? 'text-[var(--warning)]' : ''}`}>{data.stats?.pendingApproval || 0}</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">awaiting</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${(data.stats?.pendingApproval || 0) > 0 ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--card)] text-[var(--text-secondary)]'}`}><RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="p-3 sm:p-4 border-b border-[var(--border)]">
              <h3 className="text-base sm:text-lg font-semibold">Recent Payments</h3>
            </div>
            {(!data.recentPayments || data.recentPayments.length === 0) ? (
              <EmptyState
                title="No payments yet"
                message="Payments will appear here once users purchase spins."
                icon={CreditCard}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px]">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Wallet</th>
                        <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Amount</th>
                        <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Spins</th>
                        <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Status</th>
                        <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)]">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentPayments.map((p) => (
                        <tr key={p._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm">{p.senderWallet.slice(0, 8)}...{p.senderWallet.slice(-4)}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[var(--accent)] text-xs sm:text-sm">{p.amountSUI} SUI</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[var(--warning)] text-xs sm:text-sm">{p.spinsCredited}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${p.claimStatus === 'claimed' ? 'bg-[var(--success)]/20 text-[var(--success)]' : p.claimStatus === 'pending_approval' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' : 'bg-[var(--card)] text-[var(--text-secondary)]'}`}>{p.claimStatus}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[var(--text-secondary)] text-xs sm:text-sm whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--border)]">
                    <PaginationInfo page={page} limit={limit} total={total} />
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
