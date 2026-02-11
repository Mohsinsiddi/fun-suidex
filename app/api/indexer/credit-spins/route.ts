import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, AdminConfigModel, LPCreditModel } from '@/lib/db/models'

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-indexer-key')
  const expectedKey = process.env.INDEXER_API_KEY
  if (!expectedKey || !apiKey) return false
  return apiKey === expectedKey
}

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { wallet, txHash, eventType, pair, amountUSD, metadata } = body

    // Validate required fields
    if (!wallet || !txHash || !eventType || !pair || amountUSD == null) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: wallet, txHash, eventType, pair, amountUSD' },
        { status: 400 }
      )
    }

    if (!['lp_stake', 'swap', 'other'].includes(eventType)) {
      return NextResponse.json(
        { success: false, error: 'eventType must be one of: lp_stake, swap, other' },
        { status: 400 }
      )
    }

    if (typeof amountUSD !== 'number' || amountUSD < 0) {
      return NextResponse.json(
        { success: false, error: 'amountUSD must be a non-negative number' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if LP credits are enabled
    const config = await AdminConfigModel.findById('main').lean()
    if (!config?.lpCreditEnabled) {
      return NextResponse.json(
        { success: false, error: 'LP credit system is currently disabled' },
        { status: 403 }
      )
    }

    const ratePerSpin = config.lpSpinRateUSD || 20

    // Idempotent: check if txHash already credited
    const existing = await LPCreditModel.findOne({ txHash }).lean()
    if (existing) {
      return NextResponse.json({
        success: true,
        data: {
          duplicate: true,
          spinsCredited: existing.spinsCredited,
          creditId: existing._id,
        },
      })
    }

    // Calculate spins
    const spinsCredited = Math.floor(amountUSD / ratePerSpin)

    // Create LP credit record
    const credit = await LPCreditModel.create({
      wallet: wallet.toLowerCase(),
      txHash,
      eventType,
      pair,
      amountUSD,
      spinsCredited,
      ratePerSpin,
      status: 'credited',
      creditedAt: new Date(),
      metadata: metadata || {},
    })

    // Credit free spins to user (upsert if user doesn't exist yet)
    let totalFreeSpins = 0
    if (spinsCredited > 0) {
      const user = await UserModel.findOneAndUpdate(
        { wallet: wallet.toLowerCase() },
        { $inc: { freeSpins: spinsCredited } },
        { new: true, upsert: true }
      )
      totalFreeSpins = user.freeSpins
    }

    return NextResponse.json({
      success: true,
      data: {
        duplicate: false,
        creditId: String(credit._id),
        spinsCredited,
        totalFreeSpins,
      },
    })
  } catch (error) {
    console.error('Indexer credit-spins error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
