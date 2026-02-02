// ============================================
// Spin & Prize Logic
// ============================================

import crypto from 'crypto'
import type { PrizeSlot, SpinResult } from '@/types'
import { WHEEL_CONFIG } from '@/constants'

// ----------------------------------------
// Prize Selection (Weighted Random)
// ----------------------------------------

/**
 * Select a prize slot using weighted random selection
 * Uses cryptographically secure randomness
 */
export function selectPrizeSlot(prizeTable: PrizeSlot[]): {
  slot: PrizeSlot
  serverSeed: string
  randomValue: number
} {
  // Generate cryptographically secure random values
  const serverSeed = crypto.randomBytes(32).toString('hex')
  const randomBytes = crypto.randomBytes(4)
  const randomValue = randomBytes.readUInt32BE(0) / 0xffffffff // 0-1
  
  // Calculate total weight
  const totalWeight = prizeTable.reduce((sum, slot) => sum + slot.weight, 0)
  
  // Select slot based on weighted random
  let cumulativeWeight = 0
  const targetWeight = randomValue * totalWeight
  
  for (const slot of prizeTable) {
    cumulativeWeight += slot.weight
    if (targetWeight < cumulativeWeight) {
      return { slot, serverSeed, randomValue }
    }
  }
  
  // Fallback to last slot (should never reach here)
  return {
    slot: prizeTable[prizeTable.length - 1],
    serverSeed,
    randomValue,
  }
}

/**
 * Calculate wheel rotation for a given slot
 * Returns total degrees to rotate
 */
export function calculateWheelRotation(slotIndex: number): number {
  const { MIN_ROTATIONS, MAX_ROTATIONS, SLOT_ANGLE } = WHEEL_CONFIG
  
  // Random number of full rotations
  const fullRotations =
    MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS)
  
  // Calculate target angle (slots are numbered clockwise from top)
  // Wheel rotates clockwise, so we need to calculate where the pointer lands
  const slotAngle = slotIndex * SLOT_ANGLE + SLOT_ANGLE / 2
  
  // Total rotation = full rotations + angle to land on slot
  return Math.floor(fullRotations * 360 + (360 - slotAngle))
}

/**
 * Get slot index from wheel rotation angle
 */
export function getSlotFromRotation(degrees: number): number {
  const { SLOT_COUNT, SLOT_ANGLE } = WHEEL_CONFIG
  
  // Normalize to 0-360
  const normalizedDegrees = ((degrees % 360) + 360) % 360
  
  // Calculate slot (pointer at top, wheel rotated clockwise)
  const slotIndex = Math.floor((360 - normalizedDegrees) / SLOT_ANGLE) % SLOT_COUNT
  
  return slotIndex
}

// ----------------------------------------
// Prize Calculations
// ----------------------------------------

/**
 * Calculate referral commission for a prize
 */
export function calculateReferralCommission(
  prizeAmount: number,
  commissionPercent: number
): number {
  if (prizeAmount <= 0 || commissionPercent <= 0) return 0
  return Math.floor(prizeAmount * (commissionPercent / 100))
}

/**
 * Get next Sunday (end of week) for affiliate reward batching
 */
export function getWeekEndingDate(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + daysUntilSunday)
  sunday.setHours(23, 59, 59, 999)
  
  return sunday
}

// ----------------------------------------
// Eligibility Checks
// ----------------------------------------

/**
 * Check if user is eligible for free spin based on staking
 * This would query the main SuiDex database
 */
export async function checkStakingEligibility(
  wallet: string,
  minStakeUSD: number
): Promise<{ eligible: boolean; stakedUSD: number }> {
  // TODO: Implement actual staking check from main SuiDex DB
  // For now, return mock data
  
  // This would typically:
  // 1. Query main SuiDex MongoDB for user's staked amounts
  // 2. Calculate USD value based on current token prices
  // 3. Return eligibility status
  
  return {
    eligible: true, // Mock: always eligible for testing
    stakedUSD: 50,
  }
}

/**
 * Calculate time until next free spin is available
 */
export function getNextFreeSpinTime(
  lastSpinAt: Date | null,
  cooldownHours: number
): Date | null {
  if (!lastSpinAt) return null
  
  const nextSpinTime = new Date(lastSpinAt)
  nextSpinTime.setHours(nextSpinTime.getHours() + cooldownHours)
  
  return nextSpinTime > new Date() ? nextSpinTime : null
}

// ----------------------------------------
// Statistics
// ----------------------------------------

/**
 * Calculate prize probability percentages for display
 */
export function calculatePrizeProbabilities(prizeTable: PrizeSlot[]): {
  type: string
  probability: number
  slots: number
}[] {
  const totalWeight = prizeTable.reduce((sum, slot) => sum + slot.weight, 0)
  
  const grouped = prizeTable.reduce(
    (acc, slot) => {
      if (!acc[slot.type]) {
        acc[slot.type] = { weight: 0, slots: 0 }
      }
      acc[slot.type].weight += slot.weight
      acc[slot.type].slots += 1
      return acc
    },
    {} as Record<string, { weight: number; slots: number }>
  )
  
  return Object.entries(grouped).map(([type, data]) => ({
    type,
    probability: (data.weight / totalWeight) * 100,
    slots: data.slots,
  }))
}

/**
 * Calculate expected value per spin
 */
export function calculateExpectedValue(prizeTable: PrizeSlot[]): number {
  const totalWeight = prizeTable.reduce((sum, slot) => sum + slot.weight, 0)
  
  return prizeTable.reduce((ev, slot) => {
    const probability = slot.weight / totalWeight
    return ev + slot.valueUSD * probability
  }, 0)
}
