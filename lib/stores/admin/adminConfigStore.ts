import { create } from 'zustand'
import type { PrizeSlot } from '../configStore'

// ============================================
// Admin Config Store - Admin Configuration Management
// ============================================
// Handles config fetching and mutations for admin panel
// Pattern: 5 minute cache with mutation support

interface AdminConfig {
  spinRateSUI: number
  adminWalletAddress: string
  spinPurchaseEnabled: boolean
  referralEnabled: boolean
  referralCommissionPercent: number
  freeSpinMinStakeUSD: number
  profileShareMinSpins: number
  profileSharingEnabled: boolean
  prizeTable: PrizeSlot[]
  tokenPrices?: { vict: number; trump: number }
}

export interface WalletConflict {
  oldWallet: string
  newWallet: string
  total: number
  unclaimed: number
  pendingApproval: number
  totalSUI: number
  uniqueSenders: number
  oldestTx: string | null
  newestTx: string | null
}

interface AdminConfigState {
  // Loading state
  isLoading: boolean
  isSaving: boolean
  error: string | null

  // Wallet change conflict data (from 409)
  walletConflict: WalletConflict | null

  // Config data
  config: AdminConfig | null

  // Cache tracking
  lastFetched: number | null

  // Actions
  fetchConfig: () => Promise<boolean>
  updateConfig: (updates: Partial<AdminConfig>) => Promise<boolean>
  updatePrizeTable: (prizeTable: PrizeSlot[]) => Promise<boolean>
  invalidate: () => void
  clearWalletConflict: () => void
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

const initialState = {
  isLoading: false,
  isSaving: false,
  error: null,
  walletConflict: null,
  config: null,
  lastFetched: null,
}

export const useAdminConfigStore = create<AdminConfigState>((set, get) => ({
  ...initialState,

  // Fetch full config (admin endpoint)
  fetchConfig: async () => {
    const state = get()

    // Check cache
    if (state.lastFetched && state.config) {
      const cacheAge = Date.now() - state.lastFetched
      if (cacheAge < CACHE_DURATION) {
        return true // Use cached data
      }
    }

    if (state.isLoading) return !!state.config

    set({ isLoading: true, error: null })

    try {
      const res = await fetch('/api/admin/config')

      if (res.status === 401) {
        set({ ...initialState, error: 'Unauthorized' })
        return false
      }

      const data = await res.json()

      if (data.success) {
        set({
          isLoading: false,
          config: data.data,
          lastFetched: Date.now(),
          error: null,
        })
        return true
      }

      set({
        isLoading: false,
        error: data.error || 'Failed to fetch config',
      })
      return false
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to fetch config',
      })
      return false
    }
  },

  // Update config settings
  updateConfig: async (updates: Partial<AdminConfig>) => {
    set({ isSaving: true, error: null, walletConflict: null })

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()

      if (data.success) {
        // Update local state with new config
        const currentConfig = get().config
        set({
          isSaving: false,
          config: currentConfig ? { ...currentConfig, ...updates } : null,
          lastFetched: Date.now(),
          error: null,
          walletConflict: null,
        })
        return true
      }

      // Surface wallet conflict detail from 409
      if (res.status === 409 && data.walletConflict) {
        set({
          isSaving: false,
          error: data.error || 'Wallet change blocked',
          walletConflict: data.walletConflict,
        })
        return false
      }

      set({
        isSaving: false,
        error: data.error || 'Failed to update config',
      })
      return false
    } catch (error) {
      set({
        isSaving: false,
        error: 'Failed to update config',
      })
      return false
    }
  },

  // Update prize table separately
  updatePrizeTable: async (prizeTable: PrizeSlot[]) => {
    set({ isSaving: true, error: null })

    try {
      const res = await fetch('/api/admin/config/prizes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizeTable }),
      })

      const data = await res.json()

      if (data.success) {
        const currentConfig = get().config
        set({
          isSaving: false,
          config: currentConfig ? { ...currentConfig, prizeTable } : null,
          lastFetched: Date.now(),
          error: null,
        })
        return true
      }

      set({
        isSaving: false,
        error: data.error || 'Failed to update prize table',
      })
      return false
    } catch (error) {
      set({
        isSaving: false,
        error: 'Failed to update prize table',
      })
      return false
    }
  },

  // Force refresh on next fetch
  invalidate: () => {
    set({ lastFetched: null })
  },

  // Clear wallet conflict state
  clearWalletConflict: () => {
    set({ walletConflict: null })
  },
}))
