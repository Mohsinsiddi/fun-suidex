'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@mysten/dapp-kit'
import { Menu, X, Gamepad2, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', label: 'Home', icon: null },
    { href: '/wheel', label: 'Wheel', icon: '🎡', highlight: true },
    { href: '/referral', label: 'Referral', icon: <Users className="w-4 h-4" /> },
    { href: '#', label: 'Lottery', icon: '🎟️', disabled: true, badge: 'Soon' },
  ]

  return (
    <header className="sticky top-0 z-40">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />

      <div className="bg-surface/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:bg-accent/30 transition-colors" />
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent to-secondary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-base sm:text-lg md:text-xl font-bold leading-tight">
                  <span className="text-accent">Sui</span>
                  <span className="text-white">Dex</span>
                </span>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase tracking-widest hidden sm:block">Games</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border/50">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${item.disabled ? 'cursor-not-allowed opacity-50' : ''} ${isActive(item.href) ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  {typeof item.icon === 'string' ? <span>{item.icon}</span> : item.icon}
                  <span>{item.label}</span>
                  {item.badge && <span className="px-1.5 py-0.5 text-[10px] bg-secondary/20 text-secondary rounded-full">{item.badge}</span>}
                  {item.highlight && isActive(item.href) && <Sparkles className="w-3 h-3 text-black animate-pulse" />}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* ConnectButton with custom styling to remove green highlight */}
              <div className="connect-button-wrapper">
                <ConnectButton connectText="Connect" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden py-3 border-t border-border/50 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => !item.disabled && setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isActive(item.href) ? 'bg-accent/10 text-accent border border-accent/30' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                >
                  {typeof item.icon === 'string' ? <span className="text-xl">{item.icon}</span> : item.icon}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && <span className="ml-auto px-2 py-0.5 text-xs bg-secondary/20 text-secondary rounded-full">{item.badge}</span>}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* ConnectButton style overrides - comprehensive */}
      <style jsx global>{`
        /* Main connect button */
        .connect-button-wrapper button {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.75rem !important;
          border-radius: 0.5rem !important;
          background: var(--card) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
          transition: all 0.15s ease !important;
          box-shadow: none !important;
        }
        @media (min-width: 640px) {
          .connect-button-wrapper button {
            padding: 0.5rem 1rem !important;
            font-size: 0.875rem !important;
            border-radius: 0.75rem !important;
          }
        }
        .connect-button-wrapper button:hover {
          background: var(--card-hover) !important;
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 1px var(--accent-muted) !important;
        }
        .connect-button-wrapper button:focus,
        .connect-button-wrapper button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px var(--accent-muted) !important;
          border-color: var(--accent) !important;
        }
        /* Override connected state */
        .connect-button-wrapper button[data-state="connected"],
        .connect-button-wrapper button[aria-expanded="true"] {
          background: var(--card) !important;
          border-color: var(--border) !important;
          box-shadow: none !important;
        }
        .connect-button-wrapper button[aria-expanded="true"]:hover {
          border-color: var(--accent) !important;
        }

        /* Dropdown menu container */
        .connect-button-wrapper [data-radix-popper-content-wrapper] {
          z-index: 100 !important;
        }
        .connect-button-wrapper [role="menu"],
        .connect-button-wrapper [data-radix-menu-content],
        .connect-button-wrapper div[style*="position: absolute"] > div {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
          overflow: hidden !important;
        }

        /* All dropdown items - address, disconnect, etc */
        .connect-button-wrapper [role="menuitem"],
        .connect-button-wrapper [role="menu"] > *,
        .connect-button-wrapper [data-radix-menu-content] > *,
        .connect-button-wrapper button[role="menuitem"],
        .connect-button-wrapper div[role="menuitem"] {
          background: transparent !important;
          color: var(--text-secondary) !important;
          border: none !important;
          box-shadow: none !important;
          transition: all 0.15s ease !important;
        }
        .connect-button-wrapper [role="menuitem"]:hover,
        .connect-button-wrapper [role="menu"] > *:hover,
        .connect-button-wrapper button[role="menuitem"]:hover,
        .connect-button-wrapper div[role="menuitem"]:hover {
          background: var(--card) !important;
          color: var(--text-primary) !important;
          box-shadow: none !important;
        }

        /* Disconnect button specific - often has danger styling */
        .connect-button-wrapper [role="menuitem"]:last-child:hover,
        .connect-button-wrapper button:contains("Disconnect"):hover {
          background: rgba(255, 68, 68, 0.1) !important;
          color: #ff6b6b !important;
        }

        /* Remove any SVG/icon coloring */
        .connect-button-wrapper [role="menu"] svg,
        .connect-button-wrapper [role="menuitem"] svg {
          color: inherit !important;
        }

        /* Address display styling */
        .connect-button-wrapper [role="menu"] span,
        .connect-button-wrapper [role="menuitem"] span {
          color: inherit !important;
        }

        /* Override any inline styles that might add green */
        .connect-button-wrapper * {
          --accent-color: var(--accent) !important;
        }
      `}</style>
    </header>
  )
}

export default Header
