import crypto from 'crypto';
import { IPrizeSlot } from '@/lib/db/models/AdminConfig';

export interface SpinResult {
  serverSeed: string;
  randomValue: number;
  slotIndex: number;
  prizeSlot: IPrizeSlot;
}

/**
 * Generate a cryptographically secure random value between 0 and 1
 */
export function generateSecureRandom(): { seed: string; value: number } {
  const seed = crypto.randomBytes(32).toString('hex');
  const buffer = crypto.randomBytes(8);
  const value = buffer.readBigUInt64BE() / BigInt('18446744073709551615');
  return { seed, value: Number(value) };
}

/**
 * Select a prize slot based on weighted probabilities
 */
export function selectPrizeSlot(prizeTable: IPrizeSlot[], randomValue: number): IPrizeSlot {
  // Calculate total weight
  const totalWeight = prizeTable.reduce((sum, slot) => sum + slot.weight, 0);
  
  // Normalize and select
  let cumulative = 0;
  const target = randomValue * totalWeight;
  
  for (const slot of prizeTable) {
    cumulative += slot.weight;
    if (target <= cumulative) {
      return slot;
    }
  }
  
  // Fallback to last slot (shouldn't happen)
  return prizeTable[prizeTable.length - 1];
}

/**
 * Execute a spin and get the result
 */
export function executeSpin(prizeTable: IPrizeSlot[]): SpinResult {
  const { seed, value } = generateSecureRandom();
  const prizeSlot = selectPrizeSlot(prizeTable, value);
  
  return {
    serverSeed: seed,
    randomValue: value,
    slotIndex: prizeSlot.slotIndex,
    prizeSlot,
  };
}

/**
 * Calculate referral commission
 */
export function calculateReferralCommission(
  prizeAmount: number,
  commissionPercent: number
): number {
  return Math.floor(prizeAmount * (commissionPercent / 100));
}

/**
 * Get next Sunday (for weekly batching)
 */
export function getNextSunday(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
}

/**
 * Calculate wheel rotation degrees for a slot
 * The wheel has 16 slots, each 22.5 degrees
 */
export function calculateWheelRotation(slotIndex: number): number {
  const slotDegrees = 360 / 16; // 22.5 degrees per slot
  const baseRotations = 5; // Minimum full rotations
  
  // Calculate the angle to the center of the target slot
  // Slot 0 is at the top, we need to adjust for the pointer position
  const targetAngle = slotIndex * slotDegrees;
  
  // Add randomness within the slot (to make it look natural)
  const slotVariance = (Math.random() - 0.5) * (slotDegrees * 0.6);
  
  return (baseRotations * 360) + targetAngle + slotVariance;
}

/**
 * Format prize amount for display
 */
export function formatPrizeAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString();
}

/**
 * Format USD value for display
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
