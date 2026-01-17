/**
 * PWA Migration Script
 *
 * Ensures PWA-related indexes are created in MongoDB.
 * Run with: npx tsx scripts/migrate-pwa.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local')
  process.exit(1)
}

async function migrate() {
  console.log('🔄 Connecting to MongoDB...')

  await mongoose.connect(MONGODB_URI as string)
  console.log('✅ Connected to MongoDB')

  const db = mongoose.connection.db
  if (!db) {
    console.error('❌ Database connection not established')
    process.exit(1)
  }

  const usersCollection = db.collection('users')

  console.log('\n📊 Current indexes on users collection:')
  const existingIndexes = await usersCollection.indexes()
  existingIndexes.forEach((idx: any) => {
    console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`)
  })

  // Create PWA wallet index if it doesn't exist
  console.log('\n🔧 Creating PWA indexes...')

  try {
    await usersCollection.createIndex(
      { pwaWallet: 1 },
      {
        unique: true,
        sparse: true,
        name: 'pwaWallet_1',
        background: true
      }
    )
    console.log('   ✅ pwaWallet index created/verified')
  } catch (err: any) {
    if (err.code === 85 || err.code === 86) {
      console.log('   ℹ️  pwaWallet index already exists')
    } else {
      console.error('   ❌ Error creating pwaWallet index:', err.message)
    }
  }

  // Verify the new indexes
  console.log('\n📊 Updated indexes:')
  const updatedIndexes = await usersCollection.indexes()
  const pwaIndex = updatedIndexes.find((idx: any) => idx.name === 'pwaWallet_1')
  if (pwaIndex) {
    console.log('   ✅ pwaWallet_1 index is active')
  } else {
    console.log('   ⚠️  pwaWallet_1 index not found')
  }

  // Show PWA field stats
  console.log('\n📈 PWA field statistics:')
  const totalUsers = await usersCollection.countDocuments()
  const usersWithPWA = await usersCollection.countDocuments({ pwaWallet: { $ne: null } })
  const usersWithPush = await usersCollection.countDocuments({ 'pwaPushSubscription.endpoint': { $exists: true } })

  console.log(`   Total users: ${totalUsers}`)
  console.log(`   Users with PWA linked: ${usersWithPWA}`)
  console.log(`   Users with push enabled: ${usersWithPush}`)

  await mongoose.disconnect()
  console.log('\n✅ Migration complete!')
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
