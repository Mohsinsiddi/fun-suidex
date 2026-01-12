'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from '@mysten/dapp-kit'
import { Wallet, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const account = useCurrentAccount()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const { mutate: disconnect } = useDisconnectWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const handleConnect = (wallet: any) => {
    connect({ wallet })
    setShowWalletModal(false)
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const isActive = (path: string) => pathname === path

  // Sort wallets - Slush and Nightly first
  const sortedWallets = [...wallets].sort((a, b) => {
    const priority = ['Slush', 'Nightly', 'Sui Wallet', 'Suiet']
    const aIndex = priority.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()))
    const bIndex = priority.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()))
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return (
    <>
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              <span className="font-display text-xl font-bold">
                <span className="text-accent">Sui</span>
                <span className="text-white">Dex</span>
                <span className="text-text-secondary ml-1 text-sm font-normal">Games</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </Link>
              <Link
                href="/wheel"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/wheel') ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                🎡 Wheel
              </Link>
              <Link
                href="#"
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted cursor-not-allowed"
              >
                🎟️ Lottery (Soon)
              </Link>
            </nav>

            {/* Wallet */}
            <div className="flex items-center gap-3">
              {!account ? (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-black font-medium text-sm transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connect</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block px-3 py-1.5 bg-surface-alt rounded-lg border border-border">
                    <span className="text-xs text-text-secondary">Connected</span>
                    <p className="text-sm font-mono text-accent">
                      {account.address.slice(0, 6)}...{account.address.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-border space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg ${isActive('/') ? 'bg-accent/10 text-accent' : 'text-text-secondary'}`}
              >
                Home
              </Link>
              <Link
                href="/wheel"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg ${isActive('/wheel') ? 'bg-accent/10 text-accent' : 'text-text-secondary'}`}
              >
                🎡 Wheel of Victory
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowWalletModal(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
              <button onClick={() => setShowWalletModal(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {sortedWallets.length > 0 ? (
              <div className="space-y-2">
                {sortedWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-accent/10 border border-border hover:border-accent/30 rounded-xl transition-colors"
                  >
                    {wallet.icon && (
                      <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                    )}
                    <span className="font-medium text-white">{wallet.name}</span>
                    {(wallet.name.toLowerCase().includes('slush') || wallet.name.toLowerCase().includes('nightly')) && (
                      <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">Recommended</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">No wallets detected</p>
                <div className="space-y-2">
                  <a
                    href="https://slush.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl text-accent font-medium"
                  >
                    Install Slush Wallet
                  </a>
                  <a
                    href="https://nightly.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-medium"
                  >
                    Install Nightly Wallet
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Header
