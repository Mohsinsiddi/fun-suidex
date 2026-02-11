#!/usr/bin/env tsx
// Quick script to update prize table in existing AdminConfig
// Usage: pnpm tsx scripts/update-prize-table.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { AdminConfigModel } from '../lib/db/models'
import { DEFAULT_PRIZE_TABLE } from '../constants'

async function main() {
  console.log('Connecting to database...')
  await connectDB()

  const existing = await AdminConfigModel.findById('main')
  if (!existing) {
    console.log('No config found. Run pnpm seed:defaults first.')
    process.exit(1)
  }

  console.log(`Current prize table: ${existing.prizeTable.length} slots`)
  console.log('Updating to new DEFAULT_PRIZE_TABLE...\n')

  await AdminConfigModel.updateOne(
    { _id: 'main' },
    { $set: { prizeTable: DEFAULT_PRIZE_TABLE, updatedAt: new Date(), updatedBy: 'script:update-prize-table' } }
  )

  console.log('Updated prize table:')
  for (const slot of DEFAULT_PRIZE_TABLE) {
    const amt = slot.amount >= 1_000_000
      ? `${(slot.amount / 1_000_000).toFixed(1)}M`
      : slot.amount >= 1_000
        ? `${(slot.amount / 1_000).toFixed(0)}K`
        : String(slot.amount)
    console.log(`  #${slot.slotIndex}: ${amt} ${slot.type} (weight: ${slot.weight}${slot.lockDuration ? `, lock: ${slot.lockDuration}` : ''})`)
  }

  console.log('\n✓ Prize table updated!')
  await disconnectDB()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
