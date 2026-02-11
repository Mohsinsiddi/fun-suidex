// ============================================
// Token Prices API
// ============================================
// GET /api/prices - Live token prices via Noodles API (5-min cache)

import { NextResponse } from 'next/server'
import { getTokenPrices } from '@/lib/utils/prices'

export async function GET() {
  try {
    const prices = await getTokenPrices()

    if (prices.vict === 0 && prices.trump === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch token prices' },
        { status: 502 }
      )
    }

    const isCached = Date.now() - prices.updatedAt < 1000 // freshly fetched if <1s old

    return NextResponse.json({
      success: true,
      data: prices,
      cached: isCached,
    })
  } catch (error) {
    console.error('[prices] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token prices' },
      { status: 500 }
    )
  }
}
