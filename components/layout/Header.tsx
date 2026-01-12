'use client'

// ============================================
// Header Component
// ============================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { Menu, X, Wallet } from 'lucide-react'
import { useState } from 'react'
import { shortenAddress } from '@/lib/sui/client'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const account = useCurrentAccount()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/wheel', label: 'Wheel of Victory' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-accent">
              SuiDex
            </span>
            <span className="text-text-secondary font-medium">Games</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Wallet Connect */}
            <div className="hidden sm:block">
              <ConnectButton
                connectText="Connect Wallet"
                className="!bg-accent !text-background !font-semibold !px-4 !py-2 !rounded-lg hover:!bg-accent-hover transition-colors"
              />
            </div>

            {/* Mobile Wallet Icon */}
            {account && (
              <div className="sm:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                <Wallet className="w-4 h-4 text-accent" />
                <span className="text-sm font-mono">
                  {shortenAddress(account.address)}
                </span>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-card transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Connect Button */}
            <div className="pt-4 border-t border-border">
              <ConnectButton
                connectText="Connect Wallet"
                className="!w-full !bg-accent !text-background !font-semibold !px-4 !py-3 !rounded-lg"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
