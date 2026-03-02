// ============================================
// Admin LP Credits Summary API - Aggregated Stats
// ============================================

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { LPCreditModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const [result] = await LPCreditModel.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalCredits: { $sum: 1 },
                totalSpinsCredited: { $sum: '$spinsCredited' },
                totalAmountUSD: { $sum: '$amountUSD' },
                uniqueWallets: { $addToSet: '$wallet' },
              },
            },
            {
              $project: {
                _id: 0,
                totalCredits: 1,
                totalSpinsCredited: 1,
                totalAmountUSD: { $round: ['$totalAmountUSD', 2] },
                uniqueWallets: { $size: '$uniqueWallets' },
              },
            },
          ],
          byEventType: [
            {
              $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                spins: { $sum: '$spinsCredited' },
                usd: { $sum: '$amountUSD' },
              },
            },
          ],
          byPair: [
            {
              $group: {
                _id: '$pair',
                count: { $sum: 1 },
                spins: { $sum: '$spinsCredited' },
                usd: { $sum: '$amountUSD' },
              },
            },
          ],
          reversed: [
            { $match: { status: 'reversed' } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spins: { $sum: '$spinsCredited' },
              },
            },
          ],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])

    const totals = result?.totals[0] || {
      totalCredits: 0,
      totalSpinsCredited: 0,
      totalAmountUSD: 0,
      uniqueWallets: 0,
    }

    // Convert byEventType array to object
    const byEventType: Record<string, { count: number; spins: number; usd: number }> = {}
    for (const item of result?.byEventType || []) {
      byEventType[item._id] = { count: item.count, spins: item.spins, usd: Math.round(item.usd * 100) / 100 }
    }

    // Convert byPair array to object
    const byPair: Record<string, { count: number; spins: number; usd: number }> = {}
    for (const item of result?.byPair || []) {
      byPair[item._id] = { count: item.count, spins: item.spins, usd: Math.round(item.usd * 100) / 100 }
    }

    const reversed = result?.reversed[0] || { count: 0, spins: 0 }

    // Status counts for tabs
    const statusCounts: Record<string, number> = {}
    for (const item of result?.statusCounts || []) {
      statusCounts[item._id] = item.count
    }

    return NextResponse.json({
      success: true,
      data: {
        ...totals,
        byEventType,
        byPair,
        reversed: { count: reversed.count, spins: reversed.spins },
        statusCounts,
      },
    })
  } catch (error) {
    console.error('Admin LP credits summary error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
