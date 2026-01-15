'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react'
import { SkeletonCardGrid, SkeletonTable, EmptyState, Pagination, PaginationInfo } from '@/components/ui'

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

  useEffect(() => { fetchRevenue() }, [page])

  const fetchRevenue = async () => {
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
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Revenue</h2>
          <p className="text-text-secondary">Track payments and spin purchases</p>
        </div>
        <button onClick={fetchRevenue} disabled={loading} className="btn btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {loading ? (
        <>
          {/* Stats Skeleton */}
          <div className="mb-8">
            <SkeletonCardGrid count={4} />
          </div>
          {/* Table Skeleton */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold">Recent Payments</h3>
            </div>
            <SkeletonTable rows={5} columns={5} />
          </div>
        </>
      ) : data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1 text-[var(--accent)]">{data.stats?.totalRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{data.stats?.totalPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]"><DollarSign className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm">Today</p>
                  <p className="text-2xl font-bold mt-1">{data.stats?.todayRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{data.stats?.todayPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)]"><Calendar className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm">This Week</p>
                  <p className="text-2xl font-bold mt-1">{data.stats?.weekRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{data.stats?.weekPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)]"><TrendingUp className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm">Pending</p>
                  <p className={`text-2xl font-bold mt-1 ${(data.stats?.pendingApproval || 0) > 0 ? 'text-[var(--warning)]' : ''}`}>{data.stats?.pendingApproval || 0}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">awaiting approval</p>
                </div>
                <div className={`p-3 rounded-lg ${(data.stats?.pendingApproval || 0) > 0 ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--card)] text-[var(--text-secondary)]'}`}><RefreshCw className="w-5 h-5" /></div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold">Recent Payments</h3>
            </div>
            {(!data.recentPayments || data.recentPayments.length === 0) ? (
              <EmptyState
                title="No payments yet"
                message="Payments will appear here once users purchase spins."
                icon={CreditCard}
              />
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-6 py-3 text-left text-xs text-[var(--text-secondary)]">Wallet</th>
                      <th className="px-6 py-3 text-left text-xs text-[var(--text-secondary)]">Amount</th>
                      <th className="px-6 py-3 text-left text-xs text-[var(--text-secondary)]">Spins</th>
                      <th className="px-6 py-3 text-left text-xs text-[var(--text-secondary)]">Status</th>
                      <th className="px-6 py-3 text-left text-xs text-[var(--text-secondary)]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p) => (
                      <tr key={p._id} className="border-b border-[var(--border)]/50">
                        <td className="px-6 py-4 font-mono text-sm">{p.senderWallet.slice(0, 10)}...{p.senderWallet.slice(-4)}</td>
                        <td className="px-6 py-4 text-[var(--accent)]">{p.amountSUI} SUI</td>
                        <td className="px-6 py-4 text-[var(--warning)]">{p.spinsCredited}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${p.claimStatus === 'claimed' ? 'bg-[var(--success)]/20 text-[var(--success)]' : p.claimStatus === 'pending_approval' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' : 'bg-[var(--card)] text-[var(--text-secondary)]'}`}>{p.claimStatus}</span>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
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
