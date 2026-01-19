#!/usr/bin/env tsx
// ============================================
// CLI: Seed Default Configuration
// ============================================
// Usage: pnpm seed:defaults

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as readline from 'readline'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { AdminConfigModel, BadgeModel } from '../lib/db/models'
import { DEFAULT_ADMIN_CONFIG, BADGE_DEFINITIONS } from '../constants'

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
// Main Function
// ----------------------------------------

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║     SuiDex Games - Seed Default Config        ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    // Connect to database
    console.log('Connecting to database...')
    await connectDB()
    console.log('✓ Connected to MongoDB\n')

    // Check if config already exists
    const existingConfig = await AdminConfigModel.findById('main')
    
    if (existingConfig) {
      console.log('⚠ Configuration already exists!')
      console.log('\nCurrent config:')
      console.log(`  - Spin Rate: ${existingConfig.spinRateSUI} SUI per spin`)
      console.log(`  - Admin Wallet: ${existingConfig.adminWalletAddress || '(not set)'}`)
      console.log(`  - Referral Commission: ${existingConfig.referralCommissionPercent}%`)
      console.log(`  - Auto-approval Limit: ${existingConfig.autoApprovalLimitSUI} SUI`)
      console.log(`  - Prize Table: ${existingConfig.prizeTable?.length || 0} slots`)
      
      const proceed = await question('\nDo you want to reset to defaults? (y/N): ')
      if (proceed.toLowerCase() !== 'y') {
        console.log('\nOperation cancelled.')
        process.exit(0)
      }
      
      // Delete existing config
      await AdminConfigModel.deleteOne({ _id: 'main' })
      console.log('\n✓ Existing config removed')
    }

    // Get admin wallet address
    let adminWallet = process.env.ADMIN_WALLET_ADDRESS || ''
    
    if (!adminWallet) {
      console.log('\nAdmin wallet address not found in environment.')
      adminWallet = await question('Enter admin wallet address (0x...): ')
      adminWallet = adminWallet.trim().toLowerCase()
      
      if (!adminWallet.match(/^0x[a-f0-9]{64}$/)) {
        console.log('\n✗ Invalid SUI wallet address format')
        process.exit(1)
      }
    }

    console.log('\nSeeding default configuration...')

    // Create config
    const config = new AdminConfigModel({
      ...DEFAULT_ADMIN_CONFIG,
      adminWalletAddress: adminWallet,
      updatedAt: new Date(),
      updatedBy: 'system',
    })
    
    await config.save()

    // Seed badges
    console.log('\nSeeding badges...')
    const existingBadges = await BadgeModel.countDocuments()

    if (existingBadges > 0) {
      console.log(`  ⚠ ${existingBadges} badges already exist, skipping...`)
    } else {
      const badgeDocs = BADGE_DEFINITIONS.map((badge) => ({
        _id: badge._id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        tier: badge.tier,
        category: badge.category,
        criteria: badge.criteria,
        isActive: true,
        sortOrder: badge.sortOrder,
        createdAt: new Date(),
      }))

      await BadgeModel.insertMany(badgeDocs)
      console.log(`  ✓ ${badgeDocs.length} badges created`)
    }

    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║          ✓ Configuration Seeded!              ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log('\nSeeded values:')
    console.log(`  - Spin Rate: ${DEFAULT_ADMIN_CONFIG.spinRateSUI} SUI per spin`)
    console.log(`  - Admin Wallet: ${adminWallet.slice(0, 10)}...${adminWallet.slice(-4)}`)
    console.log(`  - Referral Commission: ${DEFAULT_ADMIN_CONFIG.referralCommissionPercent}%`)
    console.log(`  - Auto-approval Limit: ${DEFAULT_ADMIN_CONFIG.autoApprovalLimitSUI} SUI`)
    console.log(`  - Min Stake for Free Spin: $${DEFAULT_ADMIN_CONFIG.freeSpinMinStakeUSD}`)
    console.log(`  - Free Spin Cooldown: ${DEFAULT_ADMIN_CONFIG.freeSpinCooldownHours} hours`)
    console.log(`  - Prize Table: ${DEFAULT_ADMIN_CONFIG.prizeTable.length} slots configured`)
    console.log(`  - Badges Enabled: ${DEFAULT_ADMIN_CONFIG.badgesEnabled}`)
    console.log(`  - Profile Sharing: ${DEFAULT_ADMIN_CONFIG.profileSharingEnabled}`)
    console.log(`  - Profile Min Spins: ${DEFAULT_ADMIN_CONFIG.profileShareMinSpins}`)
    console.log('\nPrize Distribution:')
    
    // Show prize summary
    const prizeGroups: Record<string, { count: number; totalWeight: number }> = {}
    let totalWeight = 0
    
    for (const slot of DEFAULT_ADMIN_CONFIG.prizeTable) {
      if (!prizeGroups[slot.type]) {
        prizeGroups[slot.type] = { count: 0, totalWeight: 0 }
      }
      prizeGroups[slot.type].count++
      prizeGroups[slot.type].totalWeight += slot.weight
      totalWeight += slot.weight
    }
    
    for (const [type, data] of Object.entries(prizeGroups)) {
      const probability = ((data.totalWeight / totalWeight) * 100).toFixed(1)
      console.log(`  - ${type}: ${data.count} slots (${probability}% chance)`)
    }
    
    console.log('\n✓ Configuration is now active!\n')

  } catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  } finally {
    rl.close()
    await disconnectDB()
    process.exit(0)
  }
}

// Run
main()
