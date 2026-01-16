// ============================================
// Payment Claim API
// ============================================
// POST /api/payment/claim - Claim spins from a TX
// GET /api/payment/claim - Scan for user's unclaimed TXs

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, PaymentModel, AdminConfigModel } from '@/lib/db/models'
import { verifyPayment, getIncomingTransactions } from '@/lib/sui/client'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { validateBody, paymentClaimSchema } from '@/lib/validations'
import { errors, success } from '@/lib/utils/apiResponse'
import { ERRORS } from '@/constants'

// ============================================
// POST - Claim spins from a transaction
// ============================================

export const POST = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    // Rate limit check
    const rateLimit = checkRateLimit(request, 'payment')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    // Validate request body
    const { data, error } = await validateBody(request, paymentClaimSchema)
    if (error) return error

    const { txHash } = data

    await connectDB()

    // Get user
    const user = await UserModel.findOne({ wallet })
    if (!user) {
      return errors.unauthorized()
    }

    // Get config
    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return errors.notConfigured()
    }

    // Check if already claimed
    const existingPayment = await PaymentModel.findOne({ txHash })
    if (existingPayment) {
      if (existingPayment.claimStatus === 'claimed') {
        return errors.conflict(ERRORS.PAYMENT_ALREADY_CLAIMED)
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
      wallet,
      config.adminWalletAddress,
      config.minPaymentSUI
    )

    if (!tx) {
      return errors.badRequest(ERRORS.PAYMENT_NOT_FOUND)
    }

    // Check lookback period
    const lookbackMs = config.paymentLookbackHours * 60 * 60 * 1000
    const cutoffDate = new Date(Date.now() - lookbackMs)
    if (tx.timestamp < cutoffDate) {
      return errors.badRequest(
        `Transaction is too old. Payments must be within ${config.paymentLookbackHours} hours.`
      )
    }

    // Calculate spins
    const spinsCredited = Math.floor(tx.amountSUI / config.spinRateSUI)

    if (spinsCredited <= 0) {
      return errors.badRequest(
        `Payment too small. Minimum is ${config.spinRateSUI} SUI for 1 spin.`
      )
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
          claimedBy: wallet,
          claimedAt: new Date(),
          spinsCredited: requiresApproval ? 0 : spinsCredited,
          rateAtClaim: config.spinRateSUI,
        },
      },
      { upsert: true, new: true }
    )

    if (requiresApproval) {
      return success({
        status: 'pending_approval',
        message: `Payment of ${tx.amountSUI} SUI detected. Pending admin approval for ${spinsCredited} spins.`,
        amountSUI: tx.amountSUI,
        potentialSpins: spinsCredited,
        txHash,
      })
    }

    // Credit spins to user
    user.purchasedSpins += spinsCredited
    await user.save()

    return success({
      status: 'claimed',
      message: `Successfully claimed ${spinsCredited} spins!`,
      amountSUI: tx.amountSUI,
      spinsCredited,
      newBalance: user.purchasedSpins,
      txHash,
    })
  } catch (error) {
    console.error('Payment claim error:', error)
    return errors.internal()
  }
})

// ============================================
// GET - Scan for unclaimed transactions
// ============================================

export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    await connectDB()

    // Get config
    const config = await AdminConfigModel.findById('main')
    if (!config) {
      return errors.notConfigured()
    }

    // Calculate time range
    const lookbackMs = config.paymentLookbackHours * 60 * 60 * 1000
    const fromDate = new Date(Date.now() - lookbackMs)

    // Get transactions from chain
    const transactions = await getIncomingTransactions(config.adminWalletAddress, fromDate)

    // Filter for this user's transactions
    const userTxs = transactions.filter(
      (tx) => tx.sender.toLowerCase() === wallet.toLowerCase()
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

    return success({
      unclaimed: unclaimedTxs,
      rate: config.spinRateSUI,
      adminWallet: config.adminWalletAddress,
      lookbackHours: config.paymentLookbackHours,
    })
  } catch (error) {
    console.error('Payment scan error:', error)
    return errors.internal()
  }
})
