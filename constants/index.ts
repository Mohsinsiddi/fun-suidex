// ============================================
// SUIDEX GAMES - Constants & Default Values
// ============================================

import type { PrizeSlot, AdminConfig, AdminPermissions } from '@/types'

// ----------------------------------------
// Default Prize Table (16 slots)
// ----------------------------------------

export const DEFAULT_PRIZE_TABLE: PrizeSlot[] = [
  { slotIndex: 0, type: 'liquid_victory', amount: 1667, valueUSD: 5, weight: 100, lockDuration: null },
  { slotIndex: 1, type: 'liquid_victory', amount: 16667, valueUSD: 50, weight: 50, lockDuration: null },
  { slotIndex: 2, type: 'liquid_victory', amount: 333333, valueUSD: 1000, weight: 5, lockDuration: null },
  { slotIndex: 3, type: 'locked_victory', amount: 1667, valueUSD: 5, weight: 80, lockDuration: '1_week' },
  { slotIndex: 4, type: 'locked_victory', amount: 6667, valueUSD: 20, weight: 60, lockDuration: '1_week' },
  { slotIndex: 5, type: 'locked_victory', amount: 8333, valueUSD: 25, weight: 40, lockDuration: '3_month' },
  { slotIndex: 6, type: 'locked_victory', amount: 16667, valueUSD: 50, weight: 30, lockDuration: '3_month' },
  { slotIndex: 7, type: 'locked_victory', amount: 33333, valueUSD: 100, weight: 20, lockDuration: '1_year' },
  { slotIndex: 8, type: 'locked_victory', amount: 83333, valueUSD: 250, weight: 10, lockDuration: '1_year' },
  { slotIndex: 9, type: 'locked_victory', amount: 166667, valueUSD: 500, weight: 5, lockDuration: '3_year' },
  { slotIndex: 10, type: 'locked_victory', amount: 666666, valueUSD: 2000, weight: 2, lockDuration: '3_year' },
  { slotIndex: 11, type: 'locked_victory', amount: 1000000, valueUSD: 3500, weight: 1, lockDuration: '3_year' },
  { slotIndex: 12, type: 'suitrump', amount: 10, valueUSD: 10, weight: 50, lockDuration: null },
  { slotIndex: 13, type: 'suitrump', amount: 50, valueUSD: 50, weight: 20, lockDuration: null },
  { slotIndex: 14, type: 'suitrump', amount: 500, valueUSD: 500, weight: 3, lockDuration: null },
  { slotIndex: 15, type: 'no_prize', amount: 0, valueUSD: 0, weight: 200, lockDuration: null },
]

// ----------------------------------------
// Default Admin Config
// ----------------------------------------

export const DEFAULT_ADMIN_CONFIG: Omit<AdminConfig, 'updatedAt' | 'updatedBy'> = {
  _id: 'main',
  
  // Spin Purchase
  spinRateSUI: 1, // 1 SUI = 1 spin
  spinPurchaseEnabled: true,
  maxSpinsPerPurchase: 100,
  autoApprovalLimitSUI: 10, // > 10 SUI requires admin approval
  
  // Admin Wallet (placeholder - must be set)
  adminWalletAddress: '',
  
  // Payment Verification
  paymentLookbackHours: 48,
  minPaymentSUI: 1,
  
  // Prize Table
  prizeTable: DEFAULT_PRIZE_TABLE,
  
  // Referral
  referralEnabled: true,
  referralCommissionPercent: 10,
  
  // Free Spin
  freeSpinMinStakeUSD: 20,
  freeSpinCooldownHours: 24,
  
  // Victory Token
  victoryPriceUSD: 0.003,

  // Badge System
  badgesEnabled: true,
  profileSharingEnabled: true,
  profileShareMinSpins: 10,
  earlyBirdCutoffDate: null,
}

// ----------------------------------------
// Admin Permissions Defaults
// ----------------------------------------

export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  canDistributePrizes: true,
  canEditConfig: true,
  canInviteAdmins: true,
  canManualCreditSpins: true,
  canViewRevenue: true,
  canManageBadges: true,
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canDistributePrizes: true,
  canEditConfig: false,
  canInviteAdmins: false,
  canManualCreditSpins: true,
  canViewRevenue: true,
  canManageBadges: false,
}

// ----------------------------------------
// Games Registry
// ----------------------------------------

export const GAMES = [
  {
    slug: 'wheel',
    name: 'Wheel of Victory',
    description: 'Spin to win Victory tokens, SuiTrump, and more! Free daily spins for stakers.',
    status: 'live' as const,
    imagePath: '/images/wheel-preview.png',
  },
  {
    slug: 'lottery',
    name: 'Victory Lottery',
    description: 'Weekly lottery draws with massive prize pools. Coming to Telegram soon!',
    status: 'coming_soon' as const,
    imagePath: '/images/lottery-preview.png',
  },
  {
    slug: 'prediction',
    name: 'Prediction Game',
    description: 'Predict token price movements and win big. Test your market intuition.',
    status: 'coming_soon' as const,
    imagePath: '/images/prediction-preview.png',
  },
]

// ----------------------------------------
// Auth Constants
// ----------------------------------------

export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ADMIN_SESSION_EXPIRY: '24h',
  INVITE_CODE_EXPIRY: '24h',
  MAX_SESSIONS_PER_USER: 5,
  NONCE_EXPIRY_SECONDS: 300, // 5 minutes
  MIN_PASSWORD_LENGTH: 8,
}

// ----------------------------------------
// Rate Limits
// ----------------------------------------

export const RATE_LIMITS = {
  AUTH: { windowMs: 60000, max: 5 },      // 5 per minute
  SPIN: { windowMs: 60000, max: 10 },     // 10 per minute
  PAYMENT: { windowMs: 60000, max: 20 },  // 20 per minute
  GLOBAL: { windowMs: 60000, max: 100 },  // 100 per minute
}

// ----------------------------------------
// Prize Colors (for UI)
// ----------------------------------------

export const PRIZE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  liquid_victory: {
    bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    text: 'text-green-400',
    glow: 'shadow-green-500/50',
  },
  locked_victory: {
    bg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/50',
  },
  suitrump: {
    bg: 'bg-gradient-to-br from-cyan-400 to-teal-500',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/50',
  },
  no_prize: {
    bg: 'bg-gray-700',
    text: 'text-gray-400',
    glow: '',
  },
  jackpot: {
    bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/50',
  },
}

// ----------------------------------------
// Wheel Configuration
// ----------------------------------------

export const WHEEL_CONFIG = {
  SPIN_DURATION_MS: 5000,
  MIN_ROTATIONS: 5,
  MAX_ROTATIONS: 8,
  SLOT_COUNT: 16,
  SLOT_ANGLE: 360 / 16, // 22.5 degrees per slot
}

// ----------------------------------------
// SUI Constants
// ----------------------------------------

export const SUI = {
  MIST_PER_SUI: 1_000_000_000,
  DECIMALS: 9,
  MAINNET_RPC: 'https://fullnode.mainnet.sui.io:443',
  TESTNET_RPC: 'https://fullnode.testnet.sui.io:443',
}

// ----------------------------------------
// Error Messages
// ----------------------------------------

export const ERRORS = {
  // Auth
  UNAUTHORIZED: 'Unauthorized. Please connect your wallet.',
  INVALID_SIGNATURE: 'Invalid signature. Please try again.',
  SESSION_EXPIRED: 'Session expired. Please reconnect.',
  
  // Spin
  NO_SPINS_AVAILABLE: 'No spins available. Purchase spins or wait for free spin.',
  SPIN_IN_PROGRESS: 'A spin is already in progress.',
  SPIN_NOT_FOUND: 'Spin not found.',
  
  // Payment
  PAYMENT_NOT_FOUND: 'Payment not found.',
  PAYMENT_ALREADY_CLAIMED: 'This payment has already been claimed.',
  PAYMENT_BELOW_MINIMUM: 'Payment amount is below minimum.',
  
  // Admin
  ADMIN_ONLY: 'Admin access required.',
  SUPER_ADMIN_ONLY: 'Super admin access required.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  
  // General
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
}

// ----------------------------------------
// Success Messages
// ----------------------------------------

export const SUCCESS = {
  SPIN_COMPLETE: 'Spin complete!',
  PAYMENT_CLAIMED: 'Payment verified and spins credited!',
  CONFIG_UPDATED: 'Configuration updated successfully.',
  PRIZE_DISTRIBUTED: 'Prize marked as distributed.',
}

// ----------------------------------------
// Badge Constants (re-export)
// ----------------------------------------

export * from './badges'
