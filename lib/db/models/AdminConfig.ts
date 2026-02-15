// ============================================
// AdminConfig Model (Singleton)
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { AdminConfig, PrizeSlot } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface AdminConfigDocument extends Omit<AdminConfig, '_id'>, Document {
  _id: 'main'
}

// ----------------------------------------
// Prize Slot Sub-Schema
// ----------------------------------------

const PrizeSlotSchema = new Schema<PrizeSlot>(
  {
    slotIndex: { type: Number, required: true, min: 0, max: 15 },
    type: {
      type: String,
      enum: ['liquid_victory', 'locked_victory', 'suitrump', 'no_prize'],
      required: true,
    },
    amount: { type: Number, required: true, default: 0 },
    weight: { type: Number, required: true, min: 0 },
    lockDuration: {
      type: String,
      enum: ['1_week', '3_month', '1_year', '3_year', null],
      default: null,
    },
  },
  { _id: false }
)

// ----------------------------------------
// AdminConfig Schema
// ----------------------------------------

const AdminConfigSchema = new Schema<AdminConfigDocument>(
  {
    _id: {
      type: String,
      default: 'main',
    },
    
    // Spin Purchase
    spinRateSUI: {
      type: Number,
      default: 1,
      min: 0.001,
    },
    spinPurchaseEnabled: {
      type: Boolean,
      default: true,
    },
    maxSpinsPerPurchase: {
      type: Number,
      default: 100,
      min: 1,
    },
    autoApprovalLimitSUI: {
      type: Number,
      default: 10,
      min: 1,
    },
    
    // Admin Wallet (receives payments)
    adminWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
    },

    // Distributor Wallet (sends prize distributions, nullable = same as admin)
    distributorWalletAddress: {
      type: String,
      default: null,
      lowercase: true,
    },
    
    // Payment Verification
    paymentLookbackHours: {
      type: Number,
      default: 48,
      min: 1,
      max: 168, // 1 week max
    },
    minPaymentSUI: {
      type: Number,
      default: 1,
      min: 0.1,
    },
    
    // Prize Table
    prizeTable: {
      type: [PrizeSlotSchema],
      validate: {
        validator: (table: PrizeSlot[]) => table.length === 16,
        message: 'Prize table must have exactly 16 slots',
      },
    },
    
    // Referral
    referralEnabled: {
      type: Boolean,
      default: true,
    },
    referralCommissionPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 50,
    },
    
    // Free Spin
    freeSpinMinStakeUSD: {
      type: Number,
      default: 20,
      min: 0,
    },
    freeSpinCooldownHours: {
      type: Number,
      default: 24,
      min: 1,
    },
    
    // Victory Token
    victoryPriceUSD: {
      type: Number,
      default: 0.003,
      min: 0,
    },

    // Badge System
    badgesEnabled: {
      type: Boolean,
      default: true,
    },

    // Profile Sharing
    profileSharingEnabled: {
      type: Boolean,
      default: true,
    },
    profileShareMinSpins: {
      type: Number,
      default: 10,
      min: 1,
    },

    // Early Bird Badge Cutoff Date
    earlyBirdCutoffDate: {
      type: Date,
      default: null,  // Set by admin when launching
    },

    // LP Credit
    lpCreditEnabled: {
      type: Boolean,
      default: true,
    },
    lpSpinRateUSD: {
      type: Number,
      default: 20,
      min: 1,
    },

    // Chain Sync (cursor-based incremental sync)
    chainSyncCursor: {
      type: String,
      default: null,
    },
    chainSyncLastAt: {
      type: Date,
      default: null,
    },

    // Metadata
    updatedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
  }
)

// ----------------------------------------
// Model Export
// ----------------------------------------

const AdminConfigModel: Model<AdminConfigDocument> =
  mongoose.models.AdminConfig ||
  mongoose.model<AdminConfigDocument>('AdminConfig', AdminConfigSchema)

export default AdminConfigModel
