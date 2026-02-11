// ============================================
// Database Models - Barrel Export
// ============================================

export { default as UserModel } from './User'
export { default as AdminModel } from './Admin'
export { default as SpinModel } from './Spin'
export { default as AdminConfigModel } from './AdminConfig'
export { default as AdminInviteModel } from './AdminInvite'
export { default as ReferralModel } from './Referral'
export { default as AffiliateRewardModel } from './AffiliateReward'
export { default as AdminLogModel } from './AdminLog'
export { BadgeModel } from './Badge'
export { UserBadgeModel } from './UserBadge'
export { UserProfileModel } from './UserProfile'
export { default as DistributionCheckpointModel } from './DistributionCheckpoint'
export { default as ChainTransactionModel } from './ChainTransaction'

// Re-export document types
export type { UserDocument } from './User'
export type { AdminDocument } from './Admin'
export type { SpinDocument } from './Spin'
export type { AdminConfigDocument } from './AdminConfig'
export type { AdminInviteDocument } from './AdminInvite'
export type { ReferralDocument } from './Referral'
export type { AffiliateRewardDocument } from './AffiliateReward'
export type { AdminLogDocument, AdminLog } from './AdminLog'
export type { BadgeDocument } from './Badge'
export type { UserBadgeDocument } from './UserBadge'
export type { UserProfileDocument } from './UserProfile'
export type { DistributionCheckpointDocument, DistributionCheckpoint } from './DistributionCheckpoint'
export type { ChainTransactionDocument, ChainTransaction } from './ChainTransaction'
