import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, SpinModel, AdminConfigModel, ReferralModel, AffiliateRewardModel, UserProfileModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { selectPrizeSlot, getWeekEndingDate, calculateReferralCommission } from '@/lib/utils/prizes'
import { generateReferralLink } from '@/lib/referral'
import { generateTweetIntentUrl } from '@/lib/twitter'
import { updateStreak, checkAndAwardBadges } from '@/lib/badges'
import { checkWalletAndIPRateLimit } from '@/lib/utils/rateLimit'
import { ERRORS } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })

    const payload = await verifyAccessToken(token)
    if (!payload) return NextResponse.json({ success: false, error: ERRORS.SESSION_EXPIRED }, { status: 401 })

    // Rate limit by both wallet AND IP
    const rateCheck = checkWalletAndIPRateLimit(request, payload.wallet, 'spin')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait before spinning again.',
          retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        }
      )
    }

    await connectDB()

    // Get config first
    const config = await AdminConfigModel.findById('main')
    if (!config || !config.prizeTable?.length) {
      return NextResponse.json({ success: false, error: 'System not configured' }, { status: 500 })
    }

    // ATOMIC: Determine spin type and decrement in one operation
    // Try bonus spins first, then purchased spins
    let user = await UserModel.findOneAndUpdate(
      { wallet: payload.wallet, bonusSpins: { $gt: 0 } },
      { $inc: { bonusSpins: -1 } },
      { new: true }
    )
    let spinType: 'free' | 'purchased' | 'bonus' = 'bonus'

    if (!user) {
      // No bonus spins, try purchased spins
      user = await UserModel.findOneAndUpdate(
        { wallet: payload.wallet, purchasedSpins: { $gt: 0 } },
        { $inc: { purchasedSpins: -1 } },
        { new: true }
      )
      spinType = 'purchased'
    }

    if (!user) {
      // Check if user exists but has no spins
      const existingUser = await UserModel.findOne({ wallet: payload.wallet })
      if (!existingUser) {
        return NextResponse.json({ success: false, error: ERRORS.UNAUTHORIZED }, { status: 401 })
      }
      return NextResponse.json({ success: false, error: ERRORS.NO_SPINS_AVAILABLE }, { status: 400 })
    }

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

    // Update user stats (separate from spin deduction - these are non-critical)
    const statsUpdate: Record<string, any> = {
      $inc: { totalSpins: 1 },
      $set: { hasCompletedFirstSpin: true, lastActiveAt: new Date() },
    }
    if (slot.valueUSD > 0) {
      statsUpdate.$inc.totalWinsUSD = slot.valueUSD
      // Update biggest win if this is larger
      await UserModel.updateOne(
        { wallet: payload.wallet, biggestWinUSD: { $lt: slot.valueUSD } },
        { $set: { biggestWinUSD: slot.valueUSD } }
      )
    }
    await UserModel.updateOne({ wallet: payload.wallet }, statsUpdate)

    // Update streak, badges, and profile stats (non-blocking)
    Promise.all([
      updateStreak(payload.wallet),
      checkAndAwardBadges(payload.wallet),
      // Update profile stats if user has a profile
      UserProfileModel.updateOne(
        { wallet: payload.wallet },
        {
          $inc: { 'stats.totalSpins': 1, 'stats.totalWinsUSD': slot.valueUSD || 0 },
          $set: { 'stats.lastActive': new Date() },
          $max: { 'stats.biggestWinUSD': slot.valueUSD || 0 },
        }
      ),
    ]).catch(err => console.error('Badge/streak/profile update error:', err))

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

    // Re-fetch user to get accurate spin counts after all updates
    const updatedUser = await UserModel.findOne({ wallet: payload.wallet }).lean()

    return NextResponse.json({
      success: true,
      data: {
        spinId: String(spin._id),
        slotIndex: slot.slotIndex,
        // Include updated spin counts so client doesn't need to refetch
        spins: {
          free: 0, // freeSpins are always 0 (no longer used)
          purchased: updatedUser?.purchasedSpins ?? 0,
          bonus: updatedUser?.bonusSpins ?? 0,
        },
        // Include updated stats
        stats: {
          totalSpins: updatedUser?.totalSpins ?? 0,
          totalWinsUSD: updatedUser?.totalWinsUSD ?? 0,
          biggestWinUSD: updatedUser?.biggestWinUSD ?? 0,
          currentStreak: updatedUser?.currentStreak ?? 0,
          longestStreak: updatedUser?.longestStreak ?? 0,
        }
      }
    })
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
