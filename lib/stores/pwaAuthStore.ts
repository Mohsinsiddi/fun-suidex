import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearAllPWACaches } from '@/lib/utils/pwaCacheManager'

// ============================================
// PWA Auth Store
// ============================================
// Manages PWA authentication state with Bearer tokens

interface PWAAuthState {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  wallet: string | null
  pwaWallet: string | null
  error: string | null

  // Tokens
  accessToken: string | null
  refreshToken: string | null

  // User data
  freeSpins: number
  purchasedSpins: number
  bonusSpins: number
  totalSpins: number
  totalWinsUSD: number
  referralCode: string | null

  // Session lock state (for visibility change)
  isSessionLocked: boolean
  lastActiveAt: number | null

  // Cache control - prevents redundant fetches
  lastFetched: number | null

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (data: {
    wallet: string
    pwaWallet: string
    purchasedSpins?: number
    bonusSpins?: number
    totalSpins?: number
    totalWinsUSD?: number
    referralCode?: string
  }) => void
  fetchUser: (force?: boolean) => Promise<boolean>
  refreshTokens: () => Promise<boolean>
  setSpins: (
    spins: { free: number; purchased: number; bonus: number },
    stats?: { totalSpins: number; totalWinsUSD?: number }
  ) => void
  logout: () => void
  clearError: () => void
  lockSession: () => void
  unlockSession: () => void
  updateLastActive: () => void
}

// Cache duration: 30 seconds - prevents redundant API calls when navigating
const CACHE_DURATION = 30 * 1000

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  wallet: null,
  pwaWallet: null,
  error: null,
  accessToken: null,
  refreshToken: null,
  freeSpins: 0,
  purchasedSpins: 0,
  bonusSpins: 0,
  totalSpins: 0,
  totalWinsUSD: 0,
  referralCode: null,
  isSessionLocked: false,
  lastActiveAt: null,
  lastFetched: null,
}

export const usePWAAuthStore = create<PWAAuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      setUser: (data) => {
        set({
          wallet: data.wallet,
          pwaWallet: data.pwaWallet,
          purchasedSpins: data.purchasedSpins ?? get().purchasedSpins,
          bonusSpins: data.bonusSpins ?? get().bonusSpins,
          totalSpins: data.totalSpins ?? get().totalSpins,
          totalWinsUSD: data.totalWinsUSD ?? get().totalWinsUSD,
          referralCode: data.referralCode ?? get().referralCode,
          isAuthenticated: true,
        })
      },

      fetchUser: async (force = false) => {
        const { accessToken, refreshTokens, lastFetched, isLoading } = get()
        if (!accessToken) return false

        // Skip if already loading
        if (isLoading) return true

        // Skip if cache is fresh (unless forced)
        if (!force && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
          return true
        }

        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          const data = await res.json()

          if (!data.success) {
            // Try refresh
            const refreshed = await refreshTokens()
            if (!refreshed) {
              set({ ...initialState })
              return false
            }
            return get().fetchUser(true)
          }

          const user = data.data
          set({
            isLoading: false,
            wallet: user.wallet,
            freeSpins: user.freeSpins || 0,
            purchasedSpins: user.purchasedSpins || 0,
            bonusSpins: user.bonusSpins || 0,
            totalSpins: user.totalSpins || 0,
            totalWinsUSD: user.totalWinsUSD || 0,
            referralCode: user.referralCode || null,
            lastFetched: Date.now(),
          })
          return true
        } catch (error) {
          set({ isLoading: false, error: 'Failed to fetch user' })
          return false
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false

        try {
          const res = await fetch('/api/pwa/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          const data = await res.json()

          if (!data.success) {
            set({ ...initialState })
            return false
          }

          set({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
          return true
        } catch {
          set({ ...initialState })
          return false
        }
      },

      setSpins: (spins, stats) => {
        set({
          freeSpins: spins.free,
          purchasedSpins: spins.purchased,
          bonusSpins: spins.bonus,
          totalSpins: stats?.totalSpins ?? get().totalSpins,
          totalWinsUSD: stats?.totalWinsUSD ?? get().totalWinsUSD,
          lastFetched: Date.now(), // Update cache timestamp
        })
      },

      logout: () => {
        set(initialState)
        // Clear all PWA page caches
        clearAllPWACaches()
      },

      clearError: () => {
        set({ error: null })
      },

      // Lock session (keeps tokens but requires PIN re-entry)
      lockSession: () => {
        set({
          isSessionLocked: true,
          isAuthenticated: false,
          lastActiveAt: Date.now(),
        })
      },

      // Unlock session after PIN re-entry
      unlockSession: () => {
        set({
          isSessionLocked: false,
          isAuthenticated: true,
          lastActiveAt: Date.now(),
        })
      },

      // Update last active timestamp
      updateLastActive: () => {
        set({ lastActiveAt: Date.now() })
      },
    }),
    {
      name: 'suidex-pwa-auth',
      // Only persist user data, NOT auth state
      // This forces PIN entry on every app open for security
      partialize: (state) => ({
        // DO NOT persist: isAuthenticated, accessToken, refreshToken
        // These require fresh PIN authentication each session
        wallet: state.wallet,
        pwaWallet: state.pwaWallet,
        freeSpins: state.freeSpins,
        purchasedSpins: state.purchasedSpins,
        bonusSpins: state.bonusSpins,
        totalSpins: state.totalSpins,
        totalWinsUSD: state.totalWinsUSD,  // Added - was missing
        referralCode: state.referralCode,
      }),
    }
  )
)

// Helper for authenticated fetch
export async function pwaFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken, refreshTokens } = usePWAAuthStore.getState()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${accessToken}`,
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  let res = await fetch(url, { ...options, headers })

  // If 401, try refresh and retry once
  if (res.status === 401) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      const { accessToken: newToken } = usePWAAuthStore.getState()
      headers.Authorization = `Bearer ${newToken}`
      res = await fetch(url, { ...options, headers })
    }
  }

  return res
}
