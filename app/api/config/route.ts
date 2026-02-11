// ============================================
// Public Config API
// ============================================
// GET /api/config - Returns public config (no auth required)

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { AdminConfigModel } from '@/lib/db/models'
import { getTokenPrices } from '@/lib/utils/prices'

export async function GET() {
  try {
    await connectDB()

    const config = await AdminConfigModel.findById('main')

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          spinRateSUI: 1,
          adminWalletAddress: '',
          spinPurchaseEnabled: false,
          referralEnabled: false,
          referralCommissionPercent: 10,
          freeSpinMinStakeUSD: 20,
        },
      })
    }

    // Fetch live token prices (non-blocking if fails)
    let tokenPrices: { vict: number; trump: number; victChange24h: number; trumpChange24h: number } = { vict: 0, trump: 0, victChange24h: 0, trumpChange24h: 0 }
    try {
      const prices = await getTokenPrices()
      tokenPrices = { vict: prices.vict, trump: prices.trump, victChange24h: prices.victChange24h, trumpChange24h: prices.trumpChange24h }
    } catch (e) {
      console.error('Failed to fetch token prices for config:', e)
    }

    // Return only public config (no sensitive data)
    return NextResponse.json({
      success: true,
      data: {
        spinRateSUI: config.spinRateSUI,
        adminWalletAddress: config.adminWalletAddress,
        spinPurchaseEnabled: config.spinPurchaseEnabled,
        referralEnabled: config.referralEnabled,
        referralCommissionPercent: config.referralCommissionPercent,
        freeSpinMinStakeUSD: config.freeSpinMinStakeUSD,
        prizeTable: config.prizeTable.map((s: any) => ({
          slotIndex: s.slotIndex,
          type: s.type,
          amount: s.amount,
          weight: s.weight,
          lockDuration: s.lockDuration || null,
        })),
        tokenPrices,
      },
    })
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}
