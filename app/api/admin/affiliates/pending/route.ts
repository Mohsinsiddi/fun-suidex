import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AffiliateRewardModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyAdminToken(token)
    if (!payload) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 })

    await connectDB()

    const rewards = await AffiliateRewardModel.find({ payoutStatus: 'ready' }).sort({ createdAt: -1 }).lean()

    const byWallet = new Map<string, { wallet: string; rewards: any[]; totalVICT: number; totalUSD: number }>()
    rewards.forEach(r => {
      const existing = byWallet.get(r.referrerWallet) || { wallet: r.referrerWallet, rewards: [], totalVICT: 0, totalUSD: 0 }
      existing.rewards.push(r)
      existing.totalVICT += r.rewardAmountVICT || 0
      existing.totalUSD += r.rewardValueUSD || 0
      byWallet.set(r.referrerWallet, existing)
    })

    return NextResponse.json({
      success: true,
      payoutSheet: Array.from(byWallet.values()),
      totals: {
        totalVICT: rewards.reduce((s, r) => s + (r.rewardAmountVICT || 0), 0),
        totalUSD: rewards.reduce((s, r) => s + (r.rewardValueUSD || 0), 0),
        totalRecipients: byWallet.size,
        totalRewards: rewards.length,
      },
    })
  } catch (error) {
    console.error('Admin pending error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
