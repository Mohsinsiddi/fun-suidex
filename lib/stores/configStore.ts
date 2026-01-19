import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// Config Store - Static Configuration Data
// ============================================
// Caches prize table, spin rates, and other static config
// Pattern: Load once on app init, persist to localStorage, cache for 1 hour

export interface PrizeSlot {
  type: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  valueUSD: number
  amount: number
  lockDuration?: '1_week' | '3_month' | '1_year' | '3_year'
  probability: number
}

interface ConfigState {
  // Loading state
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  // Config data
  prizeTable: PrizeSlot[]
  spinRateSUI: number
  adminWalletAddress: string
  spinPurchaseEnabled: boolean
  referralEnabled: boolean
  referralCommissionPercent: number
  freeSpinMinStakeUSD: number

  // Cache tracking
  lastFetched: number | null

  // Actions
  fetchConfig: () => Promise<void>
  invalidate: () => void
}

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000

const initialState = {
  isLoaded: false,
  isLoading: false,
  error: null,
  prizeTable: [],
  spinRateSUI: 1,
  adminWalletAddress: '',
  spinPurchaseEnabled: false,
  referralEnabled: false,
  referralCommissionPercent: 10,
  freeSpinMinStakeUSD: 20,
  lastFetched: null,
}

// Track in-flight fetch to prevent duplicates
let fetchInProgress = false

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch config from /api/config
      fetchConfig: async () => {
        const state = get()

        // Don't fetch if already loading or fetch in progress
        if (state.isLoading || fetchInProgress) return

        // Check if already loaded and cache is still valid
        if (state.isLoaded && state.lastFetched) {
          const cacheAge = Date.now() - state.lastFetched
          if (cacheAge < CACHE_DURATION) {
            return // Use cached data
          }
        }

        fetchInProgress = true
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/config')
          const data = await res.json()

          if (!data.success) {
            fetchInProgress = false
            set({
              isLoading: false,
              error: data.error || 'Failed to fetch config',
            })
            return
          }

          const config = data.data

          fetchInProgress = false
          set({
            isLoaded: true,
            isLoading: false,
            prizeTable: config.prizeTable || [],
            spinRateSUI: config.spinRateSUI || 1,
            adminWalletAddress: config.adminWalletAddress || '',
            spinPurchaseEnabled: config.spinPurchaseEnabled ?? false,
            referralEnabled: config.referralEnabled ?? false,
            referralCommissionPercent: config.referralCommissionPercent || 10,
            freeSpinMinStakeUSD: config.freeSpinMinStakeUSD || 20,
            lastFetched: Date.now(),
            error: null,
          })
        } catch (error) {
          fetchInProgress = false
          set({
            isLoading: false,
            error: 'Failed to fetch config',
          })
        }
      },

      // Force refresh on next fetch
      invalidate: () => {
        set({ lastFetched: null })
      },
    }),
    {
      name: 'suidex-config',
      // Persist all config data for offline/refresh
      partialize: (state) => ({
        isLoaded: state.isLoaded,
        prizeTable: state.prizeTable,
        spinRateSUI: state.spinRateSUI,
        adminWalletAddress: state.adminWalletAddress,
        spinPurchaseEnabled: state.spinPurchaseEnabled,
        referralEnabled: state.referralEnabled,
        referralCommissionPercent: state.referralCommissionPercent,
        freeSpinMinStakeUSD: state.freeSpinMinStakeUSD,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

// ============================================
// Helper Functions for Wheel Display
// ============================================

export interface WheelSlot {
  index: number
  label: string
  sublabel: string
  color: string
  amount: string
  type: string
  valueUSD: number
  lockType: string
  tokenSymbol: string
}

export function formatPrizeTableForWheel(prizeTable: PrizeSlot[]): WheelSlot[] {
  return prizeTable.map((prize, index) => ({
    index,
    label: formatLabel(prize.valueUSD),
    sublabel: formatSublabel(prize.type, prize.lockDuration),
    color: getSlotColor(prize.type, prize.valueUSD, index),
    amount: formatAmount(prize.amount, prize.type),
    type: prize.type,
    valueUSD: prize.valueUSD,
    lockType: getLockType(prize.type, prize.lockDuration),
    tokenSymbol: getTokenSymbol(prize.type),
  }))
}

function formatLabel(v: number): string {
  if (v === 0) return 'NONE'
  if (v >= 1000) {
    const k = v / 1000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `$${v}`
}

function formatSublabel(type: string, lock?: string): string {
  if (type === 'no_prize') return 'No Prize'
  if (type === 'suitrump') return 'Trump'
  if (type === 'liquid_victory') return 'Liquid'
  if (lock === '1_week') return '1W Lock'
  if (lock === '3_month') return '3M Lock'
  if (lock === '1_year') return '1Y Lock'
  if (lock === '3_year') return '3Y Lock'
  return 'Locked'
}

function formatAmount(amt: number, type: string): string {
  if (type === 'no_prize') return ''
  if (type === 'suitrump') return `$${amt.toLocaleString()}`
  if (amt >= 1000000) return `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}M VICT`
  if (amt >= 1000) return `${Math.round(amt / 1000).toLocaleString()}K VICT`
  return `${amt.toLocaleString()} VICT`
}

function getSlotColor(type: string, val: number, idx: number): string {
  if (type === 'no_prize') return '#546E7A'
  if (type === 'suitrump') return ['#EF5350', '#F44336', '#E53935', '#D32F2F'][idx % 4]
  if (type === 'liquid_victory') return ['#FFD700', '#FFC107', '#FFA500', '#FF8C00'][Math.min(Math.floor(val / 200), 3)]
  return ['#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#01579B', '#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC'][idx % 11]
}

function getLockType(type: string, lock?: string): string {
  if (type === 'no_prize') return 'NONE'
  if (type === 'suitrump') return 'MEME'
  if (type === 'liquid_victory') return 'LIQUID'
  if (lock === '1_week') return '1W LOCK'
  if (lock === '3_month') return '3M LOCK'
  if (lock === '1_year') return '1Y LOCK'
  if (lock === '3_year') return '3Y LOCK'
  return 'LOCKED'
}

function getTokenSymbol(type: string): string {
  if (type === 'no_prize') return ''
  if (type === 'suitrump') return 'TRUMP'
  return 'VICT'
}
