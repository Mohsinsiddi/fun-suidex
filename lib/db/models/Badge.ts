// ============================================
// Badge Model - Badge Definitions
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Badge as BadgeType, BadgeTier, BadgeCategory, BadgeCriteria } from '@/types/badge'

export interface BadgeDocument extends Omit<BadgeType, '_id'>, Document {
  _id: string
}

const BadgeCriteriaSchema = new Schema<BadgeCriteria>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: ['gte', 'eq'], required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
)

const BadgeSchema = new Schema<BadgeDocument>(
  {
    _id: { type: String, required: true },  // e.g., 'spin_100'
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'diamond', 'legendary', 'special'] as BadgeTier[],
      required: true,
    },
    category: {
      type: String,
      enum: ['referral', 'spins', 'earnings', 'single_win', 'commission', 'activity', 'social', 'special'] as BadgeCategory[],
      required: true,
    },
    criteria: { type: BadgeCriteriaSchema, default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'badges',
  }
)

// Indexes
BadgeSchema.index({ category: 1, sortOrder: 1 })
BadgeSchema.index({ tier: 1 })
BadgeSchema.index({ isActive: 1 })

export const BadgeModel: Model<BadgeDocument> =
  mongoose.models.Badge || mongoose.model<BadgeDocument>('Badge', BadgeSchema)
