// ============================================
// DistributionCheckpoint Model (Singleton)
// Tracks on-chain sync progress for prize distributions
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface DistributionCheckpoint {
  _id: 'main'
  lastSyncedAt: Date | null
  lastTxDigest: string | null
  totalVerified: number
  totalFailed: number
  syncInProgress: boolean
  updatedBy: string
}

export interface DistributionCheckpointDocument
  extends Omit<DistributionCheckpoint, '_id'>,
    Document {
  _id: 'main'
}

// ----------------------------------------
// Schema
// ----------------------------------------

const DistributionCheckpointSchema = new Schema<DistributionCheckpointDocument>(
  {
    _id: {
      type: String,
      default: 'main',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastTxDigest: {
      type: String,
      default: null,
    },
    totalVerified: {
      type: Number,
      default: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
    },
    syncInProgress: {
      type: Boolean,
      default: false,
    },
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

const DistributionCheckpointModel: Model<DistributionCheckpointDocument> =
  mongoose.models.DistributionCheckpoint ||
  mongoose.model<DistributionCheckpointDocument>(
    'DistributionCheckpoint',
    DistributionCheckpointSchema
  )

export default DistributionCheckpointModel
