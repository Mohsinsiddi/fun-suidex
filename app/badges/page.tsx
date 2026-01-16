'use client'

import { useEffect, useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { BadgeGrid, BadgeProgressList } from '@/components/badges'
import { Award, TrendingUp, Trophy, Loader2 } from 'lucide-react'
import type { BadgeProgress, BadgeTier } from '@/types/badge'

interface BadgeStats {
  totalBadges: number
  badgesByTier: Record<BadgeTier, number>
}

export default function BadgesPage() {
  const account = useCurrentAccount()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<BadgeProgress[]>([])
  const [stats, setStats] = useState<BadgeStats | null>(null)
  const [nextBadges, setNextBadges] = useState<BadgeProgress[]>([])

  useEffect(() => {
    fetchBadges()
  }, [account?.address])

  const fetchBadges = async () => {
    setLoading(true)
    try {
      // Fetch badges with user progress if authenticated
      const endpoint = account?.address ? '/api/badges/user' : '/api/badges'
      const res = await fetch(endpoint)
      const data = await res.json()

      if (data.success) {
        if (account?.address) {
          setProgress(data.data.progress || [])
          setStats(data.data.stats || null)
          setNextBadges(data.data.nextBadges || [])
        } else {
          // No user, show all badges as locked
          const badges = data.data.badges || []
          setProgress(badges.map((b: any) => ({
            badge: b,
            isUnlocked: false,
            progressPercent: 0,
            currentValue: 0,
            targetValue: b.criteria?.value || 0,
          })))
        }
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err)
    } finally {
      setLoading(false)
    }
  }

  const unlockedCount = progress.filter(p => p.isUnlocked).length
  const totalCount = progress.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Award className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">Achievements</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
              Badge Collection
            </h1>
            <p className="text-text-secondary max-w-lg mx-auto">
              Earn badges by spinning, referring friends, and hitting milestones.
              {!account?.address && ' Connect your wallet to track progress.'}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              {account?.address && stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                  <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 text-accent mb-1">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">Earned</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {unlockedCount} <span className="text-sm text-text-muted">/ {totalCount}</span>
                    </div>
                  </div>

                  {(Object.entries(stats.badgesByTier) as [BadgeTier, number][])
                    .filter(([_, count]) => count > 0)
                    .slice(0, 3)
                    .map(([tier, count]) => (
                      <div key={tier} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                        <div className="text-xs uppercase tracking-wider font-medium text-text-muted mb-1 capitalize">
                          {tier}
                        </div>
                        <div className="text-2xl font-bold text-white">{count}</div>
                      </div>
                    ))}
                </div>
              )}

              {/* Next Badges to Unlock */}
              {account?.address && nextBadges.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <h2 className="text-lg font-semibold text-white">Almost There</h2>
                  </div>
                  <BadgeProgressList nextBadges={nextBadges} maxShow={3} />
                </div>
              )}

              {/* All Badges */}
              <BadgeGrid progress={progress} groupByCategory={true} />

              {/* NFT Teaser */}
              <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-accent/10 border border-purple-500/20 text-center">
                <div className="text-3xl mb-3">🎨</div>
                <h3 className="text-lg font-bold text-white mb-2">Badge NFTs Coming Soon</h3>
                <p className="text-text-secondary text-sm max-w-md mx-auto">
                  Collect badges now! Selected badges will be mintable as NFTs with exclusive benefits.
                  More details to be announced.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
