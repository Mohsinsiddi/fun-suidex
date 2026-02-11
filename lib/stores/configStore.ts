import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// Config Store - Static Configuration Data
// ============================================
// Caches prize table, spin rates, and other static config
// Pattern: Load once on app init, persist to localStorage, cache for 1 hour

export interface PrizeSlot {
  type: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  amount: number
  lockDuration?: '1_week' | '3_month' | '1_year' | '3_year'
  probability: number
}

interface TokenPrices {
  vict: number
  trump: number
  victChange24h?: number
  trumpChange24h?: number
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
  lpCreditEnabled: boolean
  lpSpinRateUSD: number
  tokenPrices: TokenPrices

  // Cache tracking
  lastFetched: number | null

  // Actions
  fetchConfig: () => Promise<void>
  invalidate: () => void
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

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
  lpCreditEnabled: true,
  lpSpinRateUSD: 20,
  tokenPrices: { vict: 0, trump: 0 },
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
        // Force refresh if tokenPrices are missing (pre-migration cache)
        const hasPrices = state.tokenPrices.vict > 0 || state.tokenPrices.trump > 0
        if (state.isLoaded && state.lastFetched && hasPrices) {
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
            lpCreditEnabled: config.lpCreditEnabled ?? true,
            lpSpinRateUSD: config.lpSpinRateUSD || 20,
            tokenPrices: config.tokenPrices || { vict: 0, trump: 0, victChange24h: 0, trumpChange24h: 0 },
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
        lpCreditEnabled: state.lpCreditEnabled,
        lpSpinRateUSD: state.lpSpinRateUSD,
        tokenPrices: state.tokenPrices,
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
  rawAmount: number
  type: string
  valueUSD: number
  lockType: string
  tokenSymbol: string
  tokenPrice: number
  tokenChange24h: number
}

export function formatPrizeTableForWheel(
  prizeTable: PrizeSlot[],
  tokenPrices: TokenPrices = { vict: 0, trump: 0 }
): WheelSlot[] {
  return prizeTable.map((prize, index) => {
    const isTrump = prize.type === 'suitrump'
    const price = isTrump ? tokenPrices.trump : tokenPrices.vict
    const change24h = isTrump ? (tokenPrices.trumpChange24h || 0) : (tokenPrices.victChange24h || 0)
    const estimatedUSD = prize.type === 'no_prize' ? 0 : prize.amount * price
    return {
      index,
      label: formatTokenLabel(prize.amount, prize.type),
      sublabel: formatSublabel(prize.type, prize.lockDuration),
      color: getSlotColor(prize.type, prize.amount, index),
      amount: formatAmount(prize.amount, prize.type),
      rawAmount: prize.amount,
      type: prize.type,
      valueUSD: estimatedUSD,
      lockType: getLockType(prize.type, prize.lockDuration),
      tokenSymbol: getTokenSymbol(prize.type),
      tokenPrice: price,
      tokenChange24h: change24h,
    }
  })
}

function formatTokenLabel(amount: number, type: string): string {
  if (type === 'no_prize' || amount === 0) return 'NONE'
  if (type === 'suitrump') return String(amount)
  // VICT amounts — compact format
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`
  return String(amount)
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
  if (type === 'suitrump') return `${amt.toLocaleString()} TRUMP`
  if (amt >= 1000000) return `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}M VICT`
  if (amt >= 1000) return `${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}K VICT`
  return `${amt.toLocaleString()} VICT`
}

function getSlotColor(type: string, amount: number, idx: number): string {
  if (type === 'no_prize') return '#546E7A'
  if (type === 'suitrump') return ['#EF5350', '#F44336', '#E53935', '#D32F2F'][idx % 4]
  // Liquid victory: tier by token amount
  if (type === 'liquid_victory') {
    if (amount >= 100000) return '#FF8C00'
    if (amount >= 10000) return '#FFA500'
    if (amount >= 1000) return '#FFC107'
    return '#FFD700'
  }
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
