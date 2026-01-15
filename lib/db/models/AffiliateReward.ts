import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface AffiliateRewardDocument extends Document {
  referrerWallet: string
  refereeWallet: string
  fromSpinId: Types.ObjectId
  fromWallet: string
  originalPrizeVICT: number
  originalPrizeUSD: number
  commissionRate: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  tweetClickedAt: Date | null
  tweetReturnedAt: Date | null
  tweetIntentUrl: string | null
  weekEnding: Date
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  status: 'pending' | 'paid'
  paidAt: Date | null
  paidTxHash: string | null
}

const AffiliateRewardSchema = new Schema<AffiliateRewardDocument>({
  referrerWallet: { type: String, required: true, lowercase: true },
  refereeWallet: { type: String, lowercase: true },
  fromSpinId: { type: Schema.Types.ObjectId, ref: 'Spin', required: true },
  fromWallet: { type: String, required: true, lowercase: true },
  originalPrizeVICT: { type: Number, default: 0 },
  originalPrizeUSD: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0.10 },
  rewardAmountVICT: { type: Number, required: true, default: 0 },
  rewardValueUSD: { type: Number, required: true, default: 0 },
  tweetStatus: { type: String, enum: ['pending', 'clicked', 'completed'], default: 'pending' },
  tweetClickedAt: { type: Date, default: null },
  tweetReturnedAt: { type: Date, default: null },
  tweetIntentUrl: { type: String, default: null },
  weekEnding: { type: Date, required: true },
  payoutStatus: { type: String, enum: ['pending_tweet', 'ready', 'paid'], default: 'pending_tweet' },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidAt: { type: Date, default: null },
  paidTxHash: { type: String, default: null },
}, { timestamps: true })

// Existing indexes
AffiliateRewardSchema.index({ referrerWallet: 1, createdAt: -1 })
AffiliateRewardSchema.index({ referrerWallet: 1, payoutStatus: 1 })
AffiliateRewardSchema.index({ referrerWallet: 1, tweetStatus: 1 })
AffiliateRewardSchema.index({ weekEnding: 1, payoutStatus: 1 })
AffiliateRewardSchema.index({ payoutStatus: 1 })
AffiliateRewardSchema.index({ refereeWallet: 1 })

// Additional optimization indexes
AffiliateRewardSchema.index({ tweetStatus: 1, createdAt: -1 }) // For tweet campaign status
AffiliateRewardSchema.index({ payoutStatus: 1, createdAt: -1 }) // For pagination with status filter
AffiliateRewardSchema.index({ status: 1, createdAt: -1 }) // For pending rewards
AffiliateRewardSchema.index({ paidAt: -1 }) // For payment history

const AffiliateRewardModel: Model<AffiliateRewardDocument> = mongoose.models.AffiliateReward || mongoose.model<AffiliateRewardDocument>('AffiliateReward', AffiliateRewardSchema)
export default AffiliateRewardModel
