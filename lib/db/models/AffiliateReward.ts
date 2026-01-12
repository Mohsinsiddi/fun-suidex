// ============================================
// AffiliateReward Model
// ============================================

import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import type { AffiliateReward } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface AffiliateRewardDocument extends Omit<AffiliateReward, '_id' | 'fromSpinId'>, Document {
  fromSpinId: Types.ObjectId
}

// ----------------------------------------
// AffiliateReward Schema
// ----------------------------------------

const AffiliateRewardSchema = new Schema<AffiliateRewardDocument>(
  {
    referrerWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    
    // Source
    fromSpinId: {
      type: Schema.Types.ObjectId,
      ref: 'Spin',
      required: true,
    },
    fromWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    
    // Reward
    rewardAmountVICT: {
      type: Number,
      required: true,
      default: 0,
    },
    rewardValueUSD: {
      type: Number,
      required: true,
      default: 0,
    },
    
    // Weekly Batching (Sunday)
    weekEnding: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidTxHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

AffiliateRewardSchema.index({ referrerWallet: 1, weekEnding: -1 })
AffiliateRewardSchema.index({ status: 1, weekEnding: 1 })

// ----------------------------------------
// Model Export
// ----------------------------------------

const AffiliateRewardModel: Model<AffiliateRewardDocument> =
  mongoose.models.AffiliateReward ||
  mongoose.model<AffiliateRewardDocument>('AffiliateReward', AffiliateRewardSchema)

export default AffiliateRewardModel
