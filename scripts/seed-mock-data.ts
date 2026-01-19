#!/usr/bin/env tsx
// ============================================
// CLI: Seed Mock Data for Testing (Optimized for 100k records)
// ============================================
// Usage: pnpm seed:mock
// Supports 20k-100k users with realistic distributions

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as readline from 'readline'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import {
  UserModel,
  SpinModel,
  PaymentModel,
  ReferralModel,
  AffiliateRewardModel,
  UserBadgeModel,
  UserProfileModel,
  BadgeModel,
} from '../lib/db/models'

// ----------------------------------------
// Configuration
// ----------------------------------------

const DEFAULT_USERS = 25000
const MIN_USERS = 20000
const MAX_USERS = 100000
const BATCH_SIZE = 2000

// User tier distribution (realistic gaming pattern)
const USER_TIERS = {
  casual: { percent: 0.75, minSpins: 1, maxSpins: 50 },      // 75% - 1-50 spins
  regular: { percent: 0.18, minSpins: 51, maxSpins: 500 },   // 18% - 51-500 spins
  power: { percent: 0.05, minSpins: 501, maxSpins: 2000 },   // 5% - 501-2000 spins
  whale: { percent: 0.02, minSpins: 2001, maxSpins: 10000 }, // 2% - 2001-10000 spins
}

// Win rate distribution (house edge)
const WIN_THRESHOLDS = [
  { cumulative: 0.40, minUSD: 0.10, maxUSD: 1.00 },   // 40% win $0.10-$1
  { cumulative: 0.48, minUSD: 1.01, maxUSD: 10.00 },  // 8% win $1-$10
  { cumulative: 0.495, minUSD: 10.01, maxUSD: 100.00 }, // 1.5% win $10-$100
  { cumulative: 0.50, minUSD: 100.01, maxUSD: 1000 }, // 0.5% win $100-$1000
  { cumulative: 1.0, minUSD: 0, maxUSD: 0 },          // 50% win nothing
]

// Badges that can be auto-assigned based on stats
const BADGE_THRESHOLDS = [
  { id: 'spin_1', field: 'totalSpins', threshold: 1 },
  { id: 'spin_10', field: 'totalSpins', threshold: 10 },
  { id: 'spin_100', field: 'totalSpins', threshold: 100 },
  { id: 'spin_500', field: 'totalSpins', threshold: 500 },
  { id: 'spin_1000', field: 'totalSpins', threshold: 1000 },
  { id: 'winner_10', field: 'totalWinsUSD', threshold: 10 },
  { id: 'winner_100', field: 'totalWinsUSD', threshold: 100 },
  { id: 'winner_500', field: 'totalWinsUSD', threshold: 500 },
  { id: 'winner_1000', field: 'totalWinsUSD', threshold: 1000 },
  { id: 'big_winner_50', field: 'biggestWinUSD', threshold: 50 },
  { id: 'big_winner_100', field: 'biggestWinUSD', threshold: 100 },
  { id: 'big_winner_500', field: 'biggestWinUSD', threshold: 500 },
  { id: 'referrer_1', field: 'totalReferred', threshold: 1 },
  { id: 'referrer_5', field: 'totalReferred', threshold: 5 },
  { id: 'referrer_10', field: 'totalReferred', threshold: 10 },
  { id: 'referrer_25', field: 'totalReferred', threshold: 25 },
]

// Pre-computed tier cumulative probabilities
const TIER_CUMULATIVE = Object.entries(USER_TIERS).reduce((acc, [tier, config], index) => {
  const prev = index > 0 ? acc[index - 1].cumulative : 0
  acc.push({ tier, cumulative: prev + config.percent, ...config })
  return acc
}, [] as { tier: string; cumulative: number; minSpins: number; maxSpins: number }[])

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
// Optimized Helper Functions
// ----------------------------------------

// Pre-generate random bytes buffer for wallet generation (much faster)
let walletBuffer: Buffer | null = null
let walletBufferOffset = 0
const WALLET_BUFFER_SIZE = 32 * 10000 // Pre-generate 10k wallets worth

function getWalletBuffer(): Buffer {
  if (!walletBuffer || walletBufferOffset >= WALLET_BUFFER_SIZE - 32) {
    walletBuffer = crypto.randomBytes(WALLET_BUFFER_SIZE)
    walletBufferOffset = 0
  }
  const slice = walletBuffer.subarray(walletBufferOffset, walletBufferOffset + 32)
  walletBufferOffset += 32
  return slice
}

function generateSuiWallet(): string {
  return '0x' + getWalletBuffer().toString('hex')
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function generateSlug(): string {
  const chars = 'abcdefghjklmnpqrstuvwxyz23456789'
  let slug = ''
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function selectTier(): { tier: string; minSpins: number; maxSpins: number } {
  const rand = Math.random()
  for (const t of TIER_CUMULATIVE) {
    if (rand <= t.cumulative) {
      return t
    }
  }
  return TIER_CUMULATIVE[0]
}

// Optimized win calculation - statistical approximation for large counts
function calculateWinsFast(totalSpins: number): { totalWinsUSD: number; biggestWinUSD: number; winCount: number } {
  let totalWinsUSD = 0
  let biggestWinUSD = 0
  let winCount = 0

  // For large spin counts, use statistical approximation
  if (totalSpins > 100) {
    // Expected wins per category
    const smallWins = Math.floor(totalSpins * 0.40)
    const mediumWins = Math.floor(totalSpins * 0.08)
    const largeWins = Math.floor(totalSpins * 0.015)
    const jackpotWins = Math.floor(totalSpins * 0.005)

    // Small wins: avg $0.55
    totalWinsUSD += smallWins * (0.10 + Math.random() * 0.90)
    winCount += smallWins

    // Medium wins: avg $5.50
    totalWinsUSD += mediumWins * (1.01 + Math.random() * 9.00)
    winCount += mediumWins

    // Large wins: avg $55
    if (largeWins > 0) {
      const largeWinTotal = largeWins * (10.01 + Math.random() * 90.00)
      totalWinsUSD += largeWinTotal
      biggestWinUSD = Math.max(biggestWinUSD, 10 + Math.random() * 90)
      winCount += largeWins
    }

    // Jackpot wins: avg $550
    if (jackpotWins > 0) {
      const jackpotTotal = jackpotWins * (100.01 + Math.random() * 900.00)
      totalWinsUSD += jackpotTotal
      biggestWinUSD = Math.max(biggestWinUSD, 100 + Math.random() * 900)
      winCount += jackpotWins
    }

    // Add some variance
    totalWinsUSD *= 0.8 + Math.random() * 0.4
  } else {
    // For small spin counts, calculate exactly
    for (let i = 0; i < totalSpins; i++) {
      const rand = Math.random()
      for (const tier of WIN_THRESHOLDS) {
        if (rand <= tier.cumulative) {
          if (tier.maxUSD > 0) {
            const win = tier.minUSD + Math.random() * (tier.maxUSD - tier.minUSD)
            totalWinsUSD += win
            biggestWinUSD = Math.max(biggestWinUSD, win)
            winCount++
          }
          break
        }
      }
    }
  }

  return {
    totalWinsUSD: Math.round(totalWinsUSD * 100) / 100,
    biggestWinUSD: Math.round(biggestWinUSD * 100) / 100,
    winCount,
  }
}

function getEligibleBadges(stats: { totalSpins: number; totalWinsUSD: number; biggestWinUSD: number; totalReferred: number }): string[] {
  const badges: string[] = []
  for (const badge of BADGE_THRESHOLDS) {
    const value = stats[badge.field as keyof typeof stats]
    if (value >= badge.threshold) {
      badges.push(badge.id)
    }
  }
  return badges
}

function randomDate(daysBack: number): Date {
  const now = Date.now()
  const past = now - daysBack * 24 * 60 * 60 * 1000
  return new Date(past + Math.random() * (now - past))
}

function randomTxHash(): string {
  const chars = '0123456789abcdefABCDEF'
  let hash = ''
  for (let i = 0; i < 44; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

function progressBar(current: number, total: number, label: string, startTime?: number): void {
  const width = 30
  const percent = current / total
  const filled = Math.round(width * percent)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  let eta = ''
  if (startTime && current > 0) {
    const elapsed = (Date.now() - startTime) / 1000
    const rate = current / elapsed
    const remaining = Math.round((total - current) / rate)
    eta = ` ~${remaining}s`
  }

  process.stdout.write(`\r  ${label.padEnd(12)}: [${bar}] ${Math.round(percent * 100).toString().padStart(3)}%${eta}`)
}

// ----------------------------------------
// Main Function
// ----------------------------------------

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   SuiDex Games - Seed Mock Data (100k Optimized)  ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  // Get user count
  const countInput = await question(`How many users to create? (${MIN_USERS.toLocaleString()}-${MAX_USERS.toLocaleString()}, default ${DEFAULT_USERS.toLocaleString()}): `)
  let userCount = parseInt(countInput) || DEFAULT_USERS
  userCount = Math.max(MIN_USERS, Math.min(userCount, MAX_USERS))

  // Calculate estimates
  const estSpins = Math.floor(userCount * 4) // ~4 spins per user average
  const estPayments = Math.floor(userCount * 0.3)
  const estReferrals = Math.floor(userCount * 0.25)
  const estAffiliates = Math.floor(userCount * 0.5)
  const estProfiles = Math.floor(userCount * 0.15)
  const estBadges = Math.floor(userCount * 2) // ~2 badges per user average

  console.log(`\nThis will seed approximately:`)
  console.log(`  - ${userCount.toLocaleString()} Users`)
  console.log(`    └ Distribution: 75% casual, 18% regular, 5% power, 2% whale`)
  console.log(`  - ${estSpins.toLocaleString()} Spins`)
  console.log(`  - ${estPayments.toLocaleString()} Payments`)
  console.log(`  - ${estReferrals.toLocaleString()} Referrals`)
  console.log(`  - ${estAffiliates.toLocaleString()} Affiliate Rewards`)
  console.log(`  - ${estProfiles.toLocaleString()} User Profiles`)
  console.log(`  - ${estBadges.toLocaleString()} User Badges`)
  console.log(`\n  Total: ~${(userCount + estSpins + estPayments + estReferrals + estAffiliates + estBadges).toLocaleString()} records`)
  console.log(`  Estimated time: ${Math.ceil(userCount / 5000)} minutes\n`)

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
    const existingSeedUsers = await UserModel.countDocuments({ isSeedUser: true })
    const existingSpins = await SpinModel.countDocuments()

    if (existingUsers > 0 || existingSpins > 0) {
      console.log(`⚠ Existing data found:`)
      console.log(`  - Total Users: ${existingUsers.toLocaleString()} (${existingSeedUsers.toLocaleString()} seed users)`)
      console.log(`  - Total Spins: ${existingSpins.toLocaleString()}`)

      const clearChoice = await question('\nClear (A)ll data, (S)eed data only, or (K)eep existing? (a/s/K): ')

      if (clearChoice.toLowerCase() === 'a') {
        console.log('\nClearing ALL data...')
        await Promise.all([
          UserModel.deleteMany({}),
          SpinModel.deleteMany({}),
          PaymentModel.deleteMany({}),
          ReferralModel.deleteMany({}),
          AffiliateRewardModel.deleteMany({}),
          UserBadgeModel.deleteMany({}),
          UserProfileModel.deleteMany({}),
        ])
        console.log('✓ All data cleared\n')
      } else if (clearChoice.toLowerCase() === 's') {
        console.log('\nClearing seed data only...')
        await Promise.all([
          UserModel.deleteMany({ isSeedUser: true }),
          UserBadgeModel.deleteMany({ isSeedUser: true }),
          UserProfileModel.deleteMany({ isSeedUser: true }),
          SpinModel.deleteMany({ isSeedUser: true }),
          PaymentModel.deleteMany({ isSeedUser: true }),
          ReferralModel.deleteMany({ isSeedUser: true }),
          AffiliateRewardModel.deleteMany({ isSeedUser: true }),
        ])
        console.log('✓ Seed data cleared\n')
      } else {
        console.log('\nKeeping existing data...\n')
      }
    }

    const now = new Date()
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS || '0x' + '1'.repeat(64)
    const totalStartTime = Date.now()

    console.log('Seeding data...\n')

    // ========================================
    // Step 1: Generate Users with Optimized Batching
    // ========================================
    const userWallets: string[] = []
    const referralPool: { wallet: string; code: string }[] = []
    let usersCreated = 0
    let profilesCreated = 0
    let badgesCreated = 0

    const userStartTime = Date.now()
    const totalBatches = Math.ceil(userCount / BATCH_SIZE)

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, userCount)
      const batchSize = batchEnd - batchStart

      const users: any[] = []
      const profiles: any[] = []
      const badges: any[] = []

      for (let i = 0; i < batchSize; i++) {
        const globalIndex = batchStart + i
        const wallet = generateSuiWallet()
        userWallets.push(wallet)

        const tierData = selectTier()
        const totalSpins = randomBetween(tierData.minSpins, tierData.maxSpins)
        const { totalWinsUSD, biggestWinUSD } = calculateWinsFast(totalSpins)
        const createdAt = randomDate(90)
        const referralCode = generateReferralCode()

        // Determine referrer (30% chance if pool has entries)
        let referredBy: string | undefined
        if (referralPool.length > 0 && Math.random() < 0.3) {
          const referrer = referralPool[Math.floor(Math.random() * referralPool.length)]
          referredBy = referrer.wallet
        }

        // Calculate referrals based on tier
        let totalReferred = 0
        const referralChance = tierData.tier === 'whale' ? 0.6 : tierData.tier === 'power' ? 0.4 : tierData.tier === 'regular' ? 0.15 : 0.03
        if (Math.random() < referralChance) {
          const maxReferrals = tierData.tier === 'whale' ? 100 : tierData.tier === 'power' ? 50 : tierData.tier === 'regular' ? 20 : 5
          totalReferred = randomBetween(1, maxReferrals)
        }

        // Determine if user has profile (power/whale users more likely)
        const hasProfile = (
          tierData.tier === 'whale' ||
          tierData.tier === 'power' ||
          (tierData.tier === 'regular' && Math.random() < 0.4) ||
          (tierData.tier === 'casual' && Math.random() < 0.08)
        )

        const profileSlug = hasProfile ? generateSlug() : undefined
        const longestStreak = randomBetween(1, Math.min(totalSpins, 30))

        users.push({
          wallet,
          referralCode,
          referredBy,
          totalSpins,
          totalWinsUSD,
          biggestWinUSD,
          totalReferred,
          longestStreak,
          currentStreak: 0,
          purchasedSpins: 0,
          bonusSpins: randomBetween(0, 5),
          hasCompletedFirstSpin: totalSpins > 0,
          profileSlug,
          isProfilePublic: hasProfile && Math.random() < 0.75,
          profileUnlockedAt: hasProfile ? createdAt : undefined,
          lastSpinDate: totalSpins > 0 ? randomDate(Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000))) : null,
          lastActiveAt: new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())),
          totalCommissionUSD: referralChance > 0 ? randomBetween(0, 100) : 0,
          totalTweets: Math.random() < 0.2 ? randomBetween(0, 20) : 0,
          isSeedUser: true,
          createdAt,
          updatedAt: now,
        })

        // Add power/whale users to referral pool
        if (tierData.tier === 'power' || tierData.tier === 'whale') {
          if (referralPool.length < 2000) {
            referralPool.push({ wallet, code: referralCode })
          } else {
            referralPool[Math.floor(Math.random() * 2000)] = { wallet, code: referralCode }
          }
        }

        // Create profile document
        if (hasProfile) {
          const displayNames = [
            `Player${globalIndex + 1}`,
            `Spinner${randomBetween(1000, 9999)}`,
            `Lucky${randomBetween(100, 999)}`,
            `SuiGamer${randomBetween(1, 9999)}`,
            `WheelMaster${randomBetween(1, 999)}`,
          ]
          const bios = [
            `${tierData.tier.charAt(0).toUpperCase() + tierData.tier.slice(1)} player!`,
            'Spinning to win!',
            'Here for the jackpots',
            `${totalSpins} spins and counting...`,
            'Professional wheel spinner',
            undefined,
          ]

          profiles.push({
            wallet,
            slug: profileSlug,
            isPublic: Math.random() < 0.75,
            displayName: displayNames[Math.floor(Math.random() * displayNames.length)],
            bio: bios[Math.floor(Math.random() * bios.length)],
            stats: {
              totalSpins,
              totalWinsUSD,
              biggestWinUSD,
              totalReferred,
              currentStreak: 0,
              longestStreak,
              memberSince: createdAt,
              lastActive: now,
            },
            featuredBadges: [],
            isSeedUser: true,
            unlockedAt: createdAt,
            createdAt,
            updatedAt: now,
          })
        }

        // Assign badges based on stats
        const eligibleBadges = getEligibleBadges({
          totalSpins,
          totalWinsUSD,
          biggestWinUSD,
          totalReferred,
        })

        for (const badgeId of eligibleBadges) {
          badges.push({
            wallet,
            badgeId,
            unlockedAt: new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())),
            isSeedUser: true,
          })
        }
      }

      // Parallel bulk inserts
      const insertPromises: Promise<any>[] = []

      if (users.length > 0) {
        insertPromises.push(
          UserModel.insertMany(users, { ordered: false })
            .then((result) => { usersCreated += result.length })
            .catch((err) => {
              if (err.insertedDocs) usersCreated += err.insertedDocs.length
            })
        )
      }

      if (profiles.length > 0) {
        insertPromises.push(
          UserProfileModel.insertMany(profiles, { ordered: false })
            .then((result) => { profilesCreated += result.length })
            .catch((err) => {
              if (err.insertedDocs) profilesCreated += err.insertedDocs.length
            })
        )
      }

      if (badges.length > 0) {
        insertPromises.push(
          UserBadgeModel.insertMany(badges, { ordered: false })
            .then((result) => { badgesCreated += result.length })
            .catch((err) => {
              if (err.insertedDocs) badgesCreated += err.insertedDocs.length
            })
        )
      }

      await Promise.all(insertPromises)
      progressBar(batchEnd, userCount, 'Users', userStartTime)
    }
    console.log(' ✓')

    // ========================================
    // Step 2: Create Referrals
    // ========================================
    const referralCount = Math.floor(userCount * 0.25)
    const referralStartTime = Date.now()
    const referralDocs = []
    const usedReferees = new Set<string>()

    for (let i = 0; i < referralCount; i++) {
      const referrerIdx = randomBetween(0, Math.floor(userCount / 2))
      const refereeIdx = randomBetween(Math.floor(userCount / 2), userCount - 1)

      if (referrerIdx === refereeIdx) continue
      if (usedReferees.has(userWallets[refereeIdx])) continue
      usedReferees.add(userWallets[refereeIdx])

      referralDocs.push({
        referrerWallet: userWallets[referrerIdx],
        referredWallet: userWallets[refereeIdx],
        totalSpinsByReferred: randomBetween(0, 50),
        totalCommissionVICT: randomBetween(0, 10000),
        linkedAt: randomDate(90),
        lastActivityAt: randomDate(30),
        isSeedUser: true,
      })

      if (i % 1000 === 0) progressBar(i, referralCount, 'Referrals', referralStartTime)
    }

    for (let i = 0; i < referralDocs.length; i += BATCH_SIZE) {
      const batch = referralDocs.slice(i, i + BATCH_SIZE)
      await ReferralModel.insertMany(batch, { ordered: false }).catch(() => {})
    }
    progressBar(referralCount, referralCount, 'Referrals', referralStartTime)
    console.log(' ✓')

    // ========================================
    // Step 3: Generate Spins
    // ========================================
    const spinCount = Math.floor(userCount * 4)
    const spinStartTime = Date.now()
    const prizeTypes = ['liquid_victory', 'locked_victory', 'suitrump', 'no_prize'] as const
    const spinTypes = ['free', 'purchased', 'bonus'] as const
    const spinStatuses = ['pending', 'distributed', 'failed'] as const
    const lockDurations = ['1_week', '3_month', '1_year', '3_year'] as const

    let spinsCreated = 0
    const spinBatches = Math.ceil(spinCount / BATCH_SIZE)

    for (let batch = 0; batch < spinBatches; batch++) {
      const batchStart = batch * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, spinCount)
      const spinDocs = []

      for (let i = batchStart; i < batchEnd; i++) {
        const wallet = userWallets[Math.floor(Math.random() * userWallets.length)]
        const prizeType = prizeTypes[Math.floor(Math.random() * prizeTypes.length)]
        const status = spinStatuses[Math.floor(Math.random() * spinStatuses.length)]
        const createdAt = randomDate(90)

        const prizeAmount = prizeType === 'no_prize' ? 0 : randomBetween(100, 100000)
        const prizeValueUSD = prizeType === 'no_prize' ? 0 : randomBetween(1, 500)

        spinDocs.push({
          wallet,
          spinType: spinTypes[Math.floor(Math.random() * spinTypes.length)],
          serverSeed: randomTxHash(),
          randomValue: Math.random(),
          slotIndex: randomBetween(0, 15),
          prizeType,
          prizeAmount,
          prizeValueUSD,
          lockDuration: prizeType === 'locked_victory' ? lockDurations[Math.floor(Math.random() * lockDurations.length)] : null,
          status,
          distributedAt: status === 'distributed' ? randomDate(60) : null,
          distributedTxHash: status === 'distributed' ? randomTxHash() : null,
          distributedBy: status === 'distributed' ? 'admin' : null,
          failureReason: status === 'failed' ? 'Mock failure' : null,
          referredBy: Math.random() > 0.7 ? userWallets[Math.floor(Math.random() * userWallets.length)] : null,
          referralCommission: Math.random() > 0.7 ? randomBetween(10, 1000) : null,
          ip: '127.0.0.1',
          userAgent: 'Mock Browser',
          isSeedUser: true,
          createdAt,
          updatedAt: now,
        })
      }

      await SpinModel.insertMany(spinDocs, { ordered: false })
        .then((r) => { spinsCreated += r.length })
        .catch((e) => { if (e.insertedDocs) spinsCreated += e.insertedDocs.length })

      progressBar(batchEnd, spinCount, 'Spins', spinStartTime)
    }
    console.log(' ✓')

    // ========================================
    // Step 4: Generate Payments
    // ========================================
    const paymentCount = Math.floor(userCount * 0.3)
    const paymentStartTime = Date.now()
    const claimStatuses = ['unclaimed', 'claimed', 'manual', 'pending_approval'] as const
    const paymentDocs = []

    for (let i = 0; i < paymentCount; i++) {
      const wallet = userWallets[Math.floor(Math.random() * userWallets.length)]
      const amountSUI = randomBetween(1, 100)
      const claimStatus = claimStatuses[Math.floor(Math.random() * claimStatuses.length)]
      const timestamp = randomDate(90)

      paymentDocs.push({
        txHash: randomTxHash() + i,
        senderWallet: wallet,
        recipientWallet: adminWallet.toLowerCase(),
        amountMIST: (amountSUI * 1_000_000_000).toString(),
        amountSUI,
        claimStatus,
        claimedBy: claimStatus === 'claimed' ? wallet : null,
        claimedAt: claimStatus === 'claimed' ? randomDate(60) : null,
        spinsCredited: claimStatus === 'claimed' ? amountSUI : 0,
        rateAtClaim: 1,
        manualCredit: claimStatus === 'manual',
        creditedByAdmin: claimStatus === 'manual' ? 'admin' : null,
        adminNote: claimStatus === 'manual' ? 'Mock manual credit' : null,
        blockNumber: randomBetween(1000000, 9999999),
        timestamp,
        discoveredAt: timestamp,
        isSeedUser: true,
        createdAt: timestamp,
        updatedAt: now,
      })

      if (i % 500 === 0) progressBar(i, paymentCount, 'Payments', paymentStartTime)
    }

    for (let i = 0; i < paymentDocs.length; i += BATCH_SIZE) {
      const batch = paymentDocs.slice(i, i + BATCH_SIZE)
      await PaymentModel.insertMany(batch, { ordered: false }).catch(() => {})
    }
    progressBar(paymentCount, paymentCount, 'Payments', paymentStartTime)
    console.log(' ✓')

    // ========================================
    // Step 5: Generate Affiliate Rewards
    // ========================================
    const affiliateCount = Math.floor(userCount * 0.5)
    const affiliateStartTime = Date.now()
    const tweetStatuses = ['pending', 'clicked', 'completed'] as const
    const payoutStatuses = ['pending_tweet', 'ready', 'paid'] as const
    const affiliateDocs = []

    for (let i = 0; i < affiliateCount; i++) {
      const referrerWallet = userWallets[Math.floor(Math.random() * userWallets.length)]
      const refereeWallet = userWallets[Math.floor(Math.random() * userWallets.length)]
      const tweetStatus = tweetStatuses[Math.floor(Math.random() * tweetStatuses.length)]
      const payoutStatus = payoutStatuses[Math.floor(Math.random() * payoutStatuses.length)]
      const createdAt = randomDate(90)

      const weekEnding = new Date(createdAt)
      weekEnding.setDate(weekEnding.getDate() + (7 - weekEnding.getDay()))
      weekEnding.setHours(23, 59, 59, 999)

      const originalPrizeVICT = randomBetween(1000, 100000)
      const originalPrizeUSD = randomBetween(5, 500)
      const commissionRate = 0.10
      const rewardAmountVICT = Math.floor(originalPrizeVICT * commissionRate)
      const rewardValueUSD = Math.floor(originalPrizeUSD * commissionRate)

      affiliateDocs.push({
        referrerWallet,
        refereeWallet,
        fromSpinId: new mongoose.Types.ObjectId(),
        fromWallet: refereeWallet,
        originalPrizeVICT,
        originalPrizeUSD,
        commissionRate,
        rewardAmountVICT,
        rewardValueUSD,
        tweetStatus,
        tweetClickedAt: tweetStatus !== 'pending' ? randomDate(60) : null,
        tweetReturnedAt: tweetStatus === 'completed' ? randomDate(30) : null,
        tweetIntentUrl: 'https://twitter.com/intent/tweet?text=Mock',
        weekEnding,
        payoutStatus,
        status: payoutStatus === 'paid' ? 'paid' : 'pending',
        paidAt: payoutStatus === 'paid' ? randomDate(30) : null,
        paidTxHash: payoutStatus === 'paid' ? randomTxHash() : null,
        isSeedUser: true,
        createdAt,
        updatedAt: now,
      })

      if (i % 1000 === 0) progressBar(i, affiliateCount, 'Affiliates', affiliateStartTime)
    }

    for (let i = 0; i < affiliateDocs.length; i += BATCH_SIZE) {
      const batch = affiliateDocs.slice(i, i + BATCH_SIZE)
      await AffiliateRewardModel.insertMany(batch, { ordered: false }).catch(() => {})
    }
    progressBar(affiliateCount, affiliateCount, 'Affiliates', affiliateStartTime)
    console.log(' ✓')

    // ========================================
    // Summary
    // ========================================
    const totalDuration = Math.round((Date.now() - totalStartTime) / 1000)

    console.log('\n╔══════════════════════════════════════════════════╗')
    console.log('║              ✓ Mock Data Seeded!                  ║')
    console.log('╚══════════════════════════════════════════════════╝')

    const finalCounts = await Promise.all([
      UserModel.countDocuments({ isSeedUser: true }),
      SpinModel.countDocuments({ isSeedUser: true }),
      PaymentModel.countDocuments({ isSeedUser: true }),
      ReferralModel.countDocuments({ isSeedUser: true }),
      AffiliateRewardModel.countDocuments({ isSeedUser: true }),
      UserBadgeModel.countDocuments({ isSeedUser: true }),
      UserProfileModel.countDocuments({ isSeedUser: true }),
    ])

    console.log('\nFinal counts:')
    console.log(`  - Users:            ${finalCounts[0].toLocaleString()}`)
    console.log(`  - Spins:            ${finalCounts[1].toLocaleString()}`)
    console.log(`  - Payments:         ${finalCounts[2].toLocaleString()}`)
    console.log(`  - Referrals:        ${finalCounts[3].toLocaleString()}`)
    console.log(`  - Affiliate Rewards: ${finalCounts[4].toLocaleString()}`)
    console.log(`  - User Badges:      ${finalCounts[5].toLocaleString()}`)
    console.log(`  - User Profiles:    ${finalCounts[6].toLocaleString()}`)
    console.log(`\n  Total: ${finalCounts.reduce((a, b) => a + b, 0).toLocaleString()} records`)
    console.log(`  Duration: ${totalDuration} seconds (${Math.round(usersCreated / totalDuration)} users/sec)`)
    console.log('\n✓ You can now test with realistic data!\n')

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
