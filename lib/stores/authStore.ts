import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserData {
  wallet: string;
  referralCode: string;
  purchasedSpins: number;
  bonusSpins: number;
  totalSpins: number;
  totalWinsUSD: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  user: UserData | null;
  error: string | null;
  
  login: (wallet: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  setUser: (user: UserData) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      user: null,
      error: null,

      login: async (wallet: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Step 1: Get nonce
          const nonceRes = await fetch('/api/auth/nonce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet }),
          });
          
          if (!nonceRes.ok) {
            throw new Error('Failed to get nonce');
          }
          
          const { data: { nonce, message } } = await nonceRes.json();
          
          // Step 2: Sign message with wallet
          // This will be handled by the dapp-kit's signPersonalMessage
          // For now, we'll simulate it
          const signature = await signMessage(message);
          
          // Step 3: Verify signature and get tokens
          const verifyRes = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet, signature, nonce }),
          });
          
          if (!verifyRes.ok) {
            const err = await verifyRes.json();
            throw new Error(err.error || 'Verification failed');
          }
          
          const { data } = await verifyRes.json();
          
          set({
            isAuthenticated: true,
            accessToken: data.accessToken,
            user: data.user,
            isLoading: false,
          });
          
          // Store refresh token in httpOnly cookie (done by server)
        } catch (error) {
          set({
            isAuthenticated: false,
            accessToken: null,
            user: null,
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
          // Ignore errors
        }
        
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
          error: null,
        });
      },

      refreshToken: async () => {
        try {
          const res = await fetch('/api/auth/refresh', { method: 'POST' });
          
          if (!res.ok) {
            get().logout();
            return false;
          }
          
          const { data } = await res.json();
          
          set({
            accessToken: data.accessToken,
            isAuthenticated: true,
          });
          
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      setUser: (user: UserData) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'suidex-auth',
      partialize: (state) => ({
        // Only persist these fields
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);

// Helper function to sign message with wallet
// This is a placeholder - actual implementation will use dapp-kit
async function signMessage(message: string): Promise<string> {
  // In the actual implementation, this would use:
  // const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  // return await signPersonalMessage({ message: new TextEncoder().encode(message) });
  
  // For now, throw an error to indicate this needs wallet integration
  throw new Error('Please use the wallet to sign the message');
}
