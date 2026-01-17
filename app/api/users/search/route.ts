// ============================================
// User Search API
// ============================================
// GET /api/users/search?q=... - Search users by slug or wallet

import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel } from '@/lib/db/models'
import { errors, success } from '@/lib/utils/apiResponse'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const rateLimit = checkRateLimit(request, 'read')
    if (!rateLimit.allowed) {
      return errors.rateLimited(rateLimit.resetIn)
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20)

    if (!query || query.length < 2) {
      return errors.badRequest('Search query must be at least 2 characters')
    }

    await connectDB()

    // Search by slug (username) or wallet address
    const isWalletSearch = query.startsWith('0x') && query.length > 10

    let users
    if (isWalletSearch) {
      // Exact wallet match (case-insensitive)
      users = await UserModel.find({
        wallet: query.toLowerCase(),
        isProfilePublic: true,
      })
        .select('wallet profileSlug totalSpins totalWinsUSD')
        .limit(1)
        .lean()
    } else {
      // Slug search (prefix match, case-insensitive)
      users = await UserModel.find({
        profileSlug: { $regex: `^${query}`, $options: 'i' },
        isProfilePublic: true,
      })
        .select('wallet profileSlug totalSpins totalWinsUSD')
        .sort({ totalSpins: -1 })
        .limit(limit)
        .lean()
    }

    return success({
      users: users.map(u => ({
        wallet: u.wallet,
        slug: u.profileSlug,
        totalSpins: u.totalSpins,
        totalWinsUSD: u.totalWinsUSD,
      })),
      count: users.length,
    })
  } catch (error) {
    console.error('User search error:', error)
    return errors.internal('Search failed')
  }
}
