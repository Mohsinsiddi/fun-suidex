// ============================================
// UserProfile Model - Public Shareable Profile
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { UserProfile as UserProfileType } from '@/types/profile'
import { nanoid } from '@/lib/utils/nanoid'

export interface UserProfileDocument extends Omit<UserProfileType, '_id'>, Document {}

const ProfileStatsSchema = new Schema(
  {
    totalSpins: { type: Number, default: 0 },
    totalWinsUSD: { type: Number, default: 0 },
    biggestWinUSD: { type: Number, default: 0 },
    totalReferred: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    memberSince: { type: Date, required: true },
    lastActive: { type: Date, required: true },
  },
  { _id: false }
)

const UserProfileSchema = new Schema<UserProfileDocument>(
  {
    wallet: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    isPublic: { type: Boolean, default: false },
    displayName: { type: String, maxlength: 50 },
    bio: { type: String, maxlength: 160 },
    stats: { type: ProfileStatsSchema, required: true },
    featuredBadges: [{ type: String, ref: 'Badge' }],
    unlockedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'user_profiles',
  }
)

// Indexes
UserProfileSchema.index({ isPublic: 1, updatedAt: -1 })

// Static method to generate unique slug
UserProfileSchema.statics.generateSlug = async function (): Promise<string> {
  let slug = nanoid(8).toLowerCase()
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const existing = await this.findOne({ slug })
    if (!existing) return slug
    slug = nanoid(8).toLowerCase()
    attempts++
  }

  // Fallback with timestamp
  return `${nanoid(8).toLowerCase()}${Date.now().toString(36).slice(-4)}`
}

export const UserProfileModel: Model<UserProfileDocument> =
  mongoose.models.UserProfile || mongoose.model<UserProfileDocument>('UserProfile', UserProfileSchema)
