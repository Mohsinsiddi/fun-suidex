// ============================================
// Referral Model
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Referral } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface ReferralDocument extends Omit<Referral, '_id'>, Document {}

// ----------------------------------------
// Referral Schema
// ----------------------------------------

const ReferralSchema = new Schema<ReferralDocument>(
  {
    referrerWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    referredWallet: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    
    // Stats
    totalSpinsByReferred: {
      type: Number,
      default: 0,
    },
    totalCommissionVICT: {
      type: Number,
      default: 0,
    },
    
    // Timestamps
    linkedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

ReferralSchema.index({ referrerWallet: 1, linkedAt: -1 })

// ----------------------------------------
// Model Export
// ----------------------------------------

const ReferralModel: Model<ReferralDocument> =
  mongoose.models.Referral || mongoose.model<ReferralDocument>('Referral', ReferralSchema)

export default ReferralModel
