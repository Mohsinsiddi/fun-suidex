'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, Plus, AlertCircle, CheckCircle, Award, X, Trophy, Flame } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, ErrorState } from '@/components/ui'
import type { Badge, UserBadge } from '@/types/badge'
import { useUsersStore } from '@/lib/stores/admin'

interface User {
  _id: string
  wallet: string
  purchasedSpins: number
  bonusSpins: number
  totalSpins: number
  totalWinsUSD: number
  createdAt: string
  lastActiveAt: string
  currentStreak?: number
  longestStreak?: number
  badgeCount?: number
}

export default function AdminUsersPage() {
  const router = useRouter()

  // Users store
  const {
    items: users,
    page,
    totalPages,
    total,
    limit,
    isLoading: loading,
    error: storeError,
    fetch: fetchUsers,
    setPage,
    setFilters,
    refresh,
  } = useUsersStore()

  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditWallet, setCreditWallet] = useState('')
  const [creditAmount, setCreditAmount] = useState(1)
  const [creditType, setCreditType] = useState<'purchased' | 'bonus'>('purchased')
  const [crediting, setCrediting] = useState(false)

  // Badge modal state
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [badgeModalWallet, setBadgeModalWallet] = useState('')
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [specialBadges, setSpecialBadges] = useState<Badge[]>([])
  const [loadingBadges, setLoadingBadges] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<string>('')
  const [awardingBadge, setAwardingBadge] = useState(false)

  // Fetch on mount
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle unauthorized
  useEffect(() => {
    if (storeError === 'Unauthorized') {
      router.push('/admin/login')
    }
  }, [storeError, router])

  // Debounced search - only trigger when user actually types
  // Track if user has interacted with search
  const hasSearched = useRef(false)

  const handleSearchChange = (value: string) => {
    hasSearched.current = true
    setSearchInput(value)
  }

  useEffect(() => {
    // Skip if user hasn't interacted with search yet
    if (!hasSearched.current) return

    const timeout = setTimeout(() => {
      setFilters({ search: searchInput })
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput, setFilters])

  const handleCredit = async () => {
    if (!creditWallet || creditAmount <= 0) return
    setCrediting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/spins/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: creditWallet, amount: creditAmount, type: creditType }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Credited ${creditAmount} ${creditType} spins to ${creditWallet.slice(0, 10)}...`)
        setShowCreditModal(false)
        setCreditWallet('')
        setCreditAmount(1)
        fetchUsers(page) // Refresh current page
        setTimeout(() => setSuccess(null), 3000)
      } else setError(data.error)
    } catch (err) { setError('Failed to credit spins') }
    setCrediting(false)
  }

  // Fetch user badges for modal
  const fetchUserBadges = async (wallet: string) => {
    setLoadingBadges(true)
    try {
      const [userBadgesRes, allBadgesRes] = await Promise.all([
        fetch(`/api/admin/users/${encodeURIComponent(wallet)}/badges`),
        fetch('/api/admin/badges'),
      ])
      const userBadgesData = await userBadgesRes.json()
      const allBadgesData = await allBadgesRes.json()

      if (userBadgesData.success) {
        // API returns { user, earned, progress, stats }
        setUserBadges(userBadgesData.data?.earned || [])
      }
      if (allBadgesData.success) {
        // API returns { badges, byCategory, summary }
        const badges = allBadgesData.data?.badges || []
        setAllBadges(badges)
        // Filter for special badges that can be awarded
        const special = badges.filter((b: Badge) => b.category === 'special')
        setSpecialBadges(special)
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err)
    }
    setLoadingBadges(false)
  }

  const openBadgeModal = (wallet: string) => {
    setBadgeModalWallet(wallet)
    setShowBadgeModal(true)
    setSelectedBadge('')
    fetchUserBadges(wallet)
  }

  const handleAwardBadge = async () => {
    if (!selectedBadge || !badgeModalWallet) return
    setAwardingBadge(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/badges/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: badgeModalWallet, badgeId: selectedBadge }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Badge awarded to ${badgeModalWallet.slice(0, 10)}...`)
        setSelectedBadge('')
        fetchUserBadges(badgeModalWallet)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to award badge')
      }
    } catch (err) {
      setError('Failed to award badge')
    }
    setAwardingBadge(false)
  }

  // Get tier color for badge display
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
      case 'silver': return 'text-gray-300 bg-gray-300/10 border-gray-300/30'
      case 'gold': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'diamond': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
      case 'legendary': return 'text-purple-400 bg-purple-400/10 border-purple-400/30'
      case 'special': return 'text-pink-400 bg-pink-400/10 border-pink-400/30'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Users</h2>
          <p className="text-text-secondary text-sm sm:text-base">Manage users and credit spins</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={() => setShowCreditModal(true)} className="btn btn-primary text-sm sm:text-base">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Credit Spins</span><span className="sm:hidden">Credit</span>
          </button>
          <button onClick={refresh} disabled={loading} className="btn btn-ghost text-sm sm:text-base">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && !loading && (
        <div className="mb-4 sm:mb-6 flex items-start gap-2 p-3 sm:p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg text-[var(--error)] text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 sm:mb-6 flex items-start gap-2 p-3 sm:p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg text-[var(--success)] text-sm sm:text-base">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" /><span>{success}</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by wallet address..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-[var(--card)] border border-[var(--border)] rounded-lg placeholder-[var(--text-secondary)] text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : users.length === 0 ? (
          <ErrorState
            title="No users found"
            message={searchInput ? `No users matching "${searchInput}"` : 'No users have signed up yet.'}
            onRetry={() => fetchUsers()}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Wallet</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Spins</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Wins</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Badges</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Streak</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Active</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm">{user.wallet.slice(0, 8)}...{user.wallet.slice(-4)}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-col">
                          <span className="text-[var(--text-secondary)] text-xs sm:text-sm">{user.totalSpins}</span>
                          <span className="text-[10px] sm:text-xs text-[var(--text-secondary)]/60">{user.purchasedSpins}p/{user.bonusSpins}b</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-[var(--success)] text-xs sm:text-sm">${user.totalWinsUSD?.toFixed(2) || '0.00'}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                          <span className="text-[var(--text-secondary)] text-xs sm:text-sm">{user.badgeCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                          <span className="text-[var(--text-secondary)] text-xs sm:text-sm">{user.currentStreak || 0}</span>
                          <span className="text-[10px] sm:text-xs text-[var(--text-secondary)]/50">/{user.longestStreak || 0}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-[var(--text-secondary)] text-xs sm:text-sm whitespace-nowrap">
                        {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => openBadgeModal(user.wallet)}
                            className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            title="Badges"
                          >
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Badges</span>
                          </button>
                          <button
                            onClick={() => { setCreditWallet(user.wallet); setShowCreditModal(true) }}
                            className="text-xs sm:text-sm text-[var(--accent)] hover:text-[var(--accent)]/80"
                          >
                            Credit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="card p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4">Credit Spins</h3>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={creditWallet}
                  onChange={(e) => setCreditWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg font-mono text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Amount</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Type</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as 'purchased' | 'bonus')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                >
                  <option value="purchased">Purchased Spins</option>
                  <option value="bonus">Bonus Spins</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
              <button onClick={() => setShowCreditModal(false)} className="btn btn-ghost flex-1 text-sm sm:text-base">Cancel</button>
              <button
                onClick={handleCredit}
                disabled={crediting || !creditWallet}
                className="btn btn-primary flex-1 disabled:opacity-50 text-sm sm:text-base"
              >
                {crediting ? 'Crediting...' : 'Credit Spins'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="card p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold">User Badges</h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-mono truncate">{badgeModalWallet.slice(0, 12)}...{badgeModalWallet.slice(-6)}</p>
              </div>
              <button onClick={() => setShowBadgeModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {loadingBadges ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6">
                {/* Earned Badges */}
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase mb-2 sm:mb-3">
                    Earned Badges ({userBadges.length})
                  </h4>
                  {userBadges.length === 0 ? (
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]/60 py-4 text-center">No badges earned yet</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {userBadges.map((ub) => (
                        <div
                          key={ub._id}
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border ${getTierColor(ub.badge?.tier || 'bronze')}`}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <span className="text-base sm:text-xl">{ub.badge?.icon || '🏆'}</span>
                            <span className="text-xs sm:text-sm font-medium truncate">{ub.badge?.name || 'Badge'}</span>
                          </div>
                          <p className="text-[10px] sm:text-xs opacity-60 capitalize">{ub.badge?.tier}</p>
                          <p className="text-[10px] sm:text-xs opacity-40 mt-0.5 sm:mt-1">
                            {new Date(ub.unlockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Award Special Badge */}
                {specialBadges.length > 0 && (
                  <div className="border-t border-[var(--border)] pt-3 sm:pt-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase mb-2 sm:mb-3">
                      Award Special Badge
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <select
                        value={selectedBadge}
                        onChange={(e) => setSelectedBadge(e.target.value)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-background border border-border rounded-lg text-sm"
                      >
                        <option value="">Select a special badge...</option>
                        {specialBadges.map((badge) => {
                          const alreadyHas = userBadges.some((ub) => ub.badge?._id === badge._id)
                          return (
                            <option key={badge._id} value={badge._id} disabled={alreadyHas}>
                              {badge.icon} {badge.name} {alreadyHas ? '(Already earned)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      <button
                        onClick={handleAwardBadge}
                        disabled={awardingBadge || !selectedBadge}
                        className="btn btn-primary disabled:opacity-50 text-sm sm:text-base"
                      >
                        {awardingBadge ? 'Awarding...' : 'Award'}
                      </button>
                    </div>
                  </div>
                )}

                {/* All Badges Overview */}
                <div className="border-t border-[var(--border)] pt-3 sm:pt-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase mb-2 sm:mb-3">
                    All Available Badges ({allBadges.length})
                  </h4>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    {allBadges.map((badge) => {
                      const earned = userBadges.some((ub) => ub.badge?._id === badge._id)
                      return (
                        <div
                          key={badge._id}
                          className={`p-1.5 sm:p-2 rounded-lg border text-center ${
                            earned
                              ? getTierColor(badge.tier)
                              : 'border-[var(--border)] opacity-30 grayscale'
                          }`}
                          title={`${badge.name} - ${badge.description}`}
                        >
                          <span className="text-sm sm:text-lg">{badge.icon}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
