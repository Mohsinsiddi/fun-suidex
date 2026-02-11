// ============================================
// LPCredit Model - Indexer Spin Credits
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { LPCredit } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface LPCreditDocument extends Omit<LPCredit, '_id'>, Document {}

// ----------------------------------------
// LPCredit Schema
// ----------------------------------------

const LPCreditSchema = new Schema<LPCreditDocument>(
  {
    wallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      enum: ['lp_stake', 'swap', 'other'],
      required: true,
    },
    pair: {
      type: String,
      required: true,
    },
    amountUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    spinsCredited: {
      type: Number,
      required: true,
      min: 0,
    },
    ratePerSpin: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['credited', 'reversed'],
      default: 'credited',
    },
    creditedAt: {
      type: Date,
      default: Date.now,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false,
  }
)

// Compound index for wallet queries sorted by date
LPCreditSchema.index({ wallet: 1, creditedAt: -1 })

// ----------------------------------------
// Model Export
// ----------------------------------------

const LPCreditModel: Model<LPCreditDocument> =
  mongoose.models.LPCredit ||
  mongoose.model<LPCreditDocument>('LPCredit', LPCreditSchema)

export default LPCreditModel
