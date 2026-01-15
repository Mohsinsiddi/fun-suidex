// ============================================
// AdminLog Model (Audit Trail)
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface AdminLog {
  _id: string
  action: string
  adminUsername: string
  targetType: 'spin' | 'user' | 'config' | 'payment' | 'admin' | 'invite'
  targetId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip: string
  createdAt: Date
}

export interface AdminLogDocument extends Omit<AdminLog, '_id'>, Document {}

// ----------------------------------------
// AdminLog Schema
// ----------------------------------------

const AdminLogSchema = new Schema<AdminLogDocument>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    adminUsername: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['spin', 'user', 'config', 'payment', 'admin', 'invite'],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

AdminLogSchema.index({ createdAt: -1 })
AdminLogSchema.index({ action: 1, createdAt: -1 })
AdminLogSchema.index({ targetType: 1, createdAt: -1 }) // For audit by entity type
AdminLogSchema.index({ adminUsername: 1, createdAt: -1 }) // For admin action history
AdminLogSchema.index({ targetId: 1, createdAt: -1 }) // For entity change history

// ----------------------------------------
// Model Export
// ----------------------------------------

const AdminLogModel: Model<AdminLogDocument> =
  mongoose.models.AdminLog || mongoose.model<AdminLogDocument>('AdminLog', AdminLogSchema)

export default AdminLogModel
