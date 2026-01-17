'use client'

import { useEffect } from 'react'
import { Users, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { useReferralStore } from '@/lib/stores/referralStore'

export default function ReferralStats() {
  const { stats, isLoadingStats: loading, fetchStats } = useReferralStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const items = [
    { label: 'Total Referred', value: stats?.totalReferred || 0, icon: Users, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { label: 'Total Earned', value: `$${(stats?.totalEarningsUSD || 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Tweets', value: stats?.pendingTweets || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Ready for Payout', value: stats?.readyForPayout || 0, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item, i) => (
        <div key={i} className="p-3 sm:p-4 rounded-xl bg-surface border border-[var(--border)]">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${item.bg} flex items-center justify-center mb-2 sm:mb-3`}>
            <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
          </div>
          {loading ? (
            <>
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-16 mb-1" />
              <Skeleton className="h-3 w-20 sm:w-24" />
            </>
          ) : (
            <>
              <p className="text-xl sm:text-2xl font-bold text-white truncate">{item.value}</p>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-1">{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
