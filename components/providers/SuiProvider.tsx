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

// ----------------------------------------
// Dark Theme (matches your app)
// ----------------------------------------

const darkTheme: ThemeVars = {
  blurs: {
    modalOverlay: 'blur(4px)',
  },
  backgroundColors: {
    primaryButton: '#00ff88',
    primaryButtonHover: '#00cc6a',
    outlineButtonHover: 'rgba(0, 255, 136, 0.1)',
    modalOverlay: 'rgba(0, 0, 0, 0.8)',
    modalPrimary: '#0f1a0f',
    modalSecondary: '#162016',
    iconButton: 'transparent',
    iconButtonHover: 'rgba(0, 255, 136, 0.1)',
    dropdownMenu: '#0f1a0f',
    dropdownMenuSeparator: '#1a2e1a',
    walletItemSelected: 'rgba(0, 255, 136, 0.1)',
    walletItemHover: 'rgba(255, 255, 255, 0.05)',
  },
  borderColors: {
    outlineButton: '#1a2e1a',
  },
  colors: {
    primaryButton: '#000000',
    outlineButton: '#00ff88',
    iconButton: '#9ca3af',
    body: '#e5e7eb',
    bodyMuted: '#9ca3af',
    bodyDanger: '#ef4444',
  },
  radii: {
    small: '8px',
    medium: '12px',
    large: '16px',
    xlarge: '24px',
  },
  shadows: {
    primaryButton: '0 4px 12px rgba(0, 255, 136, 0.3)',
    walletItemSelected: '0 0 0 2px rgba(0, 255, 136, 0.3)',
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
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

export default SuiProvider