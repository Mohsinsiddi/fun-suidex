#!/usr/bin/env tsx
// ============================================
// CLI: Migrate Admin Badge Permissions
// ============================================
// Usage: pnpm migrate:admin-badges
// Adds canManageBadges permission to all existing admins

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { AdminModel } from '../lib/db/models'

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║   Migrate Admin Badge Permissions             ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    console.log('Connecting to database...')
    await connectDB()
    console.log('✓ Connected to MongoDB\n')

    // Find admins without canManageBadges permission
    const adminsWithoutPermission = await AdminModel.find({
      'permissions.canManageBadges': { $exists: false },
    })

    if (adminsWithoutPermission.length === 0) {
      console.log('✓ All admins already have canManageBadges permission')
    } else {
      console.log(`Found ${adminsWithoutPermission.length} admin(s) to update:\n`)

      for (const admin of adminsWithoutPermission) {
        // Super admins get true, regular admins get false
        const canManageBadges = admin.role === 'super_admin'

        await AdminModel.updateOne(
          { _id: admin._id },
          { $set: { 'permissions.canManageBadges': canManageBadges } }
        )

        console.log(`  ✓ ${admin.username} (${admin.role}) - canManageBadges: ${canManageBadges}`)
      }

      console.log('\n✓ Migration complete!')
    }

    // Show current state
    console.log('\nCurrent admin permissions:')
    const allAdmins = await AdminModel.find().select('username role permissions')
    for (const admin of allAdmins) {
      console.log(`  - ${admin.username} (${admin.role}): canManageBadges=${admin.permissions.canManageBadges}`)
    }

  } catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  } finally {
    await disconnectDB()
    process.exit(0)
  }
}

main()
