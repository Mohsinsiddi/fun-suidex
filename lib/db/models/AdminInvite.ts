// ============================================
// AdminInvite Model
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { AdminInvite, AdminPermissions } from '@/types'
import { nanoid } from '@/lib/utils/nanoid'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface AdminInviteDocument extends Omit<AdminInvite, '_id'>, Document {}

// ----------------------------------------
// Permissions Sub-Schema
// ----------------------------------------

const PermissionsSchema = new Schema<AdminPermissions>(
  {
    canDistributePrizes: { type: Boolean, default: true },
    canEditConfig: { type: Boolean, default: false },
    canInviteAdmins: { type: Boolean, default: false },
    canManualCreditSpins: { type: Boolean, default: true },
    canViewRevenue: { type: Boolean, default: true },
  },
  { _id: false }
)

// ----------------------------------------
// AdminInvite Schema
// ----------------------------------------

const AdminInviteSchema = new Schema<AdminInviteDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
    
    permissions: {
      type: PermissionsSchema,
      default: () => ({
        canDistributePrizes: true,
        canEditConfig: false,
        canInviteAdmins: false,
        canManualCreditSpins: true,
        canViewRevenue: true,
      }),
    },
    
    status: {
      type: String,
      enum: ['pending', 'used', 'expired'],
      default: 'pending',
    },
    usedBy: {
      type: String,
      default: null,
    },
    
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// TTL Index (auto-delete expired invites after 7 days)
// ----------------------------------------

AdminInviteSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 604800 } // 7 days after expiry
)

// ----------------------------------------
// Static Methods
// ----------------------------------------

AdminInviteSchema.statics.generateCode = function (): string {
  return `INV_${nanoid(12)}`
}

// ----------------------------------------
// Model Export
// ----------------------------------------

const AdminInviteModel: Model<AdminInviteDocument> =
  mongoose.models.AdminInvite ||
  mongoose.model<AdminInviteDocument>('AdminInvite', AdminInviteSchema)

export default AdminInviteModel
