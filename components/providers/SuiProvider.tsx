'use client'

// ============================================
// Sui Wallet Provider
// ============================================

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// ----------------------------------------
// Network Configuration
// ----------------------------------------

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
})

// ----------------------------------------
// Provider Component
// ----------------------------------------

interface SuiProviderProps {
  children: ReactNode
}

export function SuiProvider({ children }: SuiProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider
          autoConnect={true}
          stashedWallet={{
            name: 'SuiDex Games',
          }}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

export default SuiProvider
