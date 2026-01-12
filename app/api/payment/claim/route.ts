// ============================================
// Payment Claim API
// ============================================
// POST /api/payment/claim - Claim spins from a TX
// GET /api/payment/scan - Scan for user's unclaimed TXs

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, PaymentModel, AdminConfigModel } from '@/lib/db/models'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { verifyPayment, getIncomingTransactions } from '@/lib/sui/client'
import { ERRORS } from '@/constants'

// ============================================
// POST - Claim spins from a transaction
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
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'System not configured' },
        { status: 500 }
      )
    }

    // Get request body
    const body = await request.json()
    const { txHash } = body

    if (!txHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    // Check if already claimed
    const existingPayment = await PaymentModel.findOne({ txHash })
    if (existingPayment) {
      if (existingPayment.claimStatus === 'claimed') {
        return NextResponse.json(
          { success: false, error: ERRORS.PAYMENT_ALREADY_CLAIMED },
          { status: 400 }
        )
      }
      if (existingPayment.claimStatus === 'pending_approval') {
        return NextResponse.json({
          success: false,
          error: 'This payment is pending admin approval',
          data: { status: 'pending_approval' },
        })
      }
    }

    // Verify the payment on chain
    const tx = await verifyPayment(
      txHash,
      payload.wallet,
      config.adminWalletAddress,
      config.minPaymentSUI
    )

    if (!tx) {
      return NextResponse.json(
        { success: false, error: ERRORS.PAYMENT_NOT_FOUND },
        { status: 400 }
      )
    }

    // Check lookback period
    const lookbackMs = config.paymentLookbackHours * 60 * 60 * 1000
    const cutoffDate = new Date(Date.now() - lookbackMs)
    if (tx.timestamp < cutoffDate) {
      return NextResponse.json({
        success: false,
        error: `Transaction is too old. Payments must be within ${config.paymentLookbackHours} hours.`,
      })
    }

    // Calculate spins
    const spinsCredited = Math.floor(tx.amountSUI / config.spinRateSUI)
    
    if (spinsCredited <= 0) {
      return NextResponse.json({
        success: false,
        error: `Payment too small. Minimum is ${config.spinRateSUI} SUI for 1 spin.`,
      })
    }

    // Check if requires admin approval (> 10 SUI)
    const requiresApproval = tx.amountSUI > config.autoApprovalLimitSUI

    // Create or update payment record
    const payment = await PaymentModel.findOneAndUpdate(
      { txHash },
      {
        $setOnInsert: {
          txHash,
          senderWallet: tx.sender,
          recipientWallet: tx.recipient,
          amountMIST: tx.amountMIST,
          amountSUI: tx.amountSUI,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          discoveredAt: new Date(),
        },
        $set: {
          claimStatus: requiresApproval ? 'pending_approval' : 'claimed',
          claimedBy: payload.wallet,
          claimedAt: new Date(),
          spinsCredited: requiresApproval ? 0 : spinsCredited,
          rateAtClaim: config.spinRateSUI,
        },
      },
      { upsert: true, new: true }
    )

    if (requiresApproval) {
      return NextResponse.json({
        success: true,
        message: `Payment of ${tx.amountSUI} SUI detected. Pending admin approval for ${spinsCredited} spins.`,
        data: {
          status: 'pending_approval',
          amountSUI: tx.amountSUI,
          potentialSpins: spinsCredited,
          txHash,
        },
      })
    }

    // Credit spins to user
    user.purchasedSpins += spinsCredited
    await user.save()

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${spinsCredited} spins!`,
      data: {
        status: 'claimed',
        amountSUI: tx.amountSUI,
        spinsCredited,
        newBalance: user.purchasedSpins,
        txHash,
      },
    })
  } catch (error) {
    console.error('Payment claim error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}

// ============================================
// GET - Scan for unclaimed transactions
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

    // Get config
    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'System not configured' },
        { status: 500 }
      )
    }

    // Calculate time range
    const lookbackMs = config.paymentLookbackHours * 60 * 60 * 1000
    const fromDate = new Date(Date.now() - lookbackMs)

    // Get transactions from chain
    const transactions = await getIncomingTransactions(
      config.adminWalletAddress,
      fromDate
    )

    // Filter for this user's transactions
    const userTxs = transactions.filter(
      (tx) => tx.sender.toLowerCase() === payload.wallet.toLowerCase()
    )

    // Check which are already claimed
    const txHashes = userTxs.map((tx) => tx.txHash)
    const claimedPayments = await PaymentModel.find({
      txHash: { $in: txHashes },
    })
    const claimedHashes = new Set(claimedPayments.map((p) => p.txHash))

    // Build response
    const unclaimedTxs = userTxs
      .filter((tx) => !claimedHashes.has(tx.txHash))
      .map((tx) => ({
        txHash: tx.txHash,
        amountSUI: tx.amountSUI,
        suggestedSpins: Math.floor(tx.amountSUI / config.spinRateSUI),
        timestamp: tx.timestamp,
        requiresApproval: tx.amountSUI > config.autoApprovalLimitSUI,
      }))

    return NextResponse.json({
      success: true,
      data: {
        unclaimed: unclaimedTxs,
        rate: config.spinRateSUI,
        adminWallet: config.adminWalletAddress,
        lookbackHours: config.paymentLookbackHours,
      },
    })
  } catch (error) {
    console.error('Payment scan error:', error)
    return NextResponse.json(
      { success: false, error: ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
