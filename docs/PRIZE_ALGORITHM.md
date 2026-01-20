# Prize Algorithm & Configuration Guide

This document explains the spin wheel prize selection algorithm, Expected Value (EV) calculations, and how to configure prize weights.

## Table of Contents

- [What is Expected Value (EV)?](#what-is-expected-value-ev)
- [How the Algorithm Works](#how-the-algorithm-works)
- [Current Prize Table](#current-prize-table)
- [Probability Calculations](#probability-calculations)
- [How to Adjust Weights](#how-to-adjust-weights)
- [File Locations](#file-locations)

---

## What is Expected Value (EV)?

**Expected Value (EV)** is the average amount a user will win per spin over many spins. It's calculated by multiplying each prize's value by its probability and summing all results.

```
EV = Σ (Prize Value × Probability)
```

### Example
If you have:
- 50% chance to win $0
- 30% chance to win $5
- 20% chance to win $10

```
EV = (0.50 × $0) + (0.30 × $5) + (0.20 × $10)
EV = $0 + $1.50 + $2.00
EV = $3.50 per spin
```

### Why EV Matters
- **For Business**: If you sell spins for $1 and EV is $3.50, you lose $2.50 per spin on average
- **For Users**: Higher EV = better value for players
- **Sustainability**: EV should be less than spin price for long-term viability

---

## How the Algorithm Works

The prize selection uses **weighted random selection** with cryptographically secure randomness.

### Algorithm Steps

1. **Generate Secure Random Number**
   ```typescript
   const randomBytes = crypto.randomBytes(4)
   const randomValue = randomBytes.readUInt32BE(0) / 0xffffffff // 0-1
   ```

2. **Calculate Total Weight**
   ```typescript
   const totalWeight = prizeTable.reduce((sum, slot) => sum + slot.weight, 0)
   ```

3. **Calculate Target Weight**
   ```typescript
   const targetWeight = randomValue * totalWeight
   ```

4. **Select Prize Using Cumulative Weights**
   ```typescript
   let cumulativeWeight = 0
   for (const slot of prizeTable) {
     cumulativeWeight += slot.weight
     if (targetWeight < cumulativeWeight) {
       return slot  // Winner!
     }
   }
   ```

### Visual Example

With weights [100, 50, 200]:
- Total weight = 350
- Slot 0: covers 0-100 (28.57%)
- Slot 1: covers 100-150 (14.29%)
- Slot 2: covers 150-350 (57.14%)

If `randomValue = 0.5`, then `targetWeight = 175`, which falls in Slot 2's range.

---

## Current Prize Table

| Slot | Type | Amount | USD Value | Weight | Lock Duration | Probability |
|------|------|--------|-----------|--------|---------------|-------------|
| 0 | liquid_victory | 1,667 | $5 | 100 | None | 14.84% |
| 1 | liquid_victory | 16,667 | $50 | 50 | None | 7.42% |
| 2 | liquid_victory | 333,333 | $1,000 | 5 | None | 0.74% |
| 3 | locked_victory | 1,667 | $5 | 80 | 1 week | 11.87% |
| 4 | locked_victory | 6,667 | $20 | 60 | 1 week | 8.90% |
| 5 | locked_victory | 8,333 | $25 | 40 | 3 months | 5.93% |
| 6 | locked_victory | 16,667 | $50 | 30 | 3 months | 4.45% |
| 7 | locked_victory | 33,333 | $100 | 20 | 1 year | 2.97% |
| 8 | locked_victory | 83,333 | $250 | 10 | 1 year | 1.48% |
| 9 | locked_victory | 166,667 | $500 | 5 | 3 years | 0.74% |
| 10 | locked_victory | 666,666 | $2,000 | 2 | 3 years | 0.30% |
| 11 | locked_victory | 1,000,000 | $3,500 | 1 | 3 years | 0.15% |
| 12 | suitrump | 10 | $10 | 50 | None | 7.42% |
| 13 | suitrump | 50 | $50 | 20 | None | 2.97% |
| 14 | suitrump | 500 | $500 | 3 | None | 0.45% |
| 15 | no_prize | 0 | $0 | 200 | None | 29.67% |

**Total Weight: 676**

---

## Probability Calculations

### Current EV Breakdown

| Prize | Value | Weight | Probability | Contribution to EV |
|-------|-------|--------|-------------|-------------------|
| $5 liquid | $5 | 100 | 14.79% | $0.74 |
| $50 liquid | $50 | 50 | 7.40% | $3.70 |
| $1,000 liquid | $1,000 | 5 | 0.74% | $7.40 |
| $5 locked | $5 | 80 | 11.83% | $0.59 |
| $20 locked | $20 | 60 | 8.88% | $1.78 |
| $25 locked | $25 | 40 | 5.92% | $1.48 |
| $50 locked | $50 | 30 | 4.44% | $2.22 |
| $100 locked | $100 | 20 | 2.96% | $2.96 |
| $250 locked | $250 | 10 | 1.48% | $3.70 |
| $500 locked | $500 | 5 | 0.74% | $3.70 |
| $2,000 locked | $2,000 | 2 | 0.30% | $5.92 |
| $3,500 locked | $3,500 | 1 | 0.15% | $5.18 |
| $10 suitrump | $10 | 50 | 7.40% | $0.74 |
| $50 suitrump | $50 | 20 | 2.96% | $1.48 |
| $500 suitrump | $500 | 3 | 0.44% | $2.22 |
| No Prize | $0 | 200 | 29.59% | $0.00 |

### Current Expected Value: ~$43.80 per spin

### Biggest EV Contributors
1. $1,000 liquid Victory: $7.40/spin
2. $2,000 locked Victory: $5.92/spin
3. $3,500 locked Victory: $5.18/spin
4. $50 liquid Victory: $3.70/spin
5. $250 locked Victory: $3.70/spin
6. $500 locked Victory: $3.70/spin

---

## How to Adjust Weights

### To Lower EV (make game more profitable)

**Option 1: Increase "no_prize" weight**
```typescript
{ slotIndex: 15, type: 'no_prize', amount: 0, valueUSD: 0, weight: 500 } // was 200
```

**Option 2: Reduce high-value prize weights**
```typescript
{ slotIndex: 2, type: 'liquid_victory', amount: 333333, valueUSD: 1000, weight: 1 } // was 5
{ slotIndex: 10, type: 'locked_victory', amount: 666666, valueUSD: 2000, weight: 1 } // was 2
```

**Option 3: Add more low-value slots**
Replace high-value slots with multiple lower-value alternatives.

### To Raise EV (more generous to players)

- Increase weights on high-value prizes
- Decrease "no_prize" weight
- Add new high-value slots

### Example: Lowering EV to ~$5/spin

```typescript
export const DEFAULT_PRIZE_TABLE: PrizeSlot[] = [
  { slotIndex: 0, type: 'liquid_victory', amount: 1667, valueUSD: 5, weight: 100, lockDuration: null },
  { slotIndex: 1, type: 'liquid_victory', amount: 16667, valueUSD: 50, weight: 10, lockDuration: null },    // reduced
  { slotIndex: 2, type: 'liquid_victory', amount: 333333, valueUSD: 1000, weight: 1, lockDuration: null },  // reduced
  // ... other prizes with reduced weights
  { slotIndex: 15, type: 'no_prize', amount: 0, valueUSD: 0, weight: 800, lockDuration: null },             // increased
]
```

### Weight Adjustment Formula

To achieve a target EV:

1. Calculate current EV
2. Determine how much to reduce
3. Adjust weights proportionally

```
New Weight = Old Weight × (Target EV / Current EV)
```

Or increase "no_prize" weight:
```
New No Prize Weight = (Total Prize EV - Target EV × Total Slots) / Target EV
```

---

## File Locations

| File | Purpose |
|------|---------|
| `constants/index.ts` | Default prize table (`DEFAULT_PRIZE_TABLE`) |
| `lib/utils/prizes.ts` | Prize selection algorithm (`selectPrizeSlot`) |
| `lib/db/models/AdminConfig.ts` | Database schema for prize configuration |
| `types/index.ts` | TypeScript types (`PrizeSlot`, `SpinResult`) |

### Prize Table Structure

```typescript
interface PrizeSlot {
  slotIndex: number        // 0-15 (position on wheel)
  type: string             // 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  amount: number           // Token amount to award
  valueUSD: number         // USD value for EV calculation
  weight: number           // Selection probability weight
  lockDuration: string | null  // '1_week' | '3_month' | '1_year' | '3_year' | null
}
```

### Updating via Admin Panel

The prize table can also be updated through the admin dashboard at `/admin/config`, which saves to the `AdminConfig` collection in MongoDB.

---

## Security Notes

- Uses `crypto.randomBytes()` for cryptographically secure randomness
- Server-side only - never expose randomness generation to client
- Each spin generates a unique `serverSeed` for audit trail
- Prize selection is deterministic given the random value (reproducible for verification)

---

## Quick Reference

| Metric | Current Value |
|--------|---------------|
| Total Slots | 16 |
| Total Weight | 676 |
| Expected Value | ~$43.80/spin |
| No Prize Chance | 29.67% |
| Win Any Prize | 70.33% |
| Jackpot ($3,500) Chance | 0.15% |
