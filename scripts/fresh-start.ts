#!/usr/bin/env tsx
// ============================================
// CLI: Fresh Start - Wipe User Data
// ============================================
// Usage: pnpm fresh-start
//
// Drops all user-generated collections while keeping
// system config (AdminConfig, Badge, Admin) intact.
// Use this to reset the platform to a clean state.

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as readline from 'readline'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import mongoose from 'mongoose'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

// Collections that hold user-generated data (safe to drop)
// NOTE: collection names must match actual MongoDB names
// (some use underscores via explicit `collection:` in schema)
const USER_DATA_COLLECTIONS = [
  'users',
  'spins',
  'user_badges',       // explicit collection name in schema
  'user_profiles',     // explicit collection name in schema
  'referrals',
  'affiliaterewards',
  'chaintransactions',
  'payments',          // legacy collection (replaced by chaintransactions)
  'lpcredits',
  'adminlogs',
  'admininvites',
  'distributioncheckpoints',
  'transfertokens',
]

// Collections that are system config (never drop)
const SYSTEM_COLLECTIONS = [
  'adminconfigs',
  'badges',
  'admins',
]

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║       SuiDex Games - Fresh Start              ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    console.log('Connecting to database...')
    await connectDB()
    console.log('✓ Connected to MongoDB\n')

    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')

    // Show what exists
    const existingCollections = (await db.listCollections().toArray()).map(c => c.name)

    console.log('System collections (KEPT):')
    for (const col of SYSTEM_COLLECTIONS) {
      const exists = existingCollections.includes(col)
      if (exists) {
        const count = await db.collection(col).countDocuments()
        console.log(`  ✓ ${col} (${count} docs)`)
      } else {
        console.log(`  - ${col} (not created yet)`)
      }
    }

    console.log('\nUser data collections (WILL BE DROPPED):')
    let hasData = false
    for (const col of USER_DATA_COLLECTIONS) {
      const exists = existingCollections.includes(col)
      if (exists) {
        const count = await db.collection(col).countDocuments()
        console.log(`  ✗ ${col} (${count} docs)`)
        if (count > 0) hasData = true
      } else {
        console.log(`  - ${col} (empty/not created)`)
      }
    }

    if (!hasData) {
      console.log('\n✓ No user data to wipe. Already clean!')
      process.exit(0)
    }

    // Double confirmation
    console.log('\n⚠ WARNING: This will permanently delete ALL user data!')
    console.log('  This includes: users, spins, profiles, referrals, payments, badges earned, etc.')
    console.log('  System config, badge definitions, and admin accounts will be preserved.\n')

    const confirm1 = await question('Type "FRESH START" to confirm: ')
    if (confirm1 !== 'FRESH START') {
      console.log('\nOperation cancelled.')
      process.exit(0)
    }

    // Drop collections
    console.log('\nDropping user data collections...')
    for (const col of USER_DATA_COLLECTIONS) {
      if (existingCollections.includes(col)) {
        await db.collection(col).drop()
        console.log(`  ✓ Dropped ${col}`)
      }
    }

    // Also reset the chain sync cursor in AdminConfig so payment sync starts fresh
    const { AdminConfigModel } = await import('../lib/db/models')
    await AdminConfigModel.updateOne(
      { _id: 'main' },
      {
        $unset: { chainSyncCursor: 1 },
        $set: { updatedAt: new Date(), updatedBy: 'fresh-start-script' },
      }
    )
    console.log('  ✓ Reset chain sync cursor in config')

    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║          ✓ Fresh Start Complete!              ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log('\nThe platform is now clean. Existing users will')
    console.log('get new accounts when they reconnect their wallets.\n')

  } catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  } finally {
    rl.close()
    await disconnectDB()
    process.exit(0)
  }
}

main()
