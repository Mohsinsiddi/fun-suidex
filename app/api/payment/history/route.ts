// ============================================
// Payment History API
// ============================================
// GET /api/payment/history - User's purchase/payment history

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { ChainTransactionModel } from '@/lib/db/models'
import { withAuth, AuthContext } from '@/lib/auth/withAuth'
import { errors, success } from '@/lib/utils/apiResponse'

const VALID_FILTERS = ['all', 'credited', 'uncredited', 'pending'] as const
type Filter = (typeof VALID_FILTERS)[number]

export const GET = withAuth(async (request: NextRequest, { wallet }: AuthContext) => {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit
    const filter = (VALID_FILTERS.includes(searchParams.get('filter') as Filter)
      ? searchParams.get('filter')
      : 'all') as Filter

    // Base: transactions where this user is sender OR claimedBy
    const walletLower = wallet.toLowerCase()
    const baseCondition = {
      $or: [{ sender: walletLower }, { claimedBy: walletLower }],
    }

    // Apply filter
    let query: Record<string, unknown>
    switch (filter) {
      case 'credited':
        query = { ...baseCondition, creditStatus: 'credited' }
        break
      case 'uncredited':
        query = { ...baseCondition, creditStatus: { $in: ['new', 'unclaimed'] } }
        break
      case 'pending':
        query = { ...baseCondition, creditStatus: { $in: ['pending_approval', 'rejected'] } }
        break
      default:
        query = baseCondition
    }

    const [transactions, total] = await Promise.all([
      ChainTransactionModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('txHash sender amountSUI amountMIST creditStatus spinsCredited timestamp claimedAt rateAtClaim adminNote manualCredit')
        .lean(),
      ChainTransactionModel.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limit)

    const items = transactions.map((tx) => ({
      txHash: tx.txHash,
      amountSUI: tx.amountSUI,
      amountMIST: tx.amountMIST,
      creditStatus: tx.creditStatus,
      spinsCredited: tx.spinsCredited,
      timestamp: tx.timestamp,
      claimedAt: tx.claimedAt,
      rateAtClaim: tx.rateAtClaim,
      adminNote: tx.adminNote,
      manualCredit: tx.manualCredit || false,
    }))

    const responseData: Record<string, unknown> = {
      items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    }

    // Stats on first page of "all" filter only
    if (page === 1 && filter === 'all') {
      const statsResult = await ChainTransactionModel.aggregate([
        { $match: baseCondition },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalSUI: { $sum: '$amountSUI' },
            totalSpinsCredited: {
              $sum: { $cond: [{ $eq: ['$creditStatus', 'credited'] }, '$spinsCredited', 0] },
            },
          },
        },
      ])

      responseData.stats = statsResult[0]
        ? {
            totalPayments: statsResult[0].totalPayments,
            totalSUI: statsResult[0].totalSUI,
            totalSpinsCredited: statsResult[0].totalSpinsCredited,
          }
        : { totalPayments: 0, totalSUI: 0, totalSpinsCredited: 0 }
    }

    return success(responseData)
  } catch (error) {
    console.error('Payment history error:', error)
    return errors.internal()
  }
})
