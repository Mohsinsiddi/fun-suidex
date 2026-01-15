#!/bin/bash

# ============================================
# SUIDEX GAMES - COMPLETE REFERRAL SYSTEM v2.0
# ALL PARTS COMBINED - END TO END
# ============================================
#
# FLOW:
# 1. User visits / (landing) → sees referral CTA
# 2. If ?ref=WALLET → shows invite banner, stores in localStorage
# 3. User connects & signs → referral linked automatically
# 4. User spins → hasCompletedFirstSpin = true
# 5. User visits /referral → gets link: suidex.io?ref=WALLET
# 6. Friend clicks → lands on HOME (not wheel)
# 7. Friend wins → referrer gets 10% auto
# 8. Referrer tweets → status = ready
# 9. Admin pays via /admin/affiliates
#
# RUN: chmod +x setup-referral.sh && ./setup-referral.sh
# ============================================

set -e

echo "🚀 SuiDex Referral System v2.0 - Complete Setup"
echo "================================================"
echo ""

# ============================================
# PART 1: DIRECTORIES
# ============================================
echo "📁 Creating directories..."
mkdir -p components/referral
mkdir -p app/referral
mkdir -p "app/r/[code]"
mkdir -p app/admin/affiliates
mkdir -p app/api/referral/link
mkdir -p app/api/referral/stats
mkdir -p app/api/referral/earnings
mkdir -p app/api/referral/apply
mkdir -p "app/api/referral/tweet-clicked/[rewardId]"
mkdir -p "app/api/referral/tweet-confirmed/[rewardId]"
mkdir -p app/api/admin/affiliates/pay
mkdir -p app/api/admin/affiliates/pending
mkdir -p "app/api/admin/affiliates/[rewardId]"
echo "✅ Directories created"
echo ""

# ============================================
# PART 2: TYPES
# ============================================
echo "📝 Creating types/referral.ts..."
cat > types/referral.ts << 'EOF'
export interface ReferralStats {
  totalReferred: number
  activeReferred: number
  totalEarningsVICT: number
  totalEarningsUSD: number
  pendingEarningsVICT: number
  pendingTweets: number
  readyForPayout: number
  paidOut: number
}

export interface AffiliateRewardType {
  _id: string
  referrerWallet: string
  refereeWallet: string
  fromSpinId: string
  originalPrizeVICT: number
  originalPrizeUSD: number
  commissionRate: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  tweetClickedAt: string | null
  tweetReturnedAt: string | null
  tweetIntentUrl: string
  weekEnding: string
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidAt: string | null
  paidTxHash: string | null
  createdAt: string
}

export interface TweetIntentParams {
  prizeAmount: number
  prizeUSD: number
  referralLink: string
}
EOF

# ============================================
# PART 3: LIB HELPERS
# ============================================
echo "📝 Creating lib/referral.ts..."
cat > lib/referral.ts << 'EOF'
export function generateReferralLink(wallet: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://games.suidex.io'
  return `${baseUrl}?ref=${wallet}`
}

export function getWeekEndingDate(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  d.setHours(23, 59, 59, 999)
  return d
}

export function formatWallet(wallet: string, chars: number = 6): string {
  if (!wallet || wallet.length < chars * 2) return wallet || ''
  return `${wallet.slice(0, chars)}...${wallet.slice(-chars)}`
}
EOF

echo "📝 Creating lib/twitter.ts..."
cat > lib/twitter.ts << 'EOF'
import type { TweetIntentParams } from '@/types/referral'

export function generateTweetIntentUrl(params: TweetIntentParams): string {
  const { prizeUSD, referralLink } = params
  const tweetText = `My friend just won $${prizeUSD.toFixed(2)} on the Wheel of Victory! 🎡🔥

I earned $${(prizeUSD * 0.1).toFixed(2)} in referral rewards!

Spin yours 👉 ${referralLink}

@suidexHQ #SuiDex #WheelOfVictory`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
}

export function openTweetIntent(url: string): Window | null {
  const width = 550, height = 420
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2
  return window.open(url, 'twitter-share', `width=${width},height=${height},left=${left},top=${top}`)
}
EOF

# ============================================
# PART 4: UPDATE USER MODEL
# ============================================
echo "📝 Updating lib/db/models/User.ts..."
cat > lib/db/models/User.ts << 'EOF'
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
EOF

# ============================================
# PART 5: UPDATE AFFILIATE REWARD MODEL
# ============================================
echo "📝 Updating lib/db/models/AffiliateReward.ts..."
cat > lib/db/models/AffiliateReward.ts << 'EOF'
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

AffiliateRewardSchema.index({ referrerWallet: 1, createdAt: -1 })
AffiliateRewardSchema.index({ referrerWallet: 1, payoutStatus: 1 })
AffiliateRewardSchema.index({ referrerWallet: 1, tweetStatus: 1 })
AffiliateRewardSchema.index({ weekEnding: 1, payoutStatus: 1 })
AffiliateRewardSchema.index({ payoutStatus: 1 })
AffiliateRewardSchema.index({ refereeWallet: 1 })

const AffiliateRewardModel: Model<AffiliateRewardDocument> = mongoose.models.AffiliateReward || mongoose.model<AffiliateRewardDocument>('AffiliateReward', AffiliateRewardSchema)
export default AffiliateRewardModel
EOF

# ============================================
# PART 6: UPDATE AUTH VERIFY (Link Referral)
# ============================================
echo "📝 Updating app/api/auth/verify/route.ts..."
cat > app/api/auth/verify/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { createAccessToken, createRefreshToken, hashToken } from '@/lib/auth/jwt'
import { generateSessionId } from '@/lib/utils/nanoid'
import { isValidSuiAddress } from '@/lib/sui/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, signature, nonce, referrer } = body

    if (!wallet || !signature || !nonce) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    if (!isValidSuiAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 })
    }
    if (!nonce.includes('Sign this message to authenticate with SuiDex Games')) {
      return NextResponse.json({ success: false, error: 'Invalid nonce format' }, { status: 400 })
    }
    if (!signature || signature.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 })
    }

    await connectDB()

    let user = await UserModel.findOne({ wallet: wallet.toLowerCase() })
    const isNewUser = !user

    if (!user) {
      user = new UserModel({ wallet: wallet.toLowerCase(), purchasedSpins: 0, bonusSpins: 0 })
    }

    // Link referral for new users or users without referrer
    if (referrer && !user.referredBy && referrer.toLowerCase() !== wallet.toLowerCase()) {
      const referrerUser = await UserModel.findOne({ wallet: referrer.toLowerCase(), hasCompletedFirstSpin: true })
      if (referrerUser) {
        const existingRef = await ReferralModel.findOne({ referredWallet: wallet.toLowerCase() })
        if (!existingRef) {
          user.referredBy = referrer.toLowerCase()
          await ReferralModel.create({ referrerWallet: referrer.toLowerCase(), referredWallet: wallet.toLowerCase(), linkedAt: new Date() })
          await UserModel.updateOne({ wallet: referrer.toLowerCase() }, { $inc: { totalReferred: 1 } })
        }
      }
    }

    const sessionId = generateSessionId()
    const refreshToken = generateSessionId() + generateSessionId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    user.sessions = [
      { sessionId, refreshToken: hashToken(refreshToken), createdAt: new Date(), expiresAt, userAgent, ip, isActive: true },
      ...user.sessions.filter((s: any) => s.isActive).slice(0, 4),
    ]
    user.lastActiveAt = new Date()
    await user.save()

    const accessToken = await createAccessToken(wallet.toLowerCase(), sessionId)
    const refreshTokenJWT = await createRefreshToken(wallet.toLowerCase(), sessionId)

    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 })
    cookieStore.set('refresh_token', refreshTokenJWT, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt })

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins: 0,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        referralCode: user.referralCode,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        referredBy: user.referredBy,
      },
    })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 })
  }
}
EOF

# ============================================
# PART 7: UPDATE AUTH ME
# ============================================
echo "📝 Updating app/api/auth/me/route.ts..."
cat > app/api/auth/me/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ERRORS } from '@/constants'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })
    }

    await connectDB()
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) {
      return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet: user.wallet,
        freeSpins: 0,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        totalReferred: user.totalReferred || 0,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ success: false, error: ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
EOF

# ============================================
# PART 8: UPDATE SPIN API
# ============================================
echo "📝 Updating app/api/spin/route.ts..."
cat > app/api/spin/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, SpinModel, AdminConfigModel, ReferralModel, AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { selectPrizeSlot, getWeekEndingDate, calculateReferralCommission } from '@/lib/utils/prizes'
import { generateReferralLink } from '@/lib/referral'
import { generateTweetIntentUrl } from '@/lib/twitter'
import { ERRORS } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })

    await connectDB()

    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

    const config = await AdminConfigModel.findById('main')
    if (!config || !config.prizeTable?.length) {
      return NextResponse.json({ success: false, error: 'System not configured' }, { status: 500 })
    }

    let spinType: 'free' | 'purchased' | 'bonus' = 'purchased'
    if (user.bonusSpins > 0) spinType = 'bonus'
    else if (user.purchasedSpins > 0) spinType = 'purchased'
    else return NextResponse.json({ success: false, error: ERRORS.NO_SPINS_AVAILABLE }, { status: 400 })

    if (spinType === 'bonus') user.bonusSpins -= 1
    else user.purchasedSpins -= 1

    const { slot, serverSeed, randomValue } = selectPrizeSlot(config.prizeTable)

    let referredBy: string | null = null
    let referralCommission: number | null = null

    if (user.referredBy && config.referralEnabled && slot.type !== 'no_prize') {
      referredBy = user.referredBy
      referralCommission = calculateReferralCommission(slot.amount, config.referralCommissionPercent)
    }

    const spin = await SpinModel.create({
      wallet: payload.wallet,
      spinType,
      serverSeed,
      randomValue,
      slotIndex: slot.slotIndex,
      prizeType: slot.type,
      prizeAmount: slot.amount,
      prizeValueUSD: slot.valueUSD,
      lockDuration: slot.lockDuration || null,
      status: slot.type === 'no_prize' ? 'distributed' : 'pending',
      referredBy,
      referralCommission,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    user.totalSpins += 1
    if (slot.valueUSD > 0) {
      user.totalWinsUSD += slot.valueUSD
      if (slot.valueUSD > user.biggestWinUSD) user.biggestWinUSD = slot.valueUSD
    }
    if (!user.hasCompletedFirstSpin) user.hasCompletedFirstSpin = true
    user.lastActiveAt = new Date()
    await user.save()

    if (referredBy && referralCommission && referralCommission > 0) {
      const referralLink = generateReferralLink(referredBy)
      const tweetIntentUrl = generateTweetIntentUrl({ prizeAmount: slot.amount, prizeUSD: slot.valueUSD, referralLink })

      await AffiliateRewardModel.create({
        referrerWallet: referredBy,
        refereeWallet: payload.wallet,
        fromSpinId: spin._id,
        fromWallet: payload.wallet,
        originalPrizeVICT: slot.amount,
        originalPrizeUSD: slot.valueUSD,
        commissionRate: config.referralCommissionPercent / 100,
        rewardAmountVICT: referralCommission,
        rewardValueUSD: referralCommission * config.victoryPriceUSD,
        tweetStatus: 'pending',
        tweetIntentUrl,
        weekEnding: getWeekEndingDate(),
        payoutStatus: 'pending_tweet',
        status: 'pending',
      })

      await ReferralModel.updateOne(
        { referredWallet: payload.wallet },
        { $inc: { totalSpinsByReferred: 1, totalCommissionVICT: referralCommission }, $set: { lastActivityAt: new Date() } }
      )
    }

    return NextResponse.json({ success: true, data: { spinId: spin._id.toString(), slotIndex: slot.slotIndex } })
  } catch (error) {
    console.error('Spin error:', error)
    return NextResponse.json({ success: false, error: ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })

    await connectDB()
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

    const canSpin = user.purchasedSpins > 0 || user.bonusSpins > 0

    return NextResponse.json({
      success: true,
      data: {
        canSpin,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        freeSpinsAvailable: 0,
        nextFreeSpinAt: null,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        hasCompletedFirstSpin: user.hasCompletedFirstSpin,
        reason: canSpin ? null : ERRORS.NO_SPINS_AVAILABLE,
      },
    })
  } catch (error) {
    console.error('Eligibility check error:', error)
    return NextResponse.json({ success: false, error: ERRORS.INTERNAL_ERROR }, { status: 500 })
  }
}
EOF

# ============================================
# PART 9: REFERRAL API ROUTES
# ============================================
echo "📝 Creating referral API routes..."

cat > app/api/referral/link/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { generateReferralLink } from '@/lib/referral'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()
    const user = await UserModel.findOne({ wallet: payload.wallet })
    
    if (!user?.hasCompletedFirstSpin) {
      return NextResponse.json({ success: false, error: 'Complete first spin to unlock', eligible: false }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      eligible: true,
      link: generateReferralLink(user.wallet),
      code: user.referralCode,
      wallet: user.wallet,
    })
  } catch (error) {
    console.error('Referral link error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > app/api/referral/stats/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { ReferralModel, AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const [referrals, rewards] = await Promise.all([
      ReferralModel.find({ referrerWallet: payload.wallet }),
      AffiliateRewardModel.find({ referrerWallet: payload.wallet }),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalReferred: referrals.length,
        activeReferred: referrals.filter(r => r.isActive !== false).length,
        totalEarningsVICT: rewards.reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
        totalEarningsUSD: rewards.reduce((s, r) => s + (r.rewardValueUSD || 0), 0),
        pendingTweets: rewards.filter(r => r.tweetStatus === 'pending' || r.tweetStatus === 'clicked').length,
        readyForPayout: rewards.filter(r => r.payoutStatus === 'ready').length,
        paidOut: rewards.filter(r => r.payoutStatus === 'paid').length,
        pendingEarningsVICT: rewards.filter(r => r.payoutStatus !== 'paid').reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
      },
    })
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > app/api/referral/earnings/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: any = { referrerWallet: payload.wallet }
    if (status && status !== 'all') query.payoutStatus = status

    const [rewards, total] = await Promise.all([
      AffiliateRewardModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffiliateRewardModel.countDocuments(query),
    ])

    return NextResponse.json({ success: true, rewards, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Referral earnings error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > app/api/referral/apply/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, ReferralModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const { referrerWallet } = await request.json()
    if (!referrerWallet) return NextResponse.json({ success: false, error: 'Referrer required' }, { status: 400 })
    if (referrerWallet.toLowerCase() === payload.wallet.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Cannot refer yourself' }, { status: 400 })
    }

    await connectDB()

    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (user?.referredBy) return NextResponse.json({ success: false, error: 'Already referred', alreadyReferred: true }, { status: 400 })

    const referrer = await UserModel.findOne({ wallet: referrerWallet.toLowerCase(), hasCompletedFirstSpin: true })
    if (!referrer) return NextResponse.json({ success: false, error: 'Invalid referrer' }, { status: 400 })

    await ReferralModel.create({ referrerWallet: referrerWallet.toLowerCase(), referredWallet: payload.wallet })
    await UserModel.updateOne({ wallet: payload.wallet }, { $set: { referredBy: referrerWallet.toLowerCase() } })
    await UserModel.updateOne({ wallet: referrerWallet.toLowerCase() }, { $inc: { totalReferred: 1 } })

    return NextResponse.json({ success: true, message: 'Referral linked' })
  } catch (error) {
    console.error('Apply referral error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > "app/api/referral/tweet-clicked/[rewardId]/route.ts" << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const reward = await AffiliateRewardModel.findById(rewardId)
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (reward.referrerWallet !== payload.wallet) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    if (reward.tweetStatus === 'completed') return NextResponse.json({ success: false, error: 'Already tweeted' }, { status: 400 })

    await AffiliateRewardModel.updateOne({ _id: rewardId }, { $set: { tweetStatus: 'clicked', tweetClickedAt: new Date() } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tweet clicked error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > "app/api/referral/tweet-confirmed/[rewardId]/route.ts" << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const reward = await AffiliateRewardModel.findById(rewardId)
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (reward.referrerWallet !== payload.wallet) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    if (reward.tweetStatus === 'completed') return NextResponse.json({ success: true, alreadyConfirmed: true })

    await AffiliateRewardModel.updateOne({ _id: rewardId }, { $set: { tweetStatus: 'completed', tweetReturnedAt: new Date(), payoutStatus: 'ready' } })

    return NextResponse.json({ success: true, message: 'Tweet confirmed! Ready for payout.' })
  } catch (error) {
    console.error('Tweet confirmed error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

# ============================================
# PART 10: ADMIN AFFILIATE API ROUTES
# ============================================
echo "📝 Creating admin affiliate API routes..."

cat > app/api/admin/affiliates/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: any = {}
    if (statusFilter !== 'all') query.payoutStatus = statusFilter

    const [rewards, total, stats] = await Promise.all([
      AffiliateRewardModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffiliateRewardModel.countDocuments(query),
      Promise.all([
        AffiliateRewardModel.countDocuments({ payoutStatus: 'pending_tweet' }),
        AffiliateRewardModel.countDocuments({ payoutStatus: 'ready' }),
        AffiliateRewardModel.countDocuments({ payoutStatus: 'paid' }),
        AffiliateRewardModel.aggregate([{ $match: { payoutStatus: { $ne: 'paid' } } }, { $group: { _id: null, total: { $sum: '$rewardAmountVICT' } } }]),
        AffiliateRewardModel.aggregate([{ $match: { payoutStatus: { $ne: 'paid' } } }, { $group: { _id: null, total: { $sum: '$rewardValueUSD' } } }]),
      ]),
    ])

    return NextResponse.json({
      success: true,
      rewards,
      stats: {
        pendingTweet: stats[0],
        ready: stats[1],
        paid: stats[2],
        pendingVICT: stats[3][0]?.total || 0,
        pendingUSD: stats[4][0]?.total || 0,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Admin affiliates error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > app/api/admin/affiliates/pending/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const rewards = await AffiliateRewardModel.find({ payoutStatus: 'ready' }).sort({ createdAt: -1 }).lean()

    const byWallet = new Map<string, { wallet: string; rewards: any[]; totalVICT: number; totalUSD: number }>()
    rewards.forEach(r => {
      const existing = byWallet.get(r.referrerWallet) || { wallet: r.referrerWallet, rewards: [], totalVICT: 0, totalUSD: 0 }
      existing.rewards.push(r)
      existing.totalVICT += r.rewardAmountVICT || 0
      existing.totalUSD += r.rewardValueUSD || 0
      byWallet.set(r.referrerWallet, existing)
    })

    return NextResponse.json({
      success: true,
      payoutSheet: Array.from(byWallet.values()),
      totals: {
        totalVICT: rewards.reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
        totalUSD: rewards.reduce((s, r) => s + (r.rewardValueUSD || 0), 0),
        totalRecipients: byWallet.size,
        totalRewards: rewards.length,
      },
    })
  } catch (error) {
    console.error('Admin pending error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > app/api/admin/affiliates/pay/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const { rewardIds, txHash } = await request.json()
    if (!rewardIds?.length) return NextResponse.json({ success: false, error: 'Reward IDs required' }, { status: 400 })

    await connectDB()

    const result = await AffiliateRewardModel.updateMany(
      { _id: { $in: rewardIds }, payoutStatus: 'ready' },
      { $set: { payoutStatus: 'paid', status: 'paid', paidAt: new Date(), paidTxHash: txHash || null } }
    )

    return NextResponse.json({ success: true, message: `Marked ${result.modifiedCount} rewards as paid`, count: result.modifiedCount })
  } catch (error) {
    console.error('Admin pay error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

cat > "app/api/admin/affiliates/[rewardId]/route.ts" << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const reward = await AffiliateRewardModel.findById(rewardId).lean()
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, reward })
  } catch (error) {
    console.error('Admin get reward error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ rewardId: string }> }) {
  try {
    const { rewardId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    const updates = await request.json()
    const allowed = ['payoutStatus', 'tweetStatus', 'paidTxHash', 'paidAt']
    const sanitized: any = {}
    allowed.forEach(f => { if (updates[f] !== undefined) sanitized[f] = updates[f] })

    if (!Object.keys(sanitized).length) return NextResponse.json({ success: false, error: 'No valid fields' }, { status: 400 })

    await connectDB()
    const reward = await AffiliateRewardModel.findByIdAndUpdate(rewardId, { $set: sanitized }, { new: true })
    if (!reward) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, reward })
  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
EOF

echo "✅ API routes created"

# ============================================
# PART 11: REFERRAL COMPONENTS
# ============================================
echo "📝 Creating referral components..."

cat > components/referral/index.ts << 'EOF'
export { default as ReferralBanner } from './ReferralBanner'
export { default as ReferralStats } from './ReferralStats'
export { default as ReferralEarningsTable } from './ReferralEarningsTable'
export { default as TweetToClaimButton } from './TweetToClaimButton'
export { default as ShareButtons } from './ShareButtons'
EOF

cat > components/referral/ReferralBanner.tsx << 'EOF'
'use client'

import { X, Gift, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface ReferralBannerProps {
  referrerWallet: string
  isLinked?: boolean
  onClose?: () => void
}

export default function ReferralBanner({ referrerWallet, isLinked = false, onClose }: ReferralBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  if (!isVisible) return null

  const handleClose = () => { setIsVisible(false); onClose?.() }
  const shortWallet = `${referrerWallet.slice(0, 6)}...${referrerWallet.slice(-4)}`

  return (
    <div className={`flex items-center justify-between px-4 py-3 mb-4 rounded-xl border ${isLinked ? 'bg-green-500/10 border-green-500/30' : 'bg-accent/10 border-accent/30'}`}>
      <div className="flex items-center gap-3">
        {isLinked ? <CheckCircle className="text-green-400 flex-shrink-0" size={20} /> : <Gift className="text-accent flex-shrink-0" size={20} />}
        <div>
          <p className="text-white text-sm font-medium">
            {isLinked ? (
              <>Connected via <span className="text-green-400">{shortWallet}</span></>
            ) : (
              <>You were invited by <span className="text-accent font-semibold">{shortWallet}</span></>
            )}
          </p>
          {!isLinked && <p className="text-text-secondary text-xs">Sign in to link your account & unlock rewards!</p>}
        </div>
      </div>
      <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-text-secondary">
        <X size={18} />
      </button>
    </div>
  )
}
EOF

cat > components/referral/ReferralStats.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, Clock, CheckCircle, Loader2 } from 'lucide-react'

export default function ReferralStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse bg-surface" />)}
      </div>
    )
  }

  const items = [
    { label: 'Total Referred', value: stats?.totalReferred || 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Earned', value: `$${(stats?.totalEarningsUSD || 0).toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Tweets', value: stats?.pendingTweets || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Ready for Payout', value: stats?.readyForPayout || 0, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface border border-border">
          <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
            <item.icon size={20} className={item.color} />
          </div>
          <p className="text-2xl font-bold text-white">{item.value}</p>
          <p className="text-xs text-text-secondary mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
EOF

cat > components/referral/ReferralEarningsTable.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import TweetToClaimButton from './TweetToClaimButton'

export default function ReferralEarningsTable() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/referral/earnings?status=${filter}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEarnings(d.rewards) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  const handleTweetComplete = (id: string) => {
    setEarnings(prev => prev.map(e => e._id === id ? { ...e, tweetStatus: 'completed', payoutStatus: 'ready' } : e))
  }

  const formatWallet = (w: string) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'

  const getStatusBadge = (r: any) => {
    if (r.payoutStatus === 'paid') return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Paid</span>
    if (r.payoutStatus === 'ready') return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">Ready</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Tweet Required</span>
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'pending_tweet', label: 'Pending Tweet' },
    { value: 'ready', label: 'Ready' },
    { value: 'paid', label: 'Paid' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${filter === f.value ? 'bg-accent text-black' : 'bg-surface text-text-secondary border border-border hover:border-white/20'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : earnings.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface border border-border">
          <p className="text-text-secondary">No earnings yet. Share your link to start earning!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {earnings.map(r => (
            <div key={r._id} className="p-4 rounded-xl bg-surface border border-border hover:border-white/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{formatWallet(r.refereeWallet || r.fromWallet)}</span>
                    {getStatusBadge(r)}
                  </div>
                  <p className="text-sm text-text-secondary">
                    Won <span className="text-white">${(r.originalPrizeUSD || 0).toFixed(2)}</span> → 
                    You earn <span className="text-green-400 font-semibold">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                    <span className="text-text-muted ml-2">({(r.rewardAmountVICT || 0).toLocaleString()} VICT)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.payoutStatus === 'pending_tweet' && (
                    <TweetToClaimButton reward={r} onComplete={() => handleTweetComplete(r._id)} />
                  )}
                  {r.payoutStatus === 'paid' && r.paidTxHash && (
                    <a href={`https://suiscan.xyz/tx/${r.paidTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                      View TX
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
EOF

cat > components/referral/TweetToClaimButton.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Twitter, Loader2, Check } from 'lucide-react'

interface Props {
  reward: any
  onComplete: () => void
}

export default function TweetToClaimButton({ reward, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await fetch(`/api/referral/tweet-clicked/${reward._id}`, { method: 'POST' })

      const link = reward.tweetIntentUrl || `https://games.suidex.io?ref=${reward.referrerWallet}`
      const prizeUSD = reward.originalPrizeUSD || reward.rewardValueUSD / 0.1
      const text = `My friend just won $${prizeUSD.toFixed(2)} on the Wheel of Victory! 🎡🔥\n\nI earned $${(prizeUSD * 0.1).toFixed(2)} in referral rewards!\n\nSpin yours 👉 ${link}\n\n@suidexHQ #SuiDex #WheelOfVictory`
      
      const tweetWindow = window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, 'twitter', 'width=550,height=450')

      const check = setInterval(async () => {
        if (tweetWindow?.closed) {
          clearInterval(check)
          await fetch(`/api/referral/tweet-confirmed/${reward._id}`, { method: 'POST' })
          setDone(true)
          onComplete()
          setLoading(false)
        }
      }, 500)

      setTimeout(() => { clearInterval(check); setLoading(false) }, 300000)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30">
        <Check size={16} /> Tweeted
      </span>
    )
  }

  return (
    <button onClick={handleClick} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] disabled:opacity-70 transition-colors">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Twitter size={16} />}
      Tweet to Claim
    </button>
  )
}
EOF

cat > components/referral/ShareButtons.tsx << 'EOF'
'use client'

import { Twitter, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareButtons({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTwitter = () => {
    const text = `🎡 Spin the Wheel of Victory and win crypto prizes!\n\nJoin me on @suidexHQ 👉 ${referralLink}\n\n#SuiDex #WheelOfVictory`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex gap-3">
      <button onClick={handleTwitter} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition-colors">
        <Twitter size={18} /> Share on Twitter
      </button>
      <button onClick={handleCopy} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-accent text-black hover:bg-accent-hover'}`}>
        {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy</>}
      </button>
    </div>
  )
}
EOF

echo "✅ Components created"

# ============================================
# PART 12: REFERRAL PAGE
# ============================================
echo "📝 Creating app/referral/page.tsx..."
cat > app/referral/page.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { ReferralStats, ReferralEarningsTable, ShareButtons } from '@/components/referral'
import { Users, Copy, Check, ArrowLeft, Lock, Loader2 } from 'lucide-react'

export default function ReferralPage() {
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()
  
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account?.address) {
      checkAuthAndEligibility()
    } else {
      setIsAuthenticated(false)
      setEligible(false)
      setLoading(false)
    }
  }, [account?.address])

  const checkAuthAndEligibility = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      
      if (meData.success) {
        setIsAuthenticated(true)
        if (meData.data.hasCompletedFirstSpin) {
          const linkRes = await fetch('/api/referral/link')
          const linkData = await linkRes.json()
          if (linkData.success) {
            setReferralLink(linkData.link)
            setEligible(true)
          }
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!account?.address) return
    setAuthLoading(true)
    setError(null)
    
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account.address }),
      })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)

      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const verifyRes = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: account.address, signature: sig.signature, nonce: nonceData.data.nonce }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setIsAuthenticated(true)
              checkAuthAndEligibility()
            } else {
              setError(verifyData.error || 'Verification failed')
            }
            setAuthLoading(false)
          },
          onError: () => {
            setError('Signature rejected')
            setAuthLoading(false)
          },
        }
      )
    } catch (err: any) {
      setError(err.message)
      setAuthLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 p-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30">
              <Users size={32} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Referral Program</h1>
              <p className="text-text-secondary">Earn 10% of your friends' winnings forever!</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : !account ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Connect Your Wallet</h2>
              <p className="text-text-secondary mb-6">Connect your wallet to access the referral program</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Sign In Required</h2>
              <p className="text-text-secondary mb-6">Sign a message to verify your wallet and access referrals</p>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button onClick={handleSignIn} disabled={authLoading || isSigning} className="px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors">
                {authLoading || isSigning ? 'Signing...' : 'Sign to Continue'}
              </button>
            </div>
          ) : !eligible ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Complete Your First Spin</h2>
              <p className="text-text-secondary mb-6">Spin the wheel once to unlock your referral link!</p>
              <Link href="/wheel" className="inline-flex px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover transition-colors">
                Go to Wheel
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <ReferralStats />

              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-lg font-bold mb-4 text-white">Your Referral Link</h2>
                <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-background border border-border">
                  <input type="text" value={referralLink} readOnly className="flex-1 bg-transparent outline-none text-white font-mono text-sm" />
                  <button onClick={handleCopy} className={`p-3 rounded-lg transition-all ${copied ? 'bg-green-500' : 'bg-accent'} text-black`}>
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <ShareButtons referralLink={referralLink} />
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-lg font-bold mb-4 text-white">Your Earnings</h2>
                <ReferralEarningsTable />
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/30">
                <h3 className="font-bold mb-3 text-accent">How it works</h3>
                <ol className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">1</span>Share your referral link with friends</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">2</span>They sign up and spin the wheel</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">3</span>You automatically earn 10% of every prize they win!</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">4</span>Tweet to claim each reward</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">5</span>Get paid weekly in Victory tokens</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
EOF

# ============================================
# PART 13: REDIRECT PAGE
# ============================================
echo "📝 Creating app/r/[code]/page.tsx..."
cat > "app/r/[code]/page.tsx" << 'EOF'
import { redirect } from 'next/navigation'

export default async function ReferralRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  redirect(`/?ref=${code}`)
}
EOF

# ============================================
# PART 14: ADMIN AFFILIATES PAGE
# ============================================
echo "📝 Creating app/admin/affiliates/page.tsx..."
cat > app/admin/affiliates/page.tsx << 'EOF'
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, DollarSign, Users, Gift, LogOut, RefreshCw, CheckCircle, Clock, XCircle, Twitter, ExternalLink } from 'lucide-react'

interface AffiliateReward {
  _id: string
  referrerWallet: string
  refereeWallet: string
  originalPrizeUSD: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  createdAt: string
}

interface Stats {
  pendingTweet: number
  ready: number
  paid: number
  pendingVICT: number
  pendingUSD: number
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/config', icon: Settings, label: 'Config' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
  { href: '/admin/distribute', icon: Gift, label: 'Distribute' },
  { href: '/admin/affiliates', icon: Users, label: 'Affiliates', active: true },
]

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [rewards, setRewards] = useState<AffiliateReward[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [txHash, setTxHash] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { fetchData() }, [filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/affiliates?status=${filter}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        setRewards(data.rewards)
        setStats(data.stats)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSelectAll = () => {
    const readyIds = rewards.filter(r => r.payoutStatus === 'ready').map(r => r._id)
    setSelectedIds(selectedIds.length === readyIds.length ? [] : readyIds)
  }

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handlePay = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Mark ${selectedIds.length} rewards as paid?`)) return
    
    setPaying(true)
    try {
      const res = await fetch('/api/admin/affiliates/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: selectedIds, txHash: txHash || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Successfully marked ${data.count} rewards as paid!`)
        setSelectedIds([])
        setTxHash('')
        fetchData()
      } else {
        alert(data.error || 'Failed')
      }
    } catch (err) { alert('Network error') }
    setPaying(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const formatWallet = (w: string) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'
  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  const getTweetIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={16} className="text-green-400" />
    if (status === 'clicked') return <Clock size={16} className="text-yellow-400" />
    return <XCircle size={16} className="text-red-400" />
  }

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400">Paid</span>
    if (status === 'ready') return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">Ready</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400">Pending</span>
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border p-4 hidden lg:block">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-accent">SuiDex Admin</h1>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active ? 'bg-accent text-black' : 'text-text-secondary hover:bg-white/5'}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 mt-8 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Affiliate Rewards</h1>
              <p className="text-text-secondary">Manage referral commissions</p>
            </div>
            <button onClick={fetchData} className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-white">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending Tweet</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingTweet}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Ready to Pay</p>
                <p className="text-2xl font-bold text-blue-400">{stats.ready}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending VICT</p>
                <p className="text-2xl font-bold text-white">{stats.pendingVICT.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending USD</p>
                <p className="text-2xl font-bold text-accent">${stats.pendingUSD.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {['all', 'pending_tweet', 'ready', 'paid'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-black' : 'bg-surface text-text-secondary border border-border'}`}>
                {f === 'all' ? 'All' : f === 'pending_tweet' ? 'Pending Tweet' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Bulk Actions */}
          {rewards.some(r => r.payoutStatus === 'ready') && (
            <div className="p-4 rounded-xl mb-4 bg-surface border border-border flex flex-wrap items-center gap-3">
              <button onClick={handleSelectAll} className="px-4 py-2 rounded-lg text-sm bg-background text-white border border-border">
                {selectedIds.length ? 'Deselect All' : 'Select Ready'}
              </button>
              <span className="text-text-secondary text-sm">{selectedIds.length} selected</span>
              <input type="text" placeholder="TX Hash (optional)" value={txHash} onChange={e => setTxHash(e.target.value)} className="px-4 py-2 rounded-lg text-sm bg-background text-white border border-border flex-1 min-w-[200px]" />
              <button onClick={handlePay} disabled={!selectedIds.length || paying} className="px-6 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white disabled:opacity-50">
                {paying ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse bg-surface" />)}
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-12 rounded-xl text-center bg-surface border border-border">
              <Users size={48} className="mx-auto mb-4 text-text-muted" />
              <p className="text-text-secondary">No rewards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">SELECT</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">REFERRER</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">REFEREE</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">PRIZE</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">COMMISSION</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">TWEET</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">STATUS</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r._id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {r.payoutStatus === 'ready' && (
                          <input type="checkbox" checked={selectedIds.includes(r._id)} onChange={() => handleToggle(r._id)} className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-white">{formatWallet(r.referrerWallet)}</td>
                      <td className="py-3 px-4 font-mono text-sm text-text-secondary">{formatWallet(r.refereeWallet)}</td>
                      <td className="py-3 px-4 text-white">${(r.originalPrizeUSD || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400 font-medium">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                        <span className="text-text-muted text-xs ml-1">({(r.rewardAmountVICT || 0).toLocaleString()})</span>
                      </td>
                      <td className="py-3 px-4">{getTweetIcon(r.tweetStatus)}</td>
                      <td className="py-3 px-4">{getStatusBadge(r.payoutStatus)}</td>
                      <td className="py-3 px-4 text-text-secondary text-sm">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
EOF

echo "✅ Admin page created"

# ============================================
# PART 15: UPDATE HEADER
# ============================================
echo "📝 Updating components/shared/Header.tsx..."
cat > components/shared/Header.tsx << 'EOF'
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@mysten/dapp-kit'
import { Menu, X, Gamepad2, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', label: 'Home', icon: null },
    { href: '/wheel', label: 'Wheel', icon: '🎡', highlight: true },
    { href: '/referral', label: 'Referral', icon: <Users className="w-4 h-4" /> },
    { href: '#', label: 'Lottery', icon: '🎟️', disabled: true, badge: 'Soon' },
  ]

  return (
    <header className="sticky top-0 z-40">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
      
      <div className="bg-surface/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:bg-accent/30 transition-colors" />
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent to-secondary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg sm:text-xl font-bold leading-tight">
                  <span className="text-accent">Sui</span>
                  <span className="text-white">Dex</span>
                </span>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase tracking-widest hidden xs:block">Games</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border/50">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${item.disabled ? 'cursor-not-allowed opacity-50' : ''} ${isActive(item.href) ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  {typeof item.icon === 'string' ? <span>{item.icon}</span> : item.icon}
                  <span>{item.label}</span>
                  {item.badge && <span className="px-1.5 py-0.5 text-[10px] bg-secondary/20 text-secondary rounded-full">{item.badge}</span>}
                  {item.highlight && isActive(item.href) && <Sparkles className="w-3 h-3 text-black animate-pulse" />}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="[&_button]:!px-3 [&_button]:!py-2 [&_button]:!text-xs sm:[&_button]:!px-4 sm:[&_button]:!py-2 sm:[&_button]:!text-sm [&_button]:!rounded-lg sm:[&_button]:!rounded-xl">
                <ConnectButton connectText="Connect" />
              </div>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-border/50 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => !item.disabled && setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isActive(item.href) ? 'bg-accent/10 text-accent border border-accent/30' : 'text-text-secondary hover:bg-white/5'}`}
                >
                  {typeof item.icon === 'string' ? <span className="text-xl">{item.icon}</span> : item.icon}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && <span className="ml-auto px-2 py-0.5 text-xs bg-secondary/20 text-secondary rounded-full">{item.badge}</span>}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
EOF

# ============================================
# PART 16: UPDATE LANDING PAGE
# ============================================
echo "📝 Updating app/page.tsx..."
cat > app/page.tsx << 'EOF'
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { GAMES } from '@/constants'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { GameCard } from '@/components/ui/GameCard'
import { ReferralBanner } from '@/components/referral'
import { Users, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const searchParams = useSearchParams()
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()
  
  const [referrer, setReferrer] = useState<string | null>(null)
  const [isLinked, setIsLinked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Handle referral from URL
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('suidex_referrer', ref)
      setReferrer(ref)
    } else {
      const stored = localStorage.getItem('suidex_referrer')
      if (stored) setReferrer(stored)
    }
  }, [searchParams])

  // Check auth and if already linked
  useEffect(() => {
    if (account?.address) {
      checkAuth()
    } else {
      setIsAuthenticated(false)
      setIsLinked(false)
    }
  }, [account?.address])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setIsAuthenticated(true)
        if (data.data.referredBy) {
          setIsLinked(true)
          localStorage.removeItem('suidex_referrer')
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSignIn = async () => {
    if (!account?.address) return
    setAuthLoading(true)
    
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account.address }),
      })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)

      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const storedRef = localStorage.getItem('suidex_referrer')
            const verifyRes = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet: account.address,
                signature: sig.signature,
                nonce: nonceData.data.nonce,
                referrer: storedRef || undefined,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setIsAuthenticated(true)
              if (verifyData.data.referredBy) {
                setIsLinked(true)
                setReferrer(verifyData.data.referredBy)
                localStorage.removeItem('suidex_referrer')
              }
            }
            setAuthLoading(false)
          },
          onError: () => setAuthLoading(false),
        }
      )
    } catch (err) {
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Referral Banner */}
        {referrer && (
          <div className="max-w-6xl mx-auto px-4 pt-4">
            <ReferralBanner 
              referrerWallet={referrer} 
              isLinked={isLinked}
              onClose={() => { setReferrer(null); localStorage.removeItem('suidex_referrer') }}
            />
            {!isAuthenticated && account && (
              <button 
                onClick={handleSignIn}
                disabled={authLoading || isSigning}
                className="w-full mb-4 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {authLoading || isSigning ? 'Signing...' : 'Sign in to Link Referral & Get Benefits'}
              </button>
            )}
          </div>
        )}

        {/* Hero Section */}
        <section className="relative py-16 sm:py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl opacity-20" />
          
          <div className="relative max-w-6xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">SuiDex</span>{' '}
              <span className="text-text-primary">Games</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-8">
              Spin to win Victory tokens! Free daily spins for stakers.
              Part of the SuiDex ecosystem.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/wheel" className="btn btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 glow">
                Play Now
              </Link>
              <a href="https://suidex.org" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Visit SuiDex
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              <StatItem label="Total Prizes Won" value="$12,450" />
              <StatItem label="Total Spins" value="8,234" />
              <StatItem label="Active Players" value="542" />
              <StatItem label="Top Prize" value="$3,500" />
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center">
              Available Games
            </h2>
            <p className="text-text-secondary text-center mb-8 sm:mb-12">
              Choose a game to start playing
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {GAMES.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-center">
              How It Works
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              <StepCard number={1} title="Connect Wallet" description="Connect your SUI wallet to get started. We support all major wallets." />
              <StepCard number={2} title="Get Spins" description="Stake $20+ in Victory pools for free daily spins, or purchase spins with SUI." />
              <StepCard number={3} title="Win Prizes" description="Spin the wheel and win Victory tokens, SuiTrump, and more!" />
            </div>
          </div>
        </section>

        {/* Referral CTA */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card p-6 sm:p-8 md:p-12 card-glow rounded-2xl bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent border border-accent/30">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-white">
                    Refer Friends, Earn{' '}<span className="text-accent">10%</span> Forever
                  </h2>
                  <p className="text-text-secondary mb-4 sm:mb-6">
                    Share your referral link and earn 10% of all prizes won by your friends.
                    Paid weekly in Victory tokens!
                  </p>
                  <Link href="/referral" className="inline-flex items-center gap-2 btn btn-primary px-6 py-3 rounded-xl font-semibold">
                    Start Earning <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-accent mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-text-secondary">{label}</div>
    </div>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
        <span className="font-display text-xl sm:text-2xl font-bold text-accent">{number}</span>
      </div>
      <h3 className="font-display text-lg sm:text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-text-secondary text-sm sm:text-base">{description}</p>
    </div>
  )
}
EOF

echo "✅ Landing page updated"

# ============================================
# PART 17: UPDATE ADMIN DASHBOARD (Add Affiliates Link)
# ============================================
echo "📝 Updating app/admin/dashboard/page.tsx (adding Affiliates link)..."

# We need to add Affiliates to the nav items in dashboard
# Using sed to add the nav item (this is a simple approach)
if grep -q "Distribute" app/admin/dashboard/page.tsx; then
  sed -i.bak "s/{ href: '\/admin\/distribute', icon: Gift, label: 'Distribute' },/{ href: '\/admin\/distribute', icon: Gift, label: 'Distribute' },\n  { href: '\/admin\/affiliates', icon: Users, label: 'Affiliates' },/" app/admin/dashboard/page.tsx
  rm -f app/admin/dashboard/page.tsx.bak
  echo "✅ Added Affiliates to admin dashboard nav"
else
  echo "⚠️  Could not auto-add Affiliates link. Please add manually to admin dashboard."
fi

# ============================================
# DONE!
# ============================================
echo ""
echo "============================================"
echo "🎉 REFERRAL SYSTEM SETUP COMPLETE!"
echo "============================================"
echo ""
echo "📁 Created/Updated files:"
echo "   ✅ types/referral.ts"
echo "   ✅ lib/referral.ts"
echo "   ✅ lib/twitter.ts"
echo "   ✅ lib/db/models/User.ts"
echo "   ✅ lib/db/models/AffiliateReward.ts"
echo "   ✅ app/api/auth/verify/route.ts"
echo "   ✅ app/api/auth/me/route.ts"
echo "   ✅ app/api/spin/route.ts"
echo "   ✅ app/api/referral/link/route.ts"
echo "   ✅ app/api/referral/stats/route.ts"
echo "   ✅ app/api/referral/earnings/route.ts"
echo "   ✅ app/api/referral/apply/route.ts"
echo "   ✅ app/api/referral/tweet-clicked/[rewardId]/route.ts"
echo "   ✅ app/api/referral/tweet-confirmed/[rewardId]/route.ts"
echo "   ✅ app/api/admin/affiliates/route.ts"
echo "   ✅ app/api/admin/affiliates/pending/route.ts"
echo "   ✅ app/api/admin/affiliates/pay/route.ts"
echo "   ✅ app/api/admin/affiliates/[rewardId]/route.ts"
echo "   ✅ components/referral/index.ts"
echo "   ✅ components/referral/ReferralBanner.tsx"
echo "   ✅ components/referral/ReferralStats.tsx"
echo "   ✅ components/referral/ReferralEarningsTable.tsx"
echo "   ✅ components/referral/TweetToClaimButton.tsx"
echo "   ✅ components/referral/ShareButtons.tsx"
echo "   ✅ app/referral/page.tsx"
echo "   ✅ app/r/[code]/page.tsx"
echo "   ✅ app/admin/affiliates/page.tsx"
echo "   ✅ components/shared/Header.tsx"
echo "   ✅ app/page.tsx"
echo ""
echo "🚀 Next steps:"
echo "   1. Drop your MongoDB database (to clear old schema)"
echo "   2. npm run build"
echo "   3. npm run dev"
echo "   4. Seed admin: POST /api/admin/seed"
echo ""
echo "📌 Flow:"
echo "   1. User visits games.suidex.io?ref=WALLET"
echo "   2. Sees banner: 'You were invited by...'"
echo "   3. Signs in → referral linked"
echo "   4. Spins wheel → hasCompletedFirstSpin=true"
echo "   5. Visits /referral → gets their own link"
echo "   6. Friend wins → auto 10% commission"
echo "   7. Tweet to claim → status=ready"
echo "   8. Admin pays at /admin/affiliates"
echo ""