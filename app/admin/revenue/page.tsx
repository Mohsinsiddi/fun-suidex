'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings, DollarSign, Users, Gift, LogOut, RefreshCw, TrendingUp, Calendar } from 'lucide-react'

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

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white"><span className="text-yellow-400">SuiDex</span> Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><LayoutDashboard className="w-5 h-5" />Dashboard</Link>
          <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white"><DollarSign className="w-5 h-5" />Revenue</Link>
          <Link href="/admin/distribute" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><Gift className="w-5 h-5" />Distribute</Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><Users className="w-5 h-5" />Users</Link>
          <Link href="/admin/config" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><Settings className="w-5 h-5" />Config</Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full"><LogOut className="w-5 h-5" />Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Revenue</h2>
              <p className="text-gray-400">Track payments and spin purchases</p>
            </div>
            <button onClick={fetchRevenue} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {data && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400">Total Revenue</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{data.totalRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-gray-500">{data.totalPayments || 0} payments</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">Today</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{data.todayRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-gray-500">{data.todayPayments || 0} payments</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">This Week</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{data.weekRevenueSUI?.toFixed(2) || 0} SUI</p>
                  <p className="text-sm text-gray-500">{data.weekPayments || 0} payments</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <RefreshCw className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400">Pending</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{data.pendingPayments || 0}</p>
                  <p className="text-sm text-gray-500">awaiting approval</p>
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-slate-800 rounded-xl border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-6 py-3 text-left text-xs text-gray-400">Wallet</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-400">Amount</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-400">Spins</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-400">Status</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments?.map((p) => (
                      <tr key={p._id} className="border-b border-slate-700/50">
                        <td className="px-6 py-4 font-mono text-sm text-white">{p.wallet.slice(0, 10)}...{p.wallet.slice(-4)}</td>
                        <td className="px-6 py-4 text-green-400">{p.amountSUI} SUI</td>
                        <td className="px-6 py-4 text-yellow-400">{p.spinsGranted}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${p.status === 'verified' ? 'bg-green-500/20 text-green-400' : p.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{p.status}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {(!data.recentPayments || data.recentPayments.length === 0) && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No payments yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
