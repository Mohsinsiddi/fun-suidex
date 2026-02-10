// ============================================
// ChainTransaction Model (On-chain TX cache)
// ============================================
// Caches incoming SUI transfers to the admin wallet.
// Synced from chain on admin revenue page load.

import mongoose, { Schema, Document, Model } from 'mongoose'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface ChainTransaction {
  _id: string
  txHash: string
  sender: string
  recipient: string
  amountMIST: string
  amountSUI: number
  timestamp: Date
  blockNumber: number
  success: boolean
  creditStatus: 'new' | 'credited' | 'unclaimed' | 'pending_approval' | 'rejected'
  paymentId: string | null
  discoveredAt: Date
}

export interface ChainTransactionDocument extends Omit<ChainTransaction, '_id'>, Document {}

// ----------------------------------------
// Schema
// ----------------------------------------

const ChainTransactionSchema = new Schema<ChainTransactionDocument>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    recipient: {
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
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
    },
    creditStatus: {
      type: String,
      enum: ['new', 'credited', 'unclaimed', 'pending_approval', 'rejected'],
      default: 'new',
      index: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
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

ChainTransactionSchema.index({ creditStatus: 1, timestamp: -1 })
ChainTransactionSchema.index({ timestamp: -1 })
ChainTransactionSchema.index({ sender: 1, timestamp: -1 })

// ----------------------------------------
// Model Export
// ----------------------------------------

const ChainTransactionModel: Model<ChainTransactionDocument> =
  mongoose.models.ChainTransaction ||
  mongoose.model<ChainTransactionDocument>('ChainTransaction', ChainTransactionSchema)

export default ChainTransactionModel
