'use client'

// ============================================
// Sui Wallet Provider with Dark Theme
// Uses official @mysten/dapp-kit
// ============================================

import '@mysten/dapp-kit/dist/index.css'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import type { ThemeVars } from '@mysten/dapp-kit'
import { WalletChangeHandler } from './WalletChangeHandler'

// ----------------------------------------
// Dark Theme (matches your app)
// ----------------------------------------

const darkTheme: ThemeVars = {
  blurs: {
    modalOverlay: 'blur(4px)',
  },
  backgroundColors: {
    primaryButton: '#00e5ff',
    primaryButtonHover: '#00b8d4',
    outlineButtonHover: 'rgba(0, 229, 255, 0.1)',
    modalOverlay: 'rgba(0, 0, 0, 0.8)',
    modalPrimary: '#0f1218',
    modalSecondary: '#161b24',
    iconButton: 'transparent',
    iconButtonHover: 'rgba(0, 229, 255, 0.1)',
    dropdownMenu: '#0f1218',
    dropdownMenuSeparator: '#1e2530',
    walletItemSelected: 'rgba(0, 229, 255, 0.1)',
    walletItemHover: 'rgba(255, 255, 255, 0.05)',
  },
  borderColors: {
    outlineButton: '#1e2530',
  },
  colors: {
    primaryButton: '#000000',
    outlineButton: '#00e5ff',
    iconButton: '#8899aa',
    body: '#e5e7eb',
    bodyMuted: '#8899aa',
    bodyDanger: '#ef4444',
  },
  radii: {
    small: '8px',
    medium: '12px',
    large: '16px',
    xlarge: '24px',
  },
  shadows: {
    primaryButton: '0 4px 12px rgba(0, 229, 255, 0.3)',
    walletItemSelected: '0 0 0 2px rgba(0, 229, 255, 0.3)',
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    bold: '600',
  },
  fontSizes: {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontStyle: 'normal',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
}

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
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 3, // Retry failed queries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider
          autoConnect={true}
          preferredWallets={['Slush', 'Nightly', 'Phantom', 'Sui Wallet']}
          theme={darkTheme}
          stashedWallet={{
            name: 'SuiDex Games PWA',
          }}
        >
          <WalletChangeHandler />
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

export default SuiProvider