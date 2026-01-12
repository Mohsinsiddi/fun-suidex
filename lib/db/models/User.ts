// ============================================
// User Model (Wallet-based users)
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose'
import type { User, UserSession } from '@/types'
import { nanoid } from '@/lib/utils/nanoid'

// ----------------------------------------
// Interfaces
// ----------------------------------------

export interface UserDocument extends Omit<User, '_id'>, Document {
  generateReferralCode(): string
}

// ----------------------------------------
// Session Sub-Schema
// ----------------------------------------

const SessionSchema = new Schema<UserSession>(
  {
    sessionId: { type: String, required: true },
    refreshToken: { type: String, required: true }, // Hashed
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
)

// ----------------------------------------
// User Schema
// ----------------------------------------

const UserSchema = new Schema<UserDocument>(
  {
    wallet: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    
    // Sessions
    sessions: {
      type: [SessionSchema],
      default: [],
    },
    
    // Spin Balance
    purchasedSpins: { type: Number, default: 0 },
    bonusSpins: { type: Number, default: 0 },
    
    // Stats
    totalSpins: { type: Number, default: 0 },
    totalWinsUSD: { type: Number, default: 0 },
    biggestWinUSD: { type: Number, default: 0 },
    
    // Referral
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: String,
      default: null,
      lowercase: true,
    },
    
    // Timestamps
    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
)

// ----------------------------------------
// Indexes
// ----------------------------------------

UserSchema.index({ 'sessions.refreshToken': 1 })
UserSchema.index({ referredBy: 1 })

// ----------------------------------------
// Pre-save Hook: Generate referral code
// ----------------------------------------

UserSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = nanoid(8).toUpperCase()
  }
  next()
})

// ----------------------------------------
// Methods
// ----------------------------------------

UserSchema.methods.generateReferralCode = function (): string {
  this.referralCode = nanoid(8).toUpperCase()
  return this.referralCode
}

// ----------------------------------------
// Model Export
// ----------------------------------------

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)

export default UserModel
