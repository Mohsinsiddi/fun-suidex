// ============================================
// Spin API
// ============================================
// POST /api/spin - Execute a spin
// GET /api/spin - Get spin eligibility

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import {
  UserModel,
  SpinModel,
  AdminConfigModel,
  ReferralModel,
  AffiliateRewardModel,
} from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { selectPrizeSlot, getWeekEndingDate, calculateReferralCommission } from '@/lib/utils/prizes'
import { ERRORS } from '@/constants'

// ============================================
// POST - Execute a spin
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    await connectDB()

    // Get user
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    // Get config
    const config = await AdminConfigModel.findById('main')
    if (!config || !config.prizeTable?.length) {
      return NextResponse.json(
        { success: false, error: 'System not configured' },
        { status: 500 }
      )
    }

    // Determine spin type and check eligibility
    const body = await request.json().catch(() => ({}))

    let spinType: 'free' | 'purchased' | 'bonus' = 'purchased'
    
    // Auto-select available spin type (priority: bonus > purchased)
    if (user.bonusSpins > 0) {
      spinType = 'bonus'
    } else if (user.purchasedSpins > 0) {
      spinType = 'purchased'
    } else {
      // No spins available
      return NextResponse.json(
        { success: false, error: ERRORS.NO_SPINS_AVAILABLE },
        { status: 400 }
      )
    }

    // Deduct spin
    if (spinType === 'bonus') {
      user.bonusSpins -= 1
    } else {
      user.purchasedSpins -= 1
    }

    // Select prize
    const { slot, serverSeed, randomValue } = selectPrizeSlot(config.prizeTable)

    // Get referrer if any
    let referredBy: string | null = null
    let referralCommission: number | null = null

    if (user.referredBy && config.referralEnabled && slot.type !== 'no_prize') {
      referredBy = user.referredBy
      referralCommission = calculateReferralCommission(
        slot.amount,
        config.referralCommissionPercent
      )
    }

    // Create spin record
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

    // Update user stats
    user.totalSpins += 1
    if (slot.valueUSD > 0) {
      user.totalWinsUSD += slot.valueUSD
      if (slot.valueUSD > user.biggestWinUSD) {
        user.biggestWinUSD = slot.valueUSD
      }
    }
    user.lastActiveAt = new Date()
    await user.save()

    // Create affiliate reward if applicable
    if (referredBy && referralCommission && referralCommission > 0) {
      await AffiliateRewardModel.create({
        referrerWallet: referredBy,
        fromSpinId: spin._id,
        fromWallet: payload.wallet,
        rewardAmountVICT: referralCommission,
        rewardValueUSD: referralCommission * config.victoryPriceUSD,
        weekEnding: getWeekEndingDate(),
        status: 'pending',
      })

      // Update referral stats
      await ReferralModel.updateOne(
        { referredWallet: payload.wallet },
        {
          $inc: {
            totalSpinsByReferred: 1,
            totalCommissionVICT: referralCommission,
          },
          $set: { lastActivityAt: new Date() },
        }
      )
    }

    // Return result (two-step reveal - just slotIndex first)
    return NextResponse.json({
      success: true,
      data: {
        spinId: spin._id.toString(),
        slotIndex: slot.slotIndex,
      },
    })
  } catch (error) {
    console.error('Spin error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}

// ============================================
// GET - Get spin eligibility
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify user session
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: ERRORS.SESSION_EXPIRED },
        { status: 401 }
      )
    }

    await connectDB()

    // Get user
    const user = await UserModel.findOne({ wallet: payload.wallet })
    if (!user) {
      return NextResponse.json(
        { success: false, error: ERRORS.UNAUTHORIZED },
        { status: 401 }
      )
    }

    // Get config for free spin eligibility check
    const config = await AdminConfigModel.findById('main')

    // Check free spin eligibility
    // TODO: Implement actual staking check
    const freeSpinsAvailable = 0 // Placeholder
    const nextFreeSpinAt = null // Placeholder

    const canSpin =
      user.purchasedSpins > 0 ||
      user.bonusSpins > 0 ||
      freeSpinsAvailable > 0

    return NextResponse.json({
      success: true,
      data: {
        canSpin,
        purchasedSpins: user.purchasedSpins,
        bonusSpins: user.bonusSpins,
        freeSpinsAvailable,
        nextFreeSpinAt,
        totalSpins: user.totalSpins,
        totalWinsUSD: user.totalWinsUSD,
        reason: canSpin ? null : ERRORS.NO_SPINS_AVAILABLE,
      },
    })
  } catch (error) {
    console.error('Eligibility check error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
