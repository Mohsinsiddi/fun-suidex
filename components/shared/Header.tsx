'use client'

// ============================================
// Enhanced Header with Official dApp-Kit
// ============================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@mysten/dapp-kit'
import { Menu, X, Gamepad2, Sparkles } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', label: 'Home', icon: null },
    { href: '/wheel', label: 'Wheel', icon: '🎡', highlight: true },
    { href: '#', label: 'Lottery', icon: '🎟️', disabled: true, badge: 'Soon' },
  ]

  return (
    <header className="sticky top-0 z-40">
      {/* Gradient Border Top */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
      
      <div className="bg-surface/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:bg-accent/30 transition-colors" />
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent to-secondary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg sm:text-xl font-bold leading-tight">
                  <span className="text-accent">Sui</span>
                  <span className="text-white">Dex</span>
                </span>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase tracking-widest hidden xs:block">Games</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border/50">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}
                    ${isActive(item.href) 
                      ? 'bg-accent text-black shadow-md shadow-accent/30' 
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }
                  `}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-secondary/20 text-secondary rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && isActive(item.href) && (
                    <Sparkles className="w-3 h-3 text-black animate-pulse" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Official dApp-Kit Connect Button */}
              <div className="[&_button]:!px-3 [&_button]:!py-2 [&_button]:!text-xs sm:[&_button]:!px-4 sm:[&_button]:!py-2 sm:[&_button]:!text-sm [&_button]:!rounded-lg sm:[&_button]:!rounded-xl">
                <ConnectButton connectText="Connect" />
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-border/50 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => !item.disabled && setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isActive(item.href) 
                      ? 'bg-accent/10 text-accent border border-accent/30' 
                      : 'text-text-secondary hover:bg-white/5'
                    }
                  `}
                >
                  {item.icon && <span className="text-xl">{item.icon}</span>}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-secondary/20 text-secondary rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header