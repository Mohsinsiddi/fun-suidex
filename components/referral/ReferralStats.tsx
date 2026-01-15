'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui'

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

  const items = [
    { label: 'Total Referred', value: stats?.totalReferred || 0, icon: Users, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { label: 'Total Earned', value: `$${(stats?.totalEarningsUSD || 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Tweets', value: stats?.pendingTweets || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Ready for Payout', value: stats?.readyForPayout || 0, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface border border-[var(--border)]">
          <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
            <item.icon size={20} className={item.color} />
          </div>
          {loading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
