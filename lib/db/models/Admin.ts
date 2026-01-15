// ============================================
// Admin Model (Username/Password auth)
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { Admin, AdminPermissions, AdminSession } from '@/types'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface AdminDocument extends Omit<Admin, '_id'>, Document {}

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
// Session Sub-Schema
// ----------------------------------------

const AdminSessionSchema = new Schema<AdminSession>(
  {
    sessionId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { _id: false }
)

// ----------------------------------------
// Admin Schema
// ----------------------------------------

const AdminSchema = new Schema<AdminDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    
    role: {
      type: String,
      enum: ['super_admin', 'admin'],
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
    
    invitedBy: {
      type: String,
      default: null,
    },
    
    sessions: {
      type: [AdminSessionSchema],
      default: [],
    },
    
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

// Primary index (username already indexed via unique: true)
AdminSchema.index({ 'sessions.sessionId': 1 })
AdminSchema.index({ role: 1 }) // For filtering by role
AdminSchema.index({ lastLoginAt: -1 }) // For activity tracking

// ----------------------------------------
// Model Export
// ----------------------------------------

const AdminModel: Model<AdminDocument> =
  mongoose.models.Admin || mongoose.model<AdminDocument>('Admin', AdminSchema)

export default AdminModel
