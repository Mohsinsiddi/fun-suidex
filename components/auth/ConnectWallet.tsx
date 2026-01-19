'use client';

import { useState } from 'react';
import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets, useSignPersonalMessage } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/authStore';

export function ConnectWallet() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect } = useConnectWallet();
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage();
  const wallets = useWallets();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletSelect, setShowWalletSelect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const { isAuthenticated, login, isLoading, fetchUser } = useAuthStore();

  const handleSignIn = async () => {
    if (!currentAccount?.address) return;
    setSigningIn(true);

    try {
      // Get nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: currentAccount.address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceData.success) {
        setSigningIn(false);
        return;
      }

      // Sign message
      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const success = await login(
              currentAccount.address,
              sig.signature,
              nonceData.data.nonce
            );
            if (success) {
              await fetchUser();
            }
            setSigningIn(false);
          },
          onError: () => {
            setSigningIn(false);
          },
        }
      );
    } catch (err) {
      setSigningIn(false);
    }
  };

  const handleConnect = async (walletName: string) => {
    const wallet = wallets.find(w => w.name === walletName);
    if (wallet) {
      connect({ wallet });
      setShowWalletSelect(false);
    }
  };

  const handleDisconnect = () => {
    // Just disconnect the wallet - WalletChangeHandler will detect
    // the change and handle logout API + store cleanup
    disconnect();
    setShowDropdown(false);
  };

  const copyAddress = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Not connected - show connect button
  if (!currentAccount) {
    return (
      <div className="relative">
        <Button
          onClick={() => setShowWalletSelect(true)}
          leftIcon={<Wallet size={18} />}
        >
          Connect
        </Button>

        {/* Wallet Selection Modal */}
        <AnimatePresence>
          {showWalletSelect && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWalletSelect(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-64 p-2 bg-[var(--card-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-50"
              >
                <p className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Select Wallet
                </p>
                {wallets.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-[var(--text-secondary)] text-center">
                    No wallets detected. Please install a Sui wallet.
                  </p>
                ) : (
                  wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleConnect(wallet.name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--card)] transition-colors"
                    >
                      {wallet.icon && (
                        <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
                      )}
                      <span className="font-medium">{wallet.name}</span>
                    </button>
                  ))
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Connected but not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <Button
        onClick={handleSignIn}
        isLoading={signingIn || isSigning || isLoading}
        leftIcon={<Wallet size={18} />}
      >
        Sign In
      </Button>
    );
  }

  // Connected and authenticated - show account dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
        <span className="font-mono text-sm text-[var(--text-primary)]">
          {formatAddress(currentAccount.address)}
        </span>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDropdown(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-64 p-2 bg-[var(--card-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-50"
            >
              {/* Address */}
              <div className="px-3 py-2 mb-1">
                <p className="text-xs text-[var(--text-muted)] mb-1">Connected</p>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  <span className="font-mono">{formatAddress(currentAccount.address)}</span>
                  {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="h-px bg-[var(--border)] my-1" />

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
              >
                <LogOut size={18} />
                <span className="font-medium">Disconnect</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConnectWallet;
