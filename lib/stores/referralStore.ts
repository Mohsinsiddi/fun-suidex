import { create } from 'zustand'

// ============================================
// Referral Store - Referral System State
// ============================================
// Caches referral link, stats, and earnings
// Pattern: Cache stats for 5 minutes, earnings are paginated

interface ReferralStats {
  totalReferred: number
  totalEarningsUSD: number
  pendingTweets: number
  readyForPayout: number
}

interface ReferralEarning {
  _id: string
  refereeWallet?: string
  fromWallet?: string
  originalPrizeUSD: number
  rewardValueUSD: number
  rewardAmountVICT: number
  tweetStatus: 'pending' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  createdAt: string
}

interface ReferralState {
  // Loading states
  isLoadingLink: boolean
  isLoadingStats: boolean
  isLoadingEarnings: boolean
  error: string | null

  // Referral link
  referralLink: string | null
  eligible: boolean

  // Stats
  stats: ReferralStats | null

  // Earnings (paginated)
  earnings: ReferralEarning[]
  earningsPage: number
  earningsTotalPages: number
  earningsTotal: number
  earningsFilter: string

  // Cache tracking
  statsLastFetched: number | null

  // Actions
  fetchReferralLink: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchEarnings: (page?: number, filter?: string) => Promise<void>
  updateEarning: (id: string, updates: Partial<ReferralEarning>) => void
  invalidateStats: () => void
  reset: () => void
}

// Cache duration: 5 minutes for stats
const STATS_CACHE_DURATION = 5 * 60 * 1000

const initialState = {
  isLoadingLink: false,
  isLoadingStats: false,
  isLoadingEarnings: false,
  error: null,
  referralLink: null,
  eligible: false,
  stats: null,
  earnings: [],
  earningsPage: 1,
  earningsTotalPages: 1,
  earningsTotal: 0,
  earningsFilter: 'all',
  statsLastFetched: null,
}

export const useReferralStore = create<ReferralState>((set, get) => ({
  ...initialState,

  // Fetch referral link
  fetchReferralLink: async () => {
    const state = get()
    if (state.isLoadingLink) return
    if (state.referralLink) return // Already have link

    set({ isLoadingLink: true, error: null })

    try {
      const res = await fetch('/api/referral/link')
      const data = await res.json()

      if (data.success) {
        set({
          isLoadingLink: false,
          referralLink: data.data.link,
          eligible: true,
          error: null,
        })
      } else {
        set({
          isLoadingLink: false,
          eligible: false,
          error: data.error || 'Not eligible for referrals',
        })
      }
    } catch (error) {
      set({
        isLoadingLink: false,
        error: 'Failed to fetch referral link',
      })
    }
  },

  // Fetch referral stats
  fetchStats: async () => {
    const state = get()

    // Check cache
    if (state.statsLastFetched) {
      const cacheAge = Date.now() - state.statsLastFetched
      if (cacheAge < STATS_CACHE_DURATION && state.stats) {
        return // Use cached data
      }
    }

    if (state.isLoadingStats) return

    set({ isLoadingStats: true })

    try {
      const res = await fetch('/api/referral/stats')
      const data = await res.json()

      if (data.success) {
        set({
          isLoadingStats: false,
          stats: {
            totalReferred: data.data.totalReferred || 0,
            totalEarningsUSD: data.data.totalEarningsUSD || 0,
            pendingTweets: data.data.pendingTweets || 0,
            readyForPayout: data.data.readyForPayout || 0,
          },
          statsLastFetched: Date.now(),
        })
      } else {
        set({ isLoadingStats: false })
      }
    } catch (error) {
      set({ isLoadingStats: false })
    }
  },

  // Fetch paginated earnings
  fetchEarnings: async (page = 1, filter = 'all') => {
    const state = get()
    if (state.isLoadingEarnings) return

    set({ isLoadingEarnings: true, earningsFilter: filter })

    try {
      const params = new URLSearchParams({
        status: filter,
        page: String(page),
        limit: '10',
      })
      const res = await fetch(`/api/referral/earnings?${params}`)
      const data = await res.json()

      if (data.success) {
        set({
          isLoadingEarnings: false,
          earnings: data.data?.items || [],
          earningsPage: page,
          earningsTotalPages: data.pagination?.totalPages || 1,
          earningsTotal: data.pagination?.total || 0,
        })
      } else {
        set({ isLoadingEarnings: false })
      }
    } catch (error) {
      set({ isLoadingEarnings: false })
    }
  },

  // Update a single earning (e.g., after tweet claim)
  updateEarning: (id: string, updates: Partial<ReferralEarning>) => {
    set((state) => ({
      earnings: state.earnings.map((e) =>
        e._id === id ? { ...e, ...updates } : e
      ),
    }))
  },

  // Invalidate stats cache
  invalidateStats: () => {
    set({ statsLastFetched: null })
  },

  // Reset entire store
  reset: () => {
    set(initialState)
  },
}))

// ============================================
// Helper Functions
// ============================================

// Format wallet address for display
export function formatWalletAddress(wallet: string): string {
  if (!wallet) return '-'
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

// Get status badge color
export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { bg: 'bg-green-500/20', text: 'text-green-400' }
    case 'ready':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400' }
    case 'pending_tweet':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400' }
  }
}
