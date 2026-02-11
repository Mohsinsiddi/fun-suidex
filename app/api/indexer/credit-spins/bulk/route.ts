import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { UserModel, AdminConfigModel, LPCreditModel } from '@/lib/db/models'

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-indexer-key')
  const expectedKey = process.env.INDEXER_API_KEY
  if (!expectedKey || !apiKey) return false
  return apiKey === expectedKey
}

interface CreditEntry {
  wallet: string
  txHash: string
  eventType: 'lp_stake' | 'swap' | 'other'
  pair: string
  amountUSD: number
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { credits } = body as { credits: CreditEntry[] }

    if (!Array.isArray(credits) || credits.length === 0) {
      return NextResponse.json(
        { success: false, error: 'credits must be a non-empty array' },
        { status: 400 }
      )
    }

    if (credits.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 credits per batch' },
        { status: 400 }
      )
    }

    await connectDB()

    const config = await AdminConfigModel.findById('main').lean()
    if (!config?.lpCreditEnabled) {
      return NextResponse.json(
        { success: false, error: 'LP credit system is currently disabled' },
        { status: 403 }
      )
    }

    const ratePerSpin = config.lpSpinRateUSD || 20

    // Check which txHashes already exist
    const txHashes = credits.map(c => c.txHash)
    const existingCredits = await LPCreditModel.find({ txHash: { $in: txHashes } }).lean()
    const existingSet = new Set(existingCredits.map(c => c.txHash))

    let processed = 0
    let skipped = 0
    let totalCredited = 0

    // Aggregate spins per wallet for batch update
    const walletSpins: Record<string, number> = {}

    const newCredits: Array<{
      wallet: string
      txHash: string
      eventType: string
      pair: string
      amountUSD: number
      spinsCredited: number
      ratePerSpin: number
      status: string
      creditedAt: Date
      metadata: Record<string, unknown>
    }> = []

    for (const entry of credits) {
      if (!entry.wallet || !entry.txHash || !entry.eventType || !entry.pair || entry.amountUSD == null) {
        skipped++
        continue
      }

      if (existingSet.has(entry.txHash)) {
        skipped++
        continue
      }

      const spinsCredited = Math.floor(entry.amountUSD / ratePerSpin)
      const walletLower = entry.wallet.toLowerCase()

      newCredits.push({
        wallet: walletLower,
        txHash: entry.txHash,
        eventType: entry.eventType,
        pair: entry.pair,
        amountUSD: entry.amountUSD,
        spinsCredited,
        ratePerSpin,
        status: 'credited',
        creditedAt: new Date(),
        metadata: entry.metadata || {},
      })

      if (spinsCredited > 0) {
        walletSpins[walletLower] = (walletSpins[walletLower] || 0) + spinsCredited
        totalCredited += spinsCredited
      }

      processed++
    }

    // Bulk insert credit records
    if (newCredits.length > 0) {
      await LPCreditModel.insertMany(newCredits, { ordered: false }).catch(() => {
        // Some may fail due to duplicate key - that's fine (idempotent)
      })
    }

    // Update user free spins in parallel
    const updatePromises = Object.entries(walletSpins).map(([wallet, spins]) =>
      UserModel.findOneAndUpdate(
        { wallet },
        { $inc: { freeSpins: spins } },
        { upsert: true }
      )
    )
    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      data: {
        processed,
        skipped,
        totalCredited,
      },
    })
  } catch (error) {
    console.error('Indexer bulk credit-spins error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
