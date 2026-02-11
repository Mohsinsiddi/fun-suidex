// ============================================
// SUI Network Configuration
// ============================================
// Single source of truth for network selection.
// Controlled by NEXT_PUBLIC_SUI_NETWORK env var.
// Set to "testnet" or "mainnet" in .env.local.

export type SuiNetwork = 'mainnet' | 'testnet'

/**
 * Current SUI network from env. Defaults to testnet.
 */
export function getSuiNetwork(): SuiNetwork {
  const net = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'
  if (net === 'mainnet' || net === 'testnet') return net
  return 'testnet'
}

/**
 * SuiScan explorer base URLs for the current network
 */
export function getExplorerUrls(network?: SuiNetwork) {
  const net = network || getSuiNetwork()
  return {
    tx: `https://suiscan.xyz/${net}/tx/`,
    account: `https://suiscan.xyz/${net}/account/`,
    object: `https://suiscan.xyz/${net}/object/`,
  }
}

/**
 * Build a SuiScan transaction URL
 */
export function explorerTxUrl(txHash: string, network?: SuiNetwork): string {
  const { tx } = getExplorerUrls(network)
  return `${tx}${txHash}`
}

/**
 * Build a SuiScan account URL
 */
export function explorerAccountUrl(address: string, network?: SuiNetwork): string {
  const { account } = getExplorerUrls(network)
  return `${account}${address}`
}
