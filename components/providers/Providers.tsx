'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { useState } from 'react';

// Import dapp-kit styles
import '@mysten/dapp-kit/dist/index.css';

const networks = {
  mainnet: { url: getJsonRpcFullnodeUrl('mainnet'), network: 'mainnet' as const },
  testnet: { url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' as const },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet') || 'testnet'}>
        <WalletProvider
          autoConnect={true}
          preferredWallets={['Sui Wallet', 'Suiet', 'Ethos Wallet']}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
