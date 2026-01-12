// ============================================
// Spin Model
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Spin } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface SpinDocument extends Omit<Spin, '_id'>, Document {}

// ----------------------------------------
// Spin Schema
// ----------------------------------------

const SpinSchema = new Schema<SpinDocument>(
  {
    wallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    
    // Spin Type
    spinType: {
      type: String,
      enum: ['free', 'purchased', 'bonus'],
      required: true,
    },
    
    // Randomness (for fairness verification)
    serverSeed: {
      type: String,
      required: true,
    },
    randomValue: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    
    // Result
    slotIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 15,
    },
    prizeType: {
      type: String,
      enum: ['liquid_victory', 'locked_victory', 'suitrump', 'no_prize'],
      required: true,
    },
    prizeAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    prizeValueUSD: {
      type: Number,
      required: true,
      default: 0,
    },
    lockDuration: {
      type: String,
      enum: ['1_year', null],
      default: null,
    },
    
    // Distribution Status
    status: {
      type: String,
      enum: ['pending', 'distributed', 'failed'],
      default: 'pending',
    },
    distributedAt: {
      type: Date,
      default: null,
    },
    distributedTxHash: {
      type: String,
      default: null,
    },
    distributedBy: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    
    // Referral Tracking
    referredBy: {
      type: String,
      default: null,
      lowercase: true,
    },
    referralCommission: {
      type: Number,
      default: null,
    },
    
    // Metadata
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

SpinSchema.index({ wallet: 1, createdAt: -1 })
SpinSchema.index({ status: 1, createdAt: 1 })
SpinSchema.index({ referredBy: 1, createdAt: -1 })
SpinSchema.index({ prizeType: 1, status: 1 })

// ----------------------------------------
// Model Export
// ----------------------------------------

const SpinModel: Model<SpinDocument> =
  mongoose.models.Spin || mongoose.model<SpinDocument>('Spin', SpinSchema)

export default SpinModel
