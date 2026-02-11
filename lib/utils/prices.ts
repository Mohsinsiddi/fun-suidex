// ============================================
// Shared Server-Side Price Utility
// ============================================
// Fetches VICT + TRUMP prices from Noodles API with 5-min in-memory cache.
// Used by both /api/prices route and spin API.

const TOKENS = {
  VICT: '0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a::victory_token::VICTORY_TOKEN',
  TRUMP: '0xdeb831e796f16f8257681c0d5d4108fa94333060300b2459133a96631bf470b8::suitrump::SUITRUMP',
} as const

// ----------------------------------------
// In-memory cache (5 minutes)
// ----------------------------------------

export interface TokenPrices {
  vict: number
  trump: number
  victChange24h: number
  trumpChange24h: number
  updatedAt: number
}

let cache: TokenPrices | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ----------------------------------------
// Fetch price from Noodles
// ----------------------------------------

async function fetchTokenPrice(coinType: string): Promise<{ price: number; change24h: number } | null> {
  const apiKey = process.env.NOODLES_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.noodles.fi/api/v1/partner/coin-detail?coin_id=${encodeURIComponent(coinType)}`,
      {
        headers: {
          'Accept-Encoding': 'application/json',
          'x-api-key': apiKey,
          'x-chain': 'sui',
        },
      }
    )

    const data = await res.json()

    if (data.code !== 200 || !data.data?.price_change) return null

    return {
      price: data.data.price_change.price,
      change24h: data.data.price_change.price_change_1d,
    }
  } catch (err) {
    console.error(`[prices] Failed to fetch ${coinType}:`, err)
    return null
  }
}

// ----------------------------------------
// Public API
// ----------------------------------------

/**
 * Get live token prices with 5-min in-memory cache.
 * Returns cached data if fresh, fetches from Noodles API otherwise.
 */
export async function getTokenPrices(): Promise<TokenPrices> {
  // Return cache if still fresh
  if (cache && Date.now() - cache.updatedAt < CACHE_TTL) {
    return cache
  }

  // Fetch both prices in parallel
  const [vict, trump] = await Promise.all([
    fetchTokenPrice(TOKENS.VICT),
    fetchTokenPrice(TOKENS.TRUMP),
  ])

  if (!vict && !trump && cache) {
    // Both failed but we have stale cache — return it
    return cache
  }

  cache = {
    vict: vict?.price ?? cache?.vict ?? 0,
    trump: trump?.price ?? cache?.trump ?? 0,
    victChange24h: vict?.change24h ?? 0,
    trumpChange24h: trump?.change24h ?? 0,
    updatedAt: Date.now(),
  }

  return cache
}

/**
 * Calculate USD value for a prize given its token amount and type.
 */
export function calculatePrizeValueUSD(
  amount: number,
  prizeType: string,
  prices: { vict: number; trump: number }
): number {
  if (prizeType === 'no_prize' || amount <= 0) return 0
  if (prizeType === 'suitrump') return amount * prices.trump
  // liquid_victory and locked_victory both use VICT price
  return amount * prices.vict
}
