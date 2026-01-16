#!/usr/bin/env tsx
// ============================================
// CLI: Seed Mock Data for Testing
// ============================================
// Usage: pnpm seed:mock

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as readline from 'readline'
import mongoose from 'mongoose'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import {
  UserModel,
  SpinModel,
  PaymentModel,
  ReferralModel,
  AffiliateRewardModel,
  UserBadgeModel,
  BadgeModel,
} from '../lib/db/models'

// ----------------------------------------
// Configuration
// ----------------------------------------

const MOCK_CONFIG = {
  USERS_COUNT: 2000,
  SPINS_COUNT: 8000,
  PAYMENTS_COUNT: 500,
  REFERRALS_PERCENT: 30,
  AFFILIATE_REWARDS_COUNT: 1000,
  USER_BADGES_PERCENT: 40, // 40% of users will have some badges
}

// ----------------------------------------
// Readline Interface
// ----------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

// ----------------------------------------
// Helper Functions
// ----------------------------------------

function randomWallet(): string {
  const chars = '0123456789abcdef'
  let addr = '0x'
  for (let i = 0; i < 64; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomTxHash(): string {
  const chars = '0123456789abcdefABCDEF'
  let hash = ''
  for (let i = 0; i < 44; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

function progressBar(current: number, total: number, label: string): void {
  const width = 30
  const percent = current / total
  const filled = Math.round(width * percent)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  process.stdout.write(`\r  ${label}: [${bar}] ${Math.round(percent * 100)}%`)
}

// ----------------------------------------
// Main Function
// ----------------------------------------

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║     SuiDex Games - Seed Mock Data             ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  console.log('This will seed the following mock data:')
  console.log(`  - ${MOCK_CONFIG.USERS_COUNT.toLocaleString()} Users`)
  console.log(`  - ${MOCK_CONFIG.SPINS_COUNT.toLocaleString()} Spins`)
  console.log(`  - ${MOCK_CONFIG.PAYMENTS_COUNT.toLocaleString()} Payments`)
  console.log(`  - ~${Math.floor(MOCK_CONFIG.USERS_COUNT * MOCK_CONFIG.REFERRALS_PERCENT / 100).toLocaleString()} Referrals`)
  console.log(`  - ${MOCK_CONFIG.AFFILIATE_REWARDS_COUNT.toLocaleString()} Affiliate Rewards`)
  console.log(`  - ~${Math.floor(MOCK_CONFIG.USERS_COUNT * MOCK_CONFIG.USER_BADGES_PERCENT / 100).toLocaleString()} Users with Badges`)
  console.log(`\n  Total: ~${(MOCK_CONFIG.USERS_COUNT + MOCK_CONFIG.SPINS_COUNT + MOCK_CONFIG.PAYMENTS_COUNT + MOCK_CONFIG.AFFILIATE_REWARDS_COUNT + Math.floor(MOCK_CONFIG.USERS_COUNT * MOCK_CONFIG.REFERRALS_PERCENT / 100)).toLocaleString()} records\n`)

  const proceed = await question('Do you want to continue? (y/N): ')
  if (proceed.toLowerCase() !== 'y') {
    console.log('\nOperation cancelled.')
    process.exit(0)
  }

  try {
    // Connect to database
    console.log('\nConnecting to database...')
    await connectDB()
    console.log('✓ Connected to MongoDB\n')

    // Check existing counts
    const existingUsers = await UserModel.countDocuments()
    const existingSpins = await SpinModel.countDocuments()

    if (existingUsers > 0 || existingSpins > 0) {
      console.log(`⚠ Existing data found:`)
      console.log(`  - Users: ${existingUsers.toLocaleString()}`)
      console.log(`  - Spins: ${existingSpins.toLocaleString()}`)

      const clearData = await question('\nDo you want to clear existing data first? (y/N): ')
      if (clearData.toLowerCase() === 'y') {
        console.log('\nClearing existing data...')
        await Promise.all([
          UserModel.deleteMany({}),
          SpinModel.deleteMany({}),
          PaymentModel.deleteMany({}),
          ReferralModel.deleteMany({}),
          AffiliateRewardModel.deleteMany({}),
          UserBadgeModel.deleteMany({}),
        ])
        console.log('✓ Existing data cleared\n')
      }
    }

    const now = new Date()
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS || '0x' + '1'.repeat(64)

    // ========================================
    // Step 1: Generate Mock Users
    // ========================================
    console.log('Seeding data...\n')

    const userWallets: string[] = []
    const userDocs = []

    for (let i = 0; i < MOCK_CONFIG.USERS_COUNT; i++) {
      const wallet = randomWallet()
      userWallets.push(wallet)

      const createdAt = randomDate(threeMonthsAgo, now)
      const totalSpins = randomInt(0, 100)
      const totalWinsUSD = randomInt(0, 500)
      const currentStreak = randomInt(0, 30)
      const longestStreak = Math.max(currentStreak, randomInt(0, 60))

      userDocs.push({
        wallet,
        purchasedSpins: randomInt(0, 50),
        bonusSpins: randomInt(0, 10),
        totalSpins,
        totalWinsUSD,
        biggestWinUSD: totalWinsUSD > 0 ? randomInt(1, totalWinsUSD) : 0,
        referralCode: `REF${i.toString().padStart(5, '0')}`,
        referredBy: null,
        totalReferred: 0,
        hasCompletedFirstSpin: totalSpins > 0,
        lastActiveAt: randomDate(createdAt, now),
        // New streak fields
        currentStreak,
        longestStreak,
        lastSpinDate: totalSpins > 0 ? randomDate(createdAt, now) : null,
        // Commission tracking
        totalCommissionUSD: randomInt(0, 100),
        // Social tracking
        totalTweets: randomInt(0, 20),
        // Profile (some users have profiles)
        profileSlug: i < 100 ? `user${i.toString().padStart(4, '0')}` : null,
        isProfilePublic: i < 50,
        profileUnlockedAt: i < 100 ? createdAt : null,
        createdAt,
        updatedAt: now,
      })

      if (i % 100 === 0) progressBar(i, MOCK_CONFIG.USERS_COUNT, 'Users')
    }

    await UserModel.insertMany(userDocs, { ordered: false }).catch(() => {})
    progressBar(MOCK_CONFIG.USERS_COUNT, MOCK_CONFIG.USERS_COUNT, 'Users')
    console.log(' ✓')

    // ========================================
    // Step 2: Create Referral Relationships
    // ========================================
    const referralCount = Math.floor(MOCK_CONFIG.USERS_COUNT * (MOCK_CONFIG.REFERRALS_PERCENT / 100))
    const referralDocs = []
    const referrerCounts: Record<string, number> = {}
    const usedReferees = new Set<string>()

    for (let i = 0; i < referralCount; i++) {
      const referrerIdx = randomInt(0, Math.floor(MOCK_CONFIG.USERS_COUNT / 2))
      const refereeIdx = randomInt(Math.floor(MOCK_CONFIG.USERS_COUNT / 2), MOCK_CONFIG.USERS_COUNT - 1)

      const referrerWallet = userWallets[referrerIdx]
      const refereeWallet = userWallets[refereeIdx]

      if (referrerWallet === refereeWallet || usedReferees.has(refereeWallet)) continue
      usedReferees.add(refereeWallet)

      referrerCounts[referrerWallet] = (referrerCounts[referrerWallet] || 0) + 1

      referralDocs.push({
        referrerWallet,
        referredWallet: refereeWallet,
        totalSpinsByReferred: randomInt(0, 50),
        totalCommissionVICT: randomInt(0, 10000),
        linkedAt: randomDate(threeMonthsAgo, now),
        lastActivityAt: randomDate(threeMonthsAgo, now),
      })

      if (i % 50 === 0) progressBar(i, referralCount, 'Referrals')
    }

    await ReferralModel.insertMany(referralDocs, { ordered: false }).catch(() => {})
    progressBar(referralCount, referralCount, 'Referrals')
    console.log(' ✓')

    // Update referrer counts in batches
    const referrerUpdates = Object.entries(referrerCounts)
    for (let i = 0; i < referrerUpdates.length; i++) {
      const [wallet, count] = referrerUpdates[i]
      await UserModel.updateOne({ wallet }, { $set: { totalReferred: count } })
    }

    // ========================================
    // Step 3: Generate Mock Spins
    // ========================================
    const prizeTypes: Array<'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'> = [
      'liquid_victory', 'locked_victory', 'suitrump', 'no_prize'
    ]
    const spinTypes: Array<'free' | 'purchased' | 'bonus'> = ['free', 'purchased', 'bonus']
    const spinStatuses: Array<'pending' | 'distributed' | 'failed'> = ['pending', 'distributed', 'failed']
    const lockDurations: Array<'1_week' | '3_month' | '1_year' | '3_year'> = [
      '1_week', '3_month', '1_year', '3_year'
    ]

    const spinDocs = []
    const spinIdsForRewards: mongoose.Types.ObjectId[] = []

    for (let i = 0; i < MOCK_CONFIG.SPINS_COUNT; i++) {
      const wallet = randomPick(userWallets)
      const prizeType = randomPick(prizeTypes)
      const status = randomPick(spinStatuses)
      const createdAt = randomDate(threeMonthsAgo, now)

      const prizeAmount = prizeType === 'no_prize' ? 0 : randomInt(100, 100000)
      const prizeValueUSD = prizeType === 'no_prize' ? 0 : randomInt(1, 500)

      const spinId = new mongoose.Types.ObjectId()

      if (prizeType !== 'no_prize' && spinIdsForRewards.length < MOCK_CONFIG.AFFILIATE_REWARDS_COUNT) {
        spinIdsForRewards.push(spinId)
      }

      spinDocs.push({
        _id: spinId,
        wallet,
        spinType: randomPick(spinTypes),
        serverSeed: randomTxHash(),
        randomValue: Math.random(),
        slotIndex: randomInt(0, 15),
        prizeType,
        prizeAmount,
        prizeValueUSD,
        lockDuration: prizeType === 'locked_victory' ? randomPick(lockDurations) : null,
        status,
        distributedAt: status === 'distributed' ? randomDate(createdAt, now) : null,
        distributedTxHash: status === 'distributed' ? randomTxHash() : null,
        distributedBy: status === 'distributed' ? 'admin' : null,
        failureReason: status === 'failed' ? 'Mock failure for testing' : null,
        referredBy: Math.random() > 0.7 ? randomPick(userWallets) : null,
        referralCommission: Math.random() > 0.7 ? randomInt(10, 1000) : null,
        ip: '127.0.0.1',
        userAgent: 'Mock Browser',
        createdAt,
        updatedAt: now,
      })

      if (i % 500 === 0) progressBar(i, MOCK_CONFIG.SPINS_COUNT, 'Spins')
    }

    // Insert in batches to avoid memory issues
    const BATCH_SIZE = 1000
    for (let i = 0; i < spinDocs.length; i += BATCH_SIZE) {
      const batch = spinDocs.slice(i, i + BATCH_SIZE)
      await SpinModel.insertMany(batch, { ordered: false }).catch(() => {})
      progressBar(Math.min(i + BATCH_SIZE, spinDocs.length), MOCK_CONFIG.SPINS_COUNT, 'Spins')
    }
    console.log(' ✓')

    // ========================================
    // Step 4: Generate Mock Payments
    // ========================================
    const paymentDocs = []
    const claimStatuses: Array<'unclaimed' | 'claimed' | 'manual' | 'pending_approval'> = [
      'unclaimed', 'claimed', 'manual', 'pending_approval'
    ]

    for (let i = 0; i < MOCK_CONFIG.PAYMENTS_COUNT; i++) {
      const wallet = randomPick(userWallets)
      const amountSUI = randomInt(1, 100)
      const claimStatus = randomPick(claimStatuses)
      const timestamp = randomDate(threeMonthsAgo, now)

      paymentDocs.push({
        txHash: randomTxHash() + i, // Ensure unique
        senderWallet: wallet,
        recipientWallet: adminWallet.toLowerCase(),
        amountMIST: (amountSUI * 1_000_000_000).toString(),
        amountSUI,
        claimStatus,
        claimedBy: claimStatus === 'claimed' ? wallet : null,
        claimedAt: claimStatus === 'claimed' ? randomDate(timestamp, now) : null,
        spinsCredited: claimStatus === 'claimed' ? amountSUI : 0,
        rateAtClaim: 1,
        manualCredit: claimStatus === 'manual',
        creditedByAdmin: claimStatus === 'manual' ? 'admin' : null,
        adminNote: claimStatus === 'manual' ? 'Manual credit for testing' : null,
        blockNumber: randomInt(1000000, 9999999),
        timestamp,
        discoveredAt: timestamp,
        createdAt: timestamp,
        updatedAt: now,
      })

      if (i % 50 === 0) progressBar(i, MOCK_CONFIG.PAYMENTS_COUNT, 'Payments')
    }

    await PaymentModel.insertMany(paymentDocs, { ordered: false }).catch(() => {})
    progressBar(MOCK_CONFIG.PAYMENTS_COUNT, MOCK_CONFIG.PAYMENTS_COUNT, 'Payments')
    console.log(' ✓')

    // ========================================
    // Step 5: Generate Mock Affiliate Rewards
    // ========================================
    const affiliateDocs = []
    const tweetStatuses: Array<'pending' | 'clicked' | 'completed'> = ['pending', 'clicked', 'completed']
    const payoutStatuses: Array<'pending_tweet' | 'ready' | 'paid'> = ['pending_tweet', 'ready', 'paid']

    for (let i = 0; i < Math.min(MOCK_CONFIG.AFFILIATE_REWARDS_COUNT, spinIdsForRewards.length); i++) {
      const referrerWallet = randomPick(userWallets)
      const refereeWallet = randomPick(userWallets)
      const tweetStatus = randomPick(tweetStatuses)
      const payoutStatus = randomPick(payoutStatuses)
      const createdAt = randomDate(threeMonthsAgo, now)

      const weekEnding = new Date(createdAt)
      weekEnding.setDate(weekEnding.getDate() + (7 - weekEnding.getDay()))
      weekEnding.setHours(23, 59, 59, 999)

      const originalPrizeVICT = randomInt(1000, 100000)
      const originalPrizeUSD = randomInt(5, 500)
      const commissionRate = 0.10
      const rewardAmountVICT = Math.floor(originalPrizeVICT * commissionRate)
      const rewardValueUSD = Math.floor(originalPrizeUSD * commissionRate)

      affiliateDocs.push({
        referrerWallet,
        refereeWallet,
        fromSpinId: spinIdsForRewards[i],
        fromWallet: refereeWallet,
        originalPrizeVICT,
        originalPrizeUSD,
        commissionRate,
        rewardAmountVICT,
        rewardValueUSD,
        tweetStatus,
        tweetClickedAt: tweetStatus !== 'pending' ? randomDate(createdAt, now) : null,
        tweetReturnedAt: tweetStatus === 'completed' ? randomDate(createdAt, now) : null,
        tweetIntentUrl: 'https://twitter.com/intent/tweet?text=Mock',
        weekEnding,
        payoutStatus,
        status: payoutStatus === 'paid' ? 'paid' : 'pending',
        paidAt: payoutStatus === 'paid' ? randomDate(createdAt, now) : null,
        paidTxHash: payoutStatus === 'paid' ? randomTxHash() : null,
        createdAt,
        updatedAt: now,
      })

      if (i % 100 === 0) progressBar(i, MOCK_CONFIG.AFFILIATE_REWARDS_COUNT, 'Affiliates')
    }

    await AffiliateRewardModel.insertMany(affiliateDocs, { ordered: false }).catch(() => {})
    progressBar(MOCK_CONFIG.AFFILIATE_REWARDS_COUNT, MOCK_CONFIG.AFFILIATE_REWARDS_COUNT, 'Affiliates')
    console.log(' ✓')

    // ========================================
    // Step 6: Generate Mock User Badges
    // ========================================
    const allBadges = await BadgeModel.find({ isActive: true }).lean()

    if (allBadges.length === 0) {
      console.log('\n  ⚠ No badges found in database. Run seed:defaults first to create badges.')
    } else {
      const userBadgeDocs = []
      const usersWithBadgesCount = Math.floor(MOCK_CONFIG.USERS_COUNT * (MOCK_CONFIG.USER_BADGES_PERCENT / 100))

      for (let i = 0; i < usersWithBadgesCount; i++) {
        const wallet = userWallets[i]
        // Each user gets 1-10 random badges
        const badgeCount = randomInt(1, Math.min(10, allBadges.length))
        const shuffledBadges = [...allBadges].sort(() => Math.random() - 0.5).slice(0, badgeCount)

        for (const badge of shuffledBadges) {
          userBadgeDocs.push({
            wallet,
            badgeId: badge._id,
            unlockedAt: randomDate(threeMonthsAgo, now),
          })
        }

        if (i % 100 === 0) progressBar(i, usersWithBadgesCount, 'Badges')
      }

      // Insert in batches
      for (let i = 0; i < userBadgeDocs.length; i += BATCH_SIZE) {
        const batch = userBadgeDocs.slice(i, i + BATCH_SIZE)
        await UserBadgeModel.insertMany(batch, { ordered: false }).catch(() => {})
      }
      progressBar(usersWithBadgesCount, usersWithBadgesCount, 'Badges')
      console.log(' ✓')
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║           ✓ Mock Data Seeded!                 ║')
    console.log('╚══════════════════════════════════════════════╝')

    const finalCounts = await Promise.all([
      UserModel.countDocuments(),
      SpinModel.countDocuments(),
      PaymentModel.countDocuments(),
      ReferralModel.countDocuments(),
      AffiliateRewardModel.countDocuments(),
      UserBadgeModel.countDocuments(),
    ])

    console.log('\nFinal counts:')
    console.log(`  - Users:            ${finalCounts[0].toLocaleString()}`)
    console.log(`  - Spins:            ${finalCounts[1].toLocaleString()}`)
    console.log(`  - Payments:         ${finalCounts[2].toLocaleString()}`)
    console.log(`  - Referrals:        ${finalCounts[3].toLocaleString()}`)
    console.log(`  - Affiliate Rewards: ${finalCounts[4].toLocaleString()}`)
    console.log(`  - User Badges:      ${finalCounts[5].toLocaleString()}`)
    console.log(`\n  Total: ${finalCounts.reduce((a, b) => a + b, 0).toLocaleString()} records`)
    console.log('\n✓ You can now test the admin dashboard!\n')

  } catch (error) {
    console.error('\n\n✗ Error:', error)
    process.exit(1)
  } finally {
    rl.close()
    await disconnectDB()
    process.exit(0)
  }
}

// Run
main()
