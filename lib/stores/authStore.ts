import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// Auth Store - Centralized User State
// ============================================
// Handles authentication, user data, spins, profile, and stats
// Pattern: "load once, access everywhere"

interface ProfileData {
  displayName: string | null
  bio: string | null
  isPublic: boolean
  slug: string | null
  featuredBadges: string[]
}

interface UserStats {
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number
  currentStreak: number
  longestStreak: number
  totalReferred: number
  memberSince: string | null
  lastActiveAt: string | null
}

interface AuthState {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  wallet: string | null
  error: string | null

  // Spins (refreshed after mutations)
  freeSpins: number
  purchasedSpins: number
  bonusSpins: number

  // Profile
  profile: ProfileData | null
  profileEligible: boolean
  profileMinSpins: number

  // User stats
  stats: UserStats

  // Referral
  referralCode: string | null
  referredBy: string | null
  hasCompletedFirstSpin: boolean

  // Badge count (for quick access)
  badgeCount: number

  // Tracking
  lastFetched: number | null

  // Actions
  fetchUser: (force?: boolean, expectedWallet?: string) => Promise<boolean>
  refreshSpins: () => Promise<void>
  setSpins: (
    spins: { free: number; purchased: number; bonus: number },
    stats?: { totalSpins: number; totalWinsUSD: number; biggestWinUSD: number; currentStreak: number; longestStreak: number }
  ) => void
  updateProfile: (data: Partial<ProfileData>) => void
  login: (wallet: string, signature: string, nonce: string, referrer?: string) => Promise<boolean>
  logout: () => Promise<void>
  reset: () => void
  clearError: () => void
}

const initialStats: UserStats = {
  totalSpins: 0,
  totalWinsUSD: 0,
  biggestWinUSD: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalReferred: 0,
  memberSince: null,
  lastActiveAt: null,
}

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  wallet: null,
  error: null,
  freeSpins: 0,
  purchasedSpins: 0,
  bonusSpins: 0,
  profile: null,
  profileEligible: false,
  profileMinSpins: 10,
  stats: initialStats,
  referralCode: null,
  referredBy: null,
  hasCompletedFirstSpin: false,
  badgeCount: 0,
  lastFetched: null,
}

// Track in-flight fetch to prevent duplicates (outside store to avoid race conditions)
let fetchInProgress = false

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch current user data from /api/auth/me
      fetchUser: async (force = false, expectedWallet?: string) => {
        const state = get()

        // Don't fetch if already loading or fetch in progress
        if (state.isLoading || fetchInProgress) return state.isAuthenticated

        // Skip if recently fetched (within 5 minutes) - prevents duplicate calls across page navigations
        // Use 2 second window for React Strict Mode rapid re-renders
        const cacheTime = state.lastFetched ? Date.now() - state.lastFetched : Infinity
        if (!force && state.isAuthenticated && state.wallet) {
          // Already have data - only refetch if cache is stale (5 min)
          if (cacheTime < 5 * 60 * 1000) {
            // But check for wallet mismatch if expectedWallet provided
            if (expectedWallet && state.wallet.toLowerCase() !== expectedWallet.toLowerCase()) {
              // Wallet changed - force reset
              set(initialState)
              return false
            }
            return true
          }
        } else if (!force && cacheTime < 2000) {
          // Strict Mode dedup - skip rapid re-fetches
          return state.isAuthenticated
        }

        fetchInProgress = true
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/auth/me?include=profile')
          const data = await res.json()

          if (!data.success) {
            // Not authenticated - reset state
            fetchInProgress = false
            set({
              ...initialState,
              isLoading: false,
            })
            return false
          }

          const user = data.data

          // Check for wallet mismatch - if stored wallet doesn't match API response
          const apiWallet = user.wallet?.toLowerCase()
          const storedWallet = state.wallet?.toLowerCase()
          if (storedWallet && apiWallet && storedWallet !== apiWallet) {
            console.log('[authStore] Wallet mismatch detected, resetting state')
            fetchInProgress = false
            set({
              ...initialState,
              isLoading: false,
            })
            return false
          }

          set({
            isAuthenticated: true,
            isLoading: false,
            wallet: user.wallet,
            freeSpins: user.freeSpins || 0,
            purchasedSpins: user.purchasedSpins || 0,
            bonusSpins: user.bonusSpins || 0,
            profile: user.profile
              ? {
                  displayName: user.profile.displayName || null,
                  bio: user.profile.bio || null,
                  isPublic: user.profile.isPublic || false,
                  slug: user.profile.slug || null,
                  featuredBadges: user.profile.featuredBadges || [],
                }
              : null,
            profileEligible: user.profileEligible || false,
            profileMinSpins: user.profileMinSpins || 10,
            stats: {
              totalSpins: user.totalSpins || 0,
              totalWinsUSD: user.totalWinsUSD || 0,
              biggestWinUSD: user.biggestWinUSD || 0,
              currentStreak: user.currentStreak || 0,
              longestStreak: user.longestStreak || 0,
              totalReferred: user.totalReferred || 0,
              memberSince: user.memberSince || user.createdAt || null,
              lastActiveAt: user.lastActiveAt || null,
            },
            referralCode: user.referralCode || null,
            referredBy: user.referredBy || null,
            hasCompletedFirstSpin: user.hasCompletedFirstSpin || false,
            badgeCount: user.badgeCount || 0,
            lastFetched: Date.now(),
            error: null,
          })

          fetchInProgress = false
          return true
        } catch (error) {
          fetchInProgress = false
          set({
            ...initialState,
            isLoading: false,
            error: 'Failed to fetch user data',
          })
          return false
        }
      },

      // Refresh only spin counts (after spin or purchase)
      refreshSpins: async () => {
        try {
          const res = await fetch('/api/auth/me')
          const data = await res.json()

          if (data.success) {
            const user = data.data
            set({
              freeSpins: user.freeSpins || 0,
              purchasedSpins: user.purchasedSpins || 0,
              bonusSpins: user.bonusSpins || 0,
              stats: {
                ...get().stats,
                totalSpins: user.totalSpins || 0,
                totalWinsUSD: user.totalWinsUSD || 0,
                biggestWinUSD: user.biggestWinUSD || 0,
                currentStreak: user.currentStreak || 0,
                longestStreak: user.longestStreak || 0,
              },
              hasCompletedFirstSpin: user.hasCompletedFirstSpin || false,
              lastFetched: Date.now(),
            })
          }
        } catch (error) {
          console.error('Failed to refresh spins:', error)
        }
      },

      // Set spin counts and stats directly (used after spin API returns updated counts)
      setSpins: (
        spins: { free: number; purchased: number; bonus: number },
        stats?: { totalSpins: number; totalWinsUSD: number; biggestWinUSD: number; currentStreak: number; longestStreak: number }
      ) => {
        const update: any = {
          freeSpins: spins.free,
          purchasedSpins: spins.purchased,
          bonusSpins: spins.bonus,
          hasCompletedFirstSpin: true,
        }

        if (stats) {
          update.stats = {
            ...get().stats,
            totalSpins: stats.totalSpins,
            totalWinsUSD: stats.totalWinsUSD,
            biggestWinUSD: stats.biggestWinUSD,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
          }
        }

        set(update)
      },

      // Update profile data locally (after successful API save)
      updateProfile: (data: Partial<ProfileData>) => {
        const current = get().profile
        set({
          profile: current
            ? { ...current, ...data }
            : {
                displayName: data.displayName ?? null,
                bio: data.bio ?? null,
                isPublic: data.isPublic ?? false,
                slug: data.slug ?? null,
                featuredBadges: data.featuredBadges ?? [],
              },
        })
      },

      // Login via wallet signature verification
      login: async (wallet: string, signature: string, nonce: string, referrer?: string) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, signature, nonce, referrer }),
          })

          const data = await res.json()

          if (!data.success) {
            set({
              isLoading: false,
              error: data.error || 'Verification failed',
            })
            return false
          }

          const user = data.data

          set({
            isAuthenticated: true,
            isLoading: false,
            wallet: user.wallet || wallet,
            freeSpins: user.freeSpins || 0,
            purchasedSpins: user.purchasedSpins || 0,
            bonusSpins: user.bonusSpins || 0,
            referralCode: user.referralCode || null,
            referredBy: user.referredBy || null,
            hasCompletedFirstSpin: user.hasCompletedFirstSpin || false,
            lastFetched: Date.now(),
            error: null,
          })

          return true
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          })
          return false
        }
      },

      // Logout and clear all state
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch {
          // Ignore errors - still clear local state
        }

        set(initialState)
      },

      // Reset to initial state (without API call)
      reset: () => {
        set(initialState)
      },

      // Clear error message
      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'suidex-auth',
      partialize: (state) => ({
        // Only persist auth-related fields
        isAuthenticated: state.isAuthenticated,
        wallet: state.wallet,
        // Persist spins for offline display
        freeSpins: state.freeSpins,
        purchasedSpins: state.purchasedSpins,
        bonusSpins: state.bonusSpins,
        // Persist basic user info
        referralCode: state.referralCode,
        hasCompletedFirstSpin: state.hasCompletedFirstSpin,
        // Persist stats for profile display
        stats: state.stats,
        profileEligible: state.profileEligible,
        // Persist cache timestamp to prevent duplicate fetches across pages
        lastFetched: state.lastFetched,
      }),
    }
  )
)

// Helper to get total available spins
export const useTotalSpins = () => {
  const { freeSpins, purchasedSpins, bonusSpins } = useAuthStore()
  return freeSpins + purchasedSpins + bonusSpins
}

// Helper to check if user needs to fetch
export const useNeedsFetch = () => {
  const { isAuthenticated, lastFetched } = useAuthStore()
  const STALE_TIME = 5 * 60 * 1000 // 5 minutes

  if (!isAuthenticated) return false
  if (!lastFetched) return true
  return Date.now() - lastFetched > STALE_TIME
}
