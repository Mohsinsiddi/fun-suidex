'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, DollarSign, TrendingUp, Calendar } from 'lucide-react'

interface RevenueData {
  totalRevenueSUI: number
  totalPayments: number
  todayRevenueSUI: number
  todayPayments: number
  weekRevenueSUI: number
  weekPayments: number
  pendingPayments: number
  recentPayments: {
    _id: string
    wallet: string
    amountSUI: number
    spinsGranted: number
    status: string
    createdAt: string
  }[]
}

export default function AdminRevenuePage() {
  const router = useRouter()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRevenue() }, [])

  const fetchRevenue = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/revenue')
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) setData(json.data)
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

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1 text-accent">{data.totalRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-text-secondary mt-1">{data.totalPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 text-accent"><DollarSign className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Today</p>
                  <p className="text-2xl font-bold mt-1">{data.todayRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-text-secondary mt-1">{data.todayPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-card text-text-secondary"><Calendar className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-sm">This Week</p>
                  <p className="text-2xl font-bold mt-1">{data.weekRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-text-secondary mt-1">{data.weekPayments || 0} payments</p>
                </div>
                <div className="p-3 rounded-lg bg-card text-text-secondary"><TrendingUp className="w-5 h-5" /></div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Pending</p>
                  <p className={`text-2xl font-bold mt-1 ${(data.pendingPayments || 0) > 0 ? 'text-warning' : ''}`}>{data.pendingPayments || 0}</p>
                  <p className="text-sm text-text-secondary mt-1">awaiting approval</p>
                </div>
                <div className={`p-3 rounded-lg ${(data.pendingPayments || 0) > 0 ? 'bg-warning/10 text-warning' : 'bg-card text-text-secondary'}`}><RefreshCw className="w-5 h-5" /></div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Recent Payments</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs text-text-secondary">Wallet</th>
                  <th className="px-6 py-3 text-left text-xs text-text-secondary">Amount</th>
                  <th className="px-6 py-3 text-left text-xs text-text-secondary">Spins</th>
                  <th className="px-6 py-3 text-left text-xs text-text-secondary">Status</th>
                  <th className="px-6 py-3 text-left text-xs text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments?.map((p) => (
                  <tr key={p._id} className="border-b border-border/50">
                    <td className="px-6 py-4 font-mono text-sm">{p.wallet.slice(0, 10)}...{p.wallet.slice(-4)}</td>
                    <td className="px-6 py-4 text-accent">{p.amountSUI} SUI</td>
                    <td className="px-6 py-4 text-warning">{p.spinsGranted}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${p.status === 'verified' ? 'bg-success/20 text-success' : p.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!data.recentPayments || data.recentPayments.length === 0) && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary">No payments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}
    </>
  )
}
