'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Settings, DollarSign, Users, Gift, LogOut, RefreshCw, Check, X, ExternalLink } from 'lucide-react'

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

  useEffect(() => { fetchPrizes() }, [])

  const fetchPrizes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/distribute')
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) setPrizes(data.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
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
      if (data.success) {
        setPrizes(prev => prev.filter(p => p._id !== spinId))
      }
    } catch (err) { console.error(err) }
    setProcessing(null)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
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
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white"><span className="text-yellow-400">SuiDex</span> Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><LayoutDashboard className="w-5 h-5" />Dashboard</Link>
          <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700"><DollarSign className="w-5 h-5" />Revenue</Link>
          <Link href="/admin/distribute" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white"><Gift className="w-5 h-5" />Distribute</Link>
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
              <h2 className="text-2xl font-bold text-white">Prize Distribution</h2>
              <p className="text-gray-400">Distribute pending prizes to winners</p>
            </div>
            <button onClick={fetchPrizes} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-gray-400 text-sm">Pending Prizes</p>
              <p className="text-3xl font-bold text-yellow-400">{prizes.length}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-gray-400 text-sm">Total Value (USD)</p>
              <p className="text-3xl font-bold text-green-400">${prizes.reduce((s, p) => s + p.prizeValueUSD, 0).toFixed(0)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-gray-400 text-sm">Total VICT</p>
              <p className="text-3xl font-bold text-purple-400">{prizes.filter(p => p.prizeType !== 'suitrump').reduce((s, p) => s + p.prizeAmount, 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Pending Prizes Table */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Pending Prizes</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Wallet</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Value</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Lock</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map((prize) => (
                  <tr key={prize._id} className="border-b border-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{prize.wallet.slice(0, 8)}...{prize.wallet.slice(-4)}</span>
                        <a href={`https://suiscan.xyz/mainnet/account/${prize.wallet}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        prize.prizeType === 'liquid_victory' ? 'bg-yellow-500/20 text-yellow-400' :
                        prize.prizeType === 'locked_victory' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {getPrizeTypeLabel(prize.prizeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{prize.prizeAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-400">${prize.prizeValueUSD}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{prize.lockDuration || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(prize.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const txHash = prompt('Enter transaction hash:')
                            if (txHash) handleDistribute(prize._id, txHash)
                          }}
                          disabled={processing === prize._id}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          {processing === prize._id ? 'Processing...' : 'Mark Sent'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {prizes.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No pending prizes 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
