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

    return NextResponse.json({ success: true, data: { spinId: String(spin._id), slotIndex: slot.slotIndex } })
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
