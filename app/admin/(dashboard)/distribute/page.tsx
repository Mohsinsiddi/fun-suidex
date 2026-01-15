'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Gift, DollarSign, Check, ExternalLink } from 'lucide-react'

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm">Pending Prizes</p>
              <p className="text-2xl font-bold mt-1 text-warning">{prizes.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-warning"><Gift className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Value (USD)</p>
              <p className="text-2xl font-bold mt-1 text-success">${prizes.reduce((s, p) => s + p.prizeValueUSD, 0).toFixed(0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-success"><DollarSign className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total VICT</p>
              <p className="text-2xl font-bold mt-1 text-accent">{prizes.filter(p => p.prizeType !== 'suitrump').reduce((s, p) => s + p.prizeAmount, 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 text-accent"><Gift className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      {/* Pending Prizes Table */}
      <div className="card">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Pending Prizes</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Wallet</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Type</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Amount</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Value</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Lock</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Date</th>
              <th className="px-4 py-3 text-left text-xs text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((prize) => (
              <tr key={prize._id} className="border-b border-border/50 hover:bg-card-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{prize.wallet.slice(0, 8)}...{prize.wallet.slice(-4)}</span>
                    <a href={`https://suiscan.xyz/mainnet/account/${prize.wallet}`} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    prize.prizeType === 'liquid_victory' ? 'bg-warning/20 text-warning' :
                    prize.prizeType === 'locked_victory' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {getPrizeTypeLabel(prize.prizeType)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{prize.prizeAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-success">${prize.prizeValueUSD}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{prize.lockDuration || '-'}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{new Date(prize.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      const txHash = prompt('Enter transaction hash:')
                      if (txHash) handleDistribute(prize._id, txHash)
                    }}
                    disabled={processing === prize._id}
                    className="flex items-center gap-1 px-3 py-1 bg-success hover:bg-success/80 rounded text-white text-xs disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {processing === prize._id ? 'Processing...' : 'Mark Sent'}
                  </button>
                </td>
              </tr>
            ))}
            {prizes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary">No pending prizes 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
