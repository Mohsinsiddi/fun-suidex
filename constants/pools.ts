// ============================================
// SUIDEX GAMES - Token & Pool Configuration
// ============================================
// Token details (logos from Noodles API), LP pools with
// direct farm stake links, and whitelisted swap pairs.

// ----------------------------------------
// Tokens
// ----------------------------------------

export interface TokenInfo {
  symbol: string
  name: string
  coinType: string
  logo: string
  decimals: number
  category: string
}

export const TOKENS: Record<string, TokenInfo> = {
  VICTORY: {
    symbol: 'VICTORY',
    name: 'Victory Token',
    coinType: '0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a::victory_token::VICTORY_TOKEN',
    logo: 'https://statics.noodles.fi/logo/14073456925822585264.png',
    decimals: 6,
    category: 'DEX',
  },
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    coinType: '0x2::sui::SUI',
    logo: 'https://statics.noodles.fi/logo/9617893563456752127',
    decimals: 9,
    category: 'Infrastructure',
  },
  SUITRUMP: {
    symbol: 'SUITRUMP',
    name: 'SUI TRUMP',
    coinType: '0xdeb831e796f16f8257681c0d5d4108fa94333060300b2459133a96631bf470b8::suitrump::SUITRUMP',
    logo: 'https://statics.noodles.fi/logo/15114178055604996909.png',
    decimals: 6,
    category: 'Meme',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USDC',
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    logo: 'https://statics.noodles.fi/logo/7322192062818965065.png',
    decimals: 6,
    category: 'Stablecoin',
  },
  WBTC: {
    symbol: 'wBTC',
    name: 'Wrapped BTC',
    coinType: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',
    logo: 'https://statics.noodles.fi/logo/5484066601415263617.png',
    decimals: 8,
    category: 'Infrastructure',
  },
}

// ----------------------------------------
// LP Pools (earn free spins by staking)
// ----------------------------------------

export interface LPPool {
  id: string
  token0: string // key into TOKENS
  token1: string
  label: string
  farmUrl: string
  enabled: boolean
}

const FARM_BASE = 'https://farm.suidex.org/pool'

export const LP_POOLS: LPPool[] = [
  {
    id: 'sui-victory',
    token0: 'SUI',
    token1: 'VICTORY',
    label: 'SUI / VICTORY',
    farmUrl: `${FARM_BASE}/bfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3C0x2%3A%3Asui%3A%3ASUI%2Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%3E?tab=stake&token=bfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3C0x2%3A%3Asui%3A%3ASUI%2Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%3E&token0=0x2%3A%3Asui%3A%3ASUI&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN&token0Symbol=SUI&token1Symbol=VICTORY`,
    enabled: true,
  },
  {
    id: 'victory-usdc',
    token0: 'VICTORY',
    token1: 'USDC',
    label: 'VICTORY / USDC',
    farmUrl: `${FARM_BASE}/0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%2Cdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7%3A%3Ausdc%3A%3AUSDC%3E?tab=stake&token=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%2Cdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7%3A%3Ausdc%3A%3AUSDC%3E&token0=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN&token1=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7%3A%3Ausdc%3A%3AUSDC&token0Symbol=VICTORY&token1Symbol=USDC`,
    enabled: true,
  },
  {
    id: 'wbtc-victory',
    token0: 'WBTC',
    token1: 'VICTORY',
    label: 'wBTC / VICTORY',
    farmUrl: `${FARM_BASE}/0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3Caafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b%3A%3Abtc%3A%3ABTC%2Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%3E?tab=stake&token=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Apair%3A%3ALPCoin%3Caafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b%3A%3Abtc%3A%3ABTC%2Cbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN%3E&token0=0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b%3A%3Abtc%3A%3ABTC&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN&token0Symbol=wBTC&token1Symbol=VICTORY`,
    enabled: true,
  },
]

// ----------------------------------------
// Whitelisted Swap Pairs (earn free spins)
// ----------------------------------------

export interface SwapPair {
  id: string
  token0: string // key into TOKENS
  token1: string
  label: string
  swapUrl: string
  enabled: boolean
}

const DEX_BASE = 'https://dex.suidex.org'

export const SWAP_PAIRS: SwapPair[] = [
  {
    id: 'sui-victory-swap',
    token0: 'SUI',
    token1: 'VICTORY',
    label: 'SUI → VICTORY',
    swapUrl: `${DEX_BASE}/swap?token0=0x2%3A%3Asui%3A%3ASUI&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN`,
    enabled: true,
  },
  {
    id: 'usdc-victory-swap',
    token0: 'USDC',
    token1: 'VICTORY',
    label: 'USDC → VICTORY',
    swapUrl: `${DEX_BASE}/swap?token0=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7%3A%3Ausdc%3A%3AUSDC&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN`,
    enabled: true,
  },
  {
    id: 'wbtc-victory-swap',
    token0: 'WBTC',
    token1: 'VICTORY',
    label: 'wBTC → VICTORY',
    swapUrl: `${DEX_BASE}/swap?token0=0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b%3A%3Abtc%3A%3ABTC&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN`,
    enabled: true,
  },
]

// ----------------------------------------
// Add Liquidity URLs
// ----------------------------------------

export const ADD_LIQUIDITY_URLS: Record<string, string> = {
  'sui-victory': `${DEX_BASE}/addliquidity?token0=0x2%3A%3Asui%3A%3ASUI&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN`,
  'victory-usdc': `${DEX_BASE}/addliquidity?token0=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN&token1=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7%3A%3Ausdc%3A%3AUSDC`,
  'wbtc-victory': `${DEX_BASE}/addliquidity?token0=0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b%3A%3Abtc%3A%3ABTC&token1=0xbfac5e1c6bf6ef29b12f7723857695fd2f4da9a11a7d88162c15e9124c243a4a%3A%3Avictory_token%3A%3AVICTORY_TOKEN`,
}

// ----------------------------------------
// Helper: get token pair logos for a pool/swap
// ----------------------------------------

export function getPoolTokens(pool: LPPool | SwapPair) {
  return {
    token0: TOKENS[pool.token0],
    token1: TOKENS[pool.token1],
  }
}
