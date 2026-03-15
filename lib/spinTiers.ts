// ============================================
// Spin Tier Calculation
// ============================================
// Tiered free spin rewards based on deposit/stake amount in USD.
// Higher deposits unlock more spins per transaction.

export interface SpinTier {
  minUSD: number
  spins: number
}

// Tiers must be sorted descending by minUSD for lookup
export const SPIN_TIERS: SpinTier[] = [
  { minUSD: 5000, spins: 10 },
  { minUSD: 4000, spins: 9 },
  { minUSD: 3200, spins: 8 },
  { minUSD: 1600, spins: 7 },
  { minUSD: 800, spins: 6 },
  { minUSD: 400, spins: 5 },
  { minUSD: 200, spins: 4 },
  { minUSD: 100, spins: 3 },
  { minUSD: 50, spins: 2 },
  { minUSD: 20, spins: 1 },
]

/**
 * Calculate spins credited for a given USD amount using tiered pricing.
 * Returns 0 if amount is below the minimum tier ($20).
 */
export function calculateSpinsFromUSD(amountUSD: number): number {
  for (const tier of SPIN_TIERS) {
    if (amountUSD >= tier.minUSD) {
      return tier.spins
    }
  }
  return 0
}
