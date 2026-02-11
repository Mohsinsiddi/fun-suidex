// ============================================
// SUIDEX GAMES - Constants & Default Values
// ============================================

import type { PrizeSlot, AdminConfig, AdminPermissions } from '@/types'

// ----------------------------------------
// Default Prize Table (16 slots)
// ----------------------------------------

// Prize Table - Adjusted for VICT @ $0.00126 (Feb 2026)
// Total weight: 1000, no_prize: 665 (66.5%)
export const DEFAULT_PRIZE_TABLE: PrizeSlot[] = [
  { slotIndex: 0, type: 'liquid_victory', amount: 4000, weight: 80, lockDuration: null },        // 8%  ~$5
  { slotIndex: 1, type: 'liquid_victory', amount: 40000, weight: 20, lockDuration: null },       // 2%  ~$50
  { slotIndex: 2, type: 'liquid_victory', amount: 800000, weight: 1, lockDuration: null },       // 0.1% ~$1,000
  { slotIndex: 3, type: 'locked_victory', amount: 4000, weight: 70, lockDuration: '1_week' },    // 7%  ~$5
  { slotIndex: 4, type: 'locked_victory', amount: 16000, weight: 40, lockDuration: '1_week' },   // 4%  ~$20
  { slotIndex: 5, type: 'locked_victory', amount: 20000, weight: 30, lockDuration: '3_month' },  // 3%  ~$25
  { slotIndex: 6, type: 'locked_victory', amount: 40000, weight: 20, lockDuration: '3_month' },  // 2%  ~$50
  { slotIndex: 7, type: 'locked_victory', amount: 80000, weight: 10, lockDuration: '1_year' },   // 1%  ~$100
  { slotIndex: 8, type: 'locked_victory', amount: 200000, weight: 4, lockDuration: '1_year' },   // 0.4% ~$250
  { slotIndex: 9, type: 'locked_victory', amount: 400000, weight: 2, lockDuration: '3_year' },   // 0.2% ~$500
  { slotIndex: 10, type: 'locked_victory', amount: 1600000, weight: 1, lockDuration: '3_year' }, // 0.1% ~$2,000
  { slotIndex: 11, type: 'locked_victory', amount: 2400000, weight: 1, lockDuration: '3_year' }, // 0.1% ~$3,000 (jackpot)
  { slotIndex: 12, type: 'suitrump', amount: 10, weight: 40, lockDuration: null },               // 4%
  { slotIndex: 13, type: 'suitrump', amount: 50, weight: 15, lockDuration: null },               // 1.5%
  { slotIndex: 14, type: 'suitrump', amount: 500, weight: 1, lockDuration: null },               // 0.1%
  { slotIndex: 15, type: 'no_prize', amount: 0, weight: 665, lockDuration: null },               // 66.5%
]
// EV: ~$12.40/spin at VICT=$0.00126

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
  distributorWalletAddress: null,
  
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

  // LP Credit
  lpCreditEnabled: true,
  lpSpinRateUSD: 20,

  // Chain Sync
  chainSyncCursor: null,
  chainSyncLastAt: null,
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
  SPIN_DURATION_MS: 6000,  // Increased for slower deceleration
  MIN_ROTATIONS: 5,
  MAX_ROTATIONS: 8,
  SLOT_COUNT: 16,
  SLOT_ANGLE: 360 / 16, // 22.5 degrees per slot
}

// ----------------------------------------
// Spin UI Configuration
// ----------------------------------------

export const SPIN_UI = {
  // Modal auto-close timings (in milliseconds)
  NO_PRIZE_AUTO_CLOSE_MS: 3000,      // Auto-close no-prize modal after 3 seconds
  WIN_AUTO_CLOSE_MS: 5000,           // Auto-close win modal after 5 seconds
  AUTO_SPIN_DELAY_MS: 500,           // Delay before auto-spin starts
  CONFETTI_DURATION_MS: 5000,        // Confetti animation duration
  CONFETTI_PARTICLE_COUNT: 50,       // Number of confetti particles (reduced for performance)

  // Tweet configuration
  TWEET_HASHTAGS: ['SuiDex', 'WheelOfVictory', 'Crypto', 'SUI'],
  TWEET_BASE_URL: 'https://fun-suidex.vercel.app',
}

// ----------------------------------------
// SUI Constants
// ----------------------------------------

export const SUI = {
  MIST_PER_SUI: 1_000_000_000,
  DECIMALS: 9,
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
