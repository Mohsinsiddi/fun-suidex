import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { AdminConfigModel } from '@/lib/db/models'

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
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        spinRateSUI: config.spinRateSUI,
        adminWalletAddress: config.adminWalletAddress,
        spinPurchaseEnabled: config.spinPurchaseEnabled,
        referralEnabled: config.referralEnabled,
        referralCommissionPercent: config.referralCommissionPercent,
        freeSpinMinStakeUSD: config.freeSpinMinStakeUSD,
        prizeTable: config.prizeTable,
      },
    })
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 })
  }
}