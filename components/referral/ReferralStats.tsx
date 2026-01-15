'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, Clock, CheckCircle, Loader2 } from 'lucide-react'

export default function ReferralStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse bg-surface" />)}
      </div>
    )
  }

  const items = [
    { label: 'Total Referred', value: stats?.totalReferred || 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Earned', value: `$${(stats?.totalEarningsUSD || 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Tweets', value: stats?.pendingTweets || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Ready for Payout', value: stats?.readyForPayout || 0, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface border border-border">
          <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
            <item.icon size={20} className={item.color} />
          </div>
          <p className="text-2xl font-bold text-white">{item.value}</p>
          <p className="text-xs text-text-secondary mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
