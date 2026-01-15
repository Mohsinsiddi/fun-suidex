'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import TweetToClaimButton from './TweetToClaimButton'

export default function ReferralEarningsTable() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/referral/earnings?status=${filter}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEarnings(d.rewards) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  const handleTweetComplete = (id: string) => {
    setEarnings(prev => prev.map(e => e._id === id ? { ...e, tweetStatus: 'completed', payoutStatus: 'ready' } : e))
  }

  const formatWallet = (w: string) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'

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
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === f.value ? 'bg-accent text-black' : 'bg-surface text-text-secondary border border-border hover:border-white/20'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : earnings.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface border border-border">
          <p className="text-text-secondary">No earnings yet. Share your link to start earning!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {earnings.map(r => (
            <div key={r._id} className="p-4 rounded-xl bg-surface border border-border hover:border-white/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{formatWallet(r.refereeWallet || r.fromWallet)}</span>
                    {getStatusBadge(r)}
                  </div>
                  <p className="text-sm text-text-secondary">
                    Won <span className="text-white">${(r.originalPrizeUSD || 0).toFixed(2)}</span> → 
                    You earn <span className="text-green-400 font-semibold">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                    <span className="text-text-muted ml-2">({(r.rewardAmountVICT || 0).toLocaleString()} VICT)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.payoutStatus === 'pending_tweet' && (
                    <TweetToClaimButton reward={r} onComplete={() => handleTweetComplete(r._id)} />
                  )}
                  {r.payoutStatus === 'paid' && r.paidTxHash && (
                    <a href={`https://suiscan.xyz/tx/${r.paidTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                      View TX
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
