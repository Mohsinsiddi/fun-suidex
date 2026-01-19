import { create, StateCreator } from 'zustand'

// ============================================
// Paginated Store Factory - Generic List Store
// ============================================
// Creates stores for paginated admin lists
// Pattern: No caching (real-time data), supports filtering

interface PaginatedState<T> {
  items: T[]
  page: number
  totalPages: number
  total: number
  limit: number
  isLoading: boolean
  error: string | null
  filters: Record<string, string>

  // Actions
  fetch: (page?: number, filters?: Record<string, string>) => Promise<void>
  setPage: (page: number) => void
  refresh: () => void
  setFilters: (filters: Record<string, string>) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
  reset: () => void
}

interface CreatePaginatedStoreOptions {
  limit?: number
  defaultFilters?: Record<string, string>
}

export function createPaginatedStore<T extends { _id: string }>(
  endpoint: string,
  options: CreatePaginatedStoreOptions = {}
) {
  const { limit = 20, defaultFilters = {} } = options

  const initialState = {
    items: [] as T[],
    page: 1,
    totalPages: 1,
    total: 0,
    limit,
    isLoading: false,
    error: null,
    filters: defaultFilters,
  }

  // Track in-flight fetch to prevent duplicates (outside store to avoid race conditions)
  let fetchInProgress = false
  let lastFetchKey = ''
  let lastFetchTime = 0

  return create<PaginatedState<T>>((set, get) => ({
    ...initialState,

    // Fetch paginated data
    fetch: async (page?: number, filters?: Record<string, string>) => {
      const state = get()
      const targetPage = page ?? state.page
      const targetFilters = filters ?? state.filters

      // Create a key for this fetch request
      const fetchKey = `${targetPage}-${JSON.stringify(targetFilters)}`
      const now = Date.now()

      // Prevent duplicate fetches:
      // 1. If fetch already in progress
      // 2. If same request was made within 2 seconds (Strict Mode dedup)
      if (fetchInProgress) {
        return
      }
      if (lastFetchKey === fetchKey && now - lastFetchTime < 2000) {
        return
      }

      fetchInProgress = true
      lastFetchKey = fetchKey
      lastFetchTime = now
      set({ isLoading: true, error: null, filters: targetFilters })

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(state.limit),
          ...targetFilters,
        })

        const res = await fetch(`${endpoint}?${params}`)

        if (res.status === 401) {
          fetchInProgress = false
          set({
            ...initialState,
            error: 'Unauthorized',
          })
          return
        }

        const data = await res.json()

        if (data.success) {
          // Handle different response formats:
          // 1. { items: [...], pagination: {...} } - from createPaginatedResponse
          // 2. { data: { items: [...] }, pagination: {...} } - alternative format
          // 3. { data: [...] } - simple array format
          const items = data.items || data.data?.items || data.data || []

          fetchInProgress = false
          set({
            isLoading: false,
            items,
            page: targetPage,
            totalPages: data.pagination?.totalPages || 1,
            total: data.pagination?.total || 0,
            error: null,
          })
        } else {
          fetchInProgress = false
          set({
            isLoading: false,
            error: data.error || 'Failed to fetch data',
          })
        }
      } catch (error) {
        fetchInProgress = false
        set({
          isLoading: false,
          error: 'Failed to fetch data',
        })
      }
    },

    // Change page
    setPage: (page: number) => {
      lastFetchKey = '' // Reset to allow fetch
      get().fetch(page)
    },

    // Force refresh current page
    refresh: () => {
      lastFetchKey = '' // Reset to allow fetch
      get().fetch(get().page)
    },

    // Update filters and refetch
    setFilters: (filters: Record<string, string>) => {
      lastFetchKey = '' // Reset to allow fetch with new filters
      get().fetch(1, filters) // Reset to page 1 when filters change
    },

    // Update a single item locally
    updateItem: (id: string, updates: Partial<T>) => {
      set((state) => ({
        items: state.items.map((item) =>
          item._id === id ? { ...item, ...updates } : item
        ),
      }))
    },

    // Remove item from list locally
    removeItem: (id: string) => {
      set((state) => ({
        items: state.items.filter((item) => item._id !== id),
        total: state.total - 1,
      }))
    },

    // Reset to initial state
    reset: () => {
      set(initialState)
    },
  }))
}

// ============================================
// Pre-configured Admin Stores
// ============================================

// Prize Distribution Store
export interface PendingPrize {
  _id: string
  wallet: string
  prizeType: string
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: string | null
  status: string
  createdAt: string
}

export const useDistributeStore = createPaginatedStore<PendingPrize>(
  '/api/admin/distribute',
  { limit: 20 }
)

// Users Store
export interface AdminUser {
  _id: string
  wallet: string
  freeSpins: number
  purchasedSpins: number
  bonusSpins: number
  totalSpins: number
  totalWinsUSD: number
  referralCode: string
  createdAt: string
  lastActiveAt: string
  currentStreak?: number
  longestStreak?: number
  badgeCount?: number
}

export const useUsersStore = createPaginatedStore<AdminUser>(
  '/api/admin/users',
  { limit: 20 }
)

// Affiliates Store
export interface AffiliateReward {
  _id: string
  referrerWallet: string
  refereeWallet: string
  originalPrizeUSD: number
  rewardValueUSD: number
  rewardAmountVICT: number
  tweetStatus: 'pending' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  createdAt: string
}

export const useAffiliatesStore = createPaginatedStore<AffiliateReward>(
  '/api/admin/affiliates',
  { limit: 20 }
)

// Revenue Store
export interface PaymentRecord {
  _id: string
  wallet: string
  txHash: string
  amountSUI: number
  spinsGranted: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  processedAt?: string
}

export const useRevenueStore = createPaginatedStore<PaymentRecord>(
  '/api/admin/revenue',
  { limit: 20 }
)
