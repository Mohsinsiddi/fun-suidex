// ============================================
// SUIDEX GAMES - Type Definitions
// ============================================

// ----------------------------------------
// User Types
// ----------------------------------------

export interface User {
  _id: string
  wallet: string

  // Session info (stored separately)
  sessions: UserSession[]

  // Spin balance
  purchasedSpins: number
  bonusSpins: number

  // Stats
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number

  // Referral
  referralCode: string
  referredBy: string | null
  totalReferred: number

  // Streak tracking (spin-based)
  currentStreak: number
  longestStreak: number
  lastSpinDate: Date | null

  // Commission tracking (for badges)
  totalCommissionUSD: number

  // Social tracking (for badges)
  totalTweets: number

  // Profile
  profileSlug: string | null
  isProfilePublic: boolean
  profileUnlockedAt: Date | null

  // Seed data marker (for testing/development)
  isSeedUser?: boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date
}

export interface UserSession {
  sessionId: string
  refreshToken: string // Hashed
  createdAt: Date
  expiresAt: Date
  userAgent: string
  ip: string
  isActive: boolean
}

// ----------------------------------------
// Admin Types
// ----------------------------------------

export interface Admin {
  _id: string
  username: string
  passwordHash: string
  
  role: 'super_admin' | 'admin'
  
  permissions: AdminPermissions
  
  invitedBy: string | null
  
  sessions: AdminSession[]
  
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AdminPermissions {
  canDistributePrizes: boolean
  canEditConfig: boolean
  canInviteAdmins: boolean
  canManualCreditSpins: boolean
  canViewRevenue: boolean
  canManageBadges: boolean
}

export interface AdminSession {
  sessionId: string
  createdAt: Date
  expiresAt: Date
  ip: string
  userAgent: string
}

export interface AdminInvite {
  _id: string
  code: string
  createdBy: string
  role: 'admin'
  permissions: AdminPermissions
  status: 'pending' | 'used' | 'expired'
  usedBy: string | null
  expiresAt: Date
  createdAt: Date
  usedAt: Date | null
}

// ----------------------------------------
// Spin Types
// ----------------------------------------

export type SpinType = 'free' | 'purchased' | 'bonus'
export type PrizeType = 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
export type SpinStatus = 'pending' | 'distributed' | 'failed'
export type LockDuration = '1_week' | '3_month' | '1_year' | '3_year' | null

export interface Spin {
  _id: string
  wallet: string
  
  spinType: SpinType
  
  // Randomness
  serverSeed: string
  randomValue: number
  
  // Result
  slotIndex: number
  prizeType: PrizeType
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: LockDuration
  
  // Distribution
  status: SpinStatus
  distributedAt: Date | null
  distributedTxHash: string | null
  distributedBy: string | null
  failureReason: string | null
  
  // Referral
  referredBy: string | null
  referralCommission: number | null
  
  // Metadata
  createdAt: Date
  ip: string
  userAgent: string
}

// ----------------------------------------
// Payment Types
// ----------------------------------------

export type PaymentClaimStatus = 'unclaimed' | 'claimed' | 'manual' | 'pending_approval'

export interface Payment {
  _id: string
  
  // TX Details
  txHash: string
  senderWallet: string
  recipientWallet: string
  amountMIST: string
  amountSUI: number
  
  // Claim
  claimStatus: PaymentClaimStatus
  claimedBy: string | null
  claimedAt: Date | null
  
  // Spins
  spinsCredited: number
  rateAtClaim: number
  
  // Manual credit
  manualCredit: boolean
  creditedByAdmin: string | null
  adminNote: string | null
  
  // Blockchain
  blockNumber: number
  timestamp: Date
  
  // Processing
  discoveredAt: Date
  createdAt: Date
}

// ----------------------------------------
// Referral Types
// ----------------------------------------

export interface Referral {
  _id: string
  referrerWallet: string
  referredWallet: string
  
  totalSpinsByReferred: number
  totalCommissionVICT: number
  
  linkedAt: Date
  lastActivityAt: Date
}

export interface AffiliateReward {
  _id: string
  referrerWallet: string
  
  fromSpinId: string
  fromWallet: string
  
  rewardAmountVICT: number
  rewardValueUSD: number
  
  weekEnding: Date
  
  status: 'pending' | 'paid'
  paidAt: Date | null
  paidTxHash: string | null
}

// ----------------------------------------
// Config Types
// ----------------------------------------

export interface PrizeSlot {
  slotIndex: number
  type: PrizeType
  amount: number
  valueUSD: number
  weight: number // Probability weight
  lockDuration?: LockDuration
}

export interface AdminConfig {
  _id: 'main'

  // Spin Purchase
  spinRateSUI: number
  spinPurchaseEnabled: boolean
  maxSpinsPerPurchase: number
  autoApprovalLimitSUI: number // Above this requires admin approval

  // Admin Wallet
  adminWalletAddress: string

  // Payment Verification
  paymentLookbackHours: number
  minPaymentSUI: number

  // Prize Table
  prizeTable: PrizeSlot[]

  // Referral
  referralEnabled: boolean
  referralCommissionPercent: number

  // Free Spin
  freeSpinMinStakeUSD: number
  freeSpinCooldownHours: number

  // Victory Token
  victoryPriceUSD: number

  // Badge System
  badgesEnabled: boolean
  profileSharingEnabled: boolean
  profileShareMinSpins: number
  earlyBirdCutoffDate: Date | null

  // Metadata
  updatedAt: Date
  updatedBy: string
}

// ----------------------------------------
// API Response Types
// ----------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SpinEligibility {
  canSpin: boolean
  freeSpinsAvailable: number
  purchasedSpinsAvailable: number
  bonusSpinsAvailable: number
  nextFreeSpinAt: Date | null
  reason?: string
}

export interface SpinResult {
  spinId: string
  slotIndex: number
}

export interface SpinReveal {
  spinId: string
  slotIndex: number
  prizeType: PrizeType
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: LockDuration
}

export interface UserStats {
  totalSpins: number
  totalWinsUSD: number
  biggestWinUSD: number
  referralCount: number
  referralEarningsVICT: number
}

// ----------------------------------------
// Auth Types
// ----------------------------------------

export interface JWTPayload {
  wallet: string
  sessionId: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
  [key: string]: unknown
}

export interface AdminJWTPayload {
  username: string
  role: 'super_admin' | 'admin'
  sessionId: string
  iat?: number
  exp?: number
  [key: string]: unknown
}

export interface AuthNonce {
  nonce: string
  wallet: string
  expiresAt: Date
}

// ----------------------------------------
// Component Props Types
// ----------------------------------------

export interface GameCardProps {
  slug: string
  name: string
  description: string
  status: 'live' | 'coming_soon' | 'maintenance'
  imagePath?: string
}

export interface WheelProps {
  prizeTable: PrizeSlot[]
  onSpin: () => Promise<SpinResult>
  onReveal: (spinId: string) => Promise<SpinReveal>
  disabled?: boolean
}

// ----------------------------------------
// Store Types (Zustand)
// ----------------------------------------

export interface UserStore {
  // State
  wallet: string | null
  isConnected: boolean
  isLoading: boolean
  user: User | null
  
  // Actions
  setWallet: (wallet: string | null) => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export interface AdminStore {
  // State
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setAdmin: (admin: Admin | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export interface GameStore {
  // State
  config: AdminConfig | null
  eligibility: SpinEligibility | null
  currentSpin: SpinResult | null
  isSpinning: boolean

  // Actions
  setConfig: (config: AdminConfig | null) => void
  setEligibility: (eligibility: SpinEligibility | null) => void
  setCurrentSpin: (spin: SpinResult | null) => void
  setSpinning: (spinning: boolean) => void
}

// ----------------------------------------
// Badge & Profile Types (re-export)
// ----------------------------------------

export * from './badge'
export * from './profile'
