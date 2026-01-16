// ============================================
// UserBadge Model - User's Earned Badges
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { UserBadge as UserBadgeType } from '@/types/badge'

export interface UserBadgeDocument extends Omit<UserBadgeType, '_id'>, Document {}

const UserBadgeSchema = new Schema<UserBadgeDocument>(
  {
    wallet: { type: String, required: true, index: true },
    badgeId: { type: String, required: true, ref: 'Badge' },
    unlockedAt: { type: Date, default: Date.now },
    awardedBy: { type: String },      // Admin username if special badge
    awardReason: { type: String },    // Reason for special badge
  },
  {
    timestamps: true,
    collection: 'user_badges',
  }
)

// Compound unique index - user can only earn each badge once
UserBadgeSchema.index({ wallet: 1, badgeId: 1 }, { unique: true })

// For getting user's badges sorted by date
UserBadgeSchema.index({ wallet: 1, unlockedAt: -1 })

// For badge stats (how many users have this badge)
UserBadgeSchema.index({ badgeId: 1, unlockedAt: -1 })

// Virtual population of badge details
UserBadgeSchema.virtual('badge', {
  ref: 'Badge',
  localField: 'badgeId',
  foreignField: '_id',
  justOne: true,
})

// Ensure virtuals are included in JSON
UserBadgeSchema.set('toJSON', { virtuals: true })
UserBadgeSchema.set('toObject', { virtuals: true })

export const UserBadgeModel: Model<UserBadgeDocument> =
  mongoose.models.UserBadge || mongoose.model<UserBadgeDocument>('UserBadge', UserBadgeSchema)
