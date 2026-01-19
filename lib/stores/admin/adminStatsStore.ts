import { create } from 'zustand'

// ============================================
// Admin Stats Store - Dashboard Statistics
// ============================================
// Caches dashboard stats with short cache duration
// Pattern: 30 second cache for near real-time data

interface DashboardStats {
  // Users
  totalUsers: number
  activeUsers24h: number
  newUsersToday: number

  // Spins
  totalSpins: number
  spinsToday: number
  spinsPending: number

  // Revenue
  totalRevenueSUI: number
  revenueTodaySUI: number
  pendingPayments: number

  // Prizes
  totalPrizesUSD: number
  prizesTodayUSD: number
  pendingDistribution: number

  // Referrals
  totalReferrals: number
  pendingCommissions: number
  paidCommissionsUSD: number
}

interface AdminStatsState {
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchStats: () => Promise<void>
  invalidate: () => void
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000

const initialState = {
  stats: null,
  isLoading: false,
  error: null,
  lastFetched: null,
}

export const useAdminStatsStore = create<AdminStatsState>((set, get) => ({
  ...initialState,

  // Fetch dashboard stats
  fetchStats: async () => {
    const state = get()

    // Check cache
    if (state.lastFetched && state.stats) {
      const cacheAge = Date.now() - state.lastFetched
      if (cacheAge < CACHE_DURATION) {
        return // Use cached data
      }
    }

    if (state.isLoading) return

    set({ isLoading: true, error: null })

    try {
      const res = await fetch('/api/admin/stats')

      if (res.status === 401) {
        set({
          ...initialState,
          error: 'Unauthorized',
        })
        return
      }

      const data = await res.json()

      if (data.success) {
        set({
          isLoading: false,
          stats: data.data,
          lastFetched: Date.now(),
          error: null,
        })
      } else {
        set({
          isLoading: false,
          error: data.error || 'Failed to fetch stats',
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to fetch stats',
      })
    }
  },

  // Force refresh on next fetch
  invalidate: () => {
    set({ lastFetched: null })
  },
}))
