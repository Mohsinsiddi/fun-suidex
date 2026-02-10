// ============================================
// Payment Model (Spin Purchases)
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Payment } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface PaymentDocument extends Omit<Payment, '_id'>, Document {}

// ----------------------------------------
// Payment Schema
// ----------------------------------------

const PaymentSchema = new Schema<PaymentDocument>(
  {
    // Transaction Details (from blockchain)
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    recipientWallet: {
      type: String,
      required: true,
      lowercase: true,
    },
    amountMIST: {
      type: String,
      required: true,
    },
    amountSUI: {
      type: Number,
      required: true,
    },
    
    // Claim Details
    claimStatus: {
      type: String,
      enum: ['unclaimed', 'claimed', 'manual', 'pending_approval', 'rejected'],
      default: 'unclaimed',
      index: true,
    },
    claimedBy: {
      type: String,
      default: null,
      lowercase: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    
    // Spin Credit
    spinsCredited: {
      type: Number,
      default: 0,
    },
    rateAtClaim: {
      type: Number,
      default: 1,
    },
    
    // Manual Credit by Admin
    manualCredit: {
      type: Boolean,
      default: false,
    },
    creditedByAdmin: {
      type: String,
      default: null,
    },
    adminNote: {
      type: String,
      default: null,
    },
    
    // Blockchain Data
    blockNumber: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    
    // Processing
    discoveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

// Existing indexes
PaymentSchema.index({ senderWallet: 1, claimStatus: 1 })
PaymentSchema.index({ claimStatus: 1, timestamp: -1 })
PaymentSchema.index({ timestamp: -1 })

// Additional optimization indexes
PaymentSchema.index({ claimStatus: 1, claimedAt: -1 }) // For revenue queries by claim time
PaymentSchema.index({ createdAt: -1 }) // For pagination sorting
PaymentSchema.index({ senderWallet: 1, claimStatus: 1, timestamp: -1 }) // For user payment history

// ----------------------------------------
// Model Export
// ----------------------------------------

const PaymentModel: Model<PaymentDocument> =
  mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', PaymentSchema)

export default PaymentModel
