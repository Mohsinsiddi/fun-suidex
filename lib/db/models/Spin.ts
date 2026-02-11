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
      enum: ['1_week', '3_month', '1_year', '3_year', null],
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

// Existing compound indexes
SpinSchema.index({ wallet: 1, createdAt: -1 })
SpinSchema.index({ status: 1, createdAt: 1 })
SpinSchema.index({ referredBy: 1, createdAt: -1 })
SpinSchema.index({ prizeType: 1, status: 1 })

// Additional optimization indexes
SpinSchema.index({ createdAt: -1 }) // For general pagination
SpinSchema.index({ status: 1, prizeAmount: 1 }) // For pending prizes with rewards query
SpinSchema.index({ wallet: 1, status: 1 }) // For user spin history by status
SpinSchema.index({ distributedAt: -1 }) // For distribution timeline
SpinSchema.index({ distributedTxHash: 1 }) // For sync lookups
SpinSchema.index({ status: 1, distributedAt: -1 }) // For distributed tab

// ----------------------------------------
// Model Export
// ----------------------------------------

const SpinModel: Model<SpinDocument> =
  mongoose.models.Spin || mongoose.model<SpinDocument>('Spin', SpinSchema)

export default SpinModel
