import mongoose, { Schema, Document, Model } from 'mongoose'
import type { User, UserSession } from '@/types'
import { nanoid } from '@/lib/utils/nanoid'

export interface UserDocument extends Omit<User, '_id'>, Document {
  generateReferralCode(): string
  hasCompletedFirstSpin: boolean
  totalReferred: number
}

const SessionSchema = new Schema<UserSession>({
  sessionId: { type: String, required: true },
  refreshToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { _id: false })

const UserSchema = new Schema<UserDocument>({
  wallet: { type: String, required: true, unique: true, lowercase: true },
  sessions: { type: [SessionSchema], default: [] },
  purchasedSpins: { type: Number, default: 0 },
  bonusSpins: { type: Number, default: 0 },
  totalSpins: { type: Number, default: 0 },
  totalWinsUSD: { type: Number, default: 0 },
  biggestWinUSD: { type: Number, default: 0 },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null, lowercase: true },
  totalReferred: { type: Number, default: 0 },
  hasCompletedFirstSpin: { type: Boolean, default: false },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true })

UserSchema.index({ wallet: 1 })
UserSchema.index({ referralCode: 1 })
UserSchema.index({ referredBy: 1 })
UserSchema.index({ 'sessions.sessionId': 1 })
UserSchema.index({ 'sessions.refreshToken': 1 })

UserSchema.pre('save', function(next) {
  if (!this.referralCode) this.referralCode = nanoid(8).toUpperCase()
  next()
})

UserSchema.methods.generateReferralCode = function(): string {
  this.referralCode = nanoid(8).toUpperCase()
  return this.referralCode
}

const UserModel: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)
export default UserModel
