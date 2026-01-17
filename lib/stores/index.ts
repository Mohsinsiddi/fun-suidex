// User Stores - Central Export
export {
  useAuthStore,
  useTotalSpins,
  useNeedsFetch,
} from './authStore'

export {
  useConfigStore,
  formatPrizeTableForWheel,
  type PrizeSlot,
  type WheelSlot,
} from './configStore'

export {
  useBadgesStore,
  useHasBadge,
  useBadgesByTier,
  useNextBadges,
} from './badgesStore'

export {
  useReferralStore,
  formatWalletAddress,
  getStatusColor,
} from './referralStore'

// Admin Stores
export * from './admin'
