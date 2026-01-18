'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@mysten/dapp-kit'
import { Menu, X, Gamepad2, Users, ChevronDown, Play, Clock, User, Trophy, FileText } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const GAMES = [
  { href: '/wheel', label: 'Wheel of Victory', icon: '🎡', status: 'live' as const, description: 'Spin to win prizes' },
  { href: '#', label: 'Victory Lottery', icon: '🎟️', status: 'soon' as const, description: 'Weekly draws' },
  { href: '#', label: 'Prediction Game', icon: '📈', status: 'soon' as const, description: 'Predict & win' },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [gamesDropdownOpen, setGamesDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => pathname === path
  const isGameActive = GAMES.some(g => g.status === 'live' && isActive(g.href))

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setGamesDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              {/* Home */}
              <Link
                href="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/') ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                Home
              </Link>

              {/* Play Now Dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setGamesDropdownOpen(!gamesDropdownOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isGameActive ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Play</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${gamesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {gamesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden z-50 border border-white/[0.08] bg-[#0a0c10] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Live Games */}
                    <div className="p-2">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">Live</span>
                      </div>
                      {GAMES.filter(g => g.status === 'live').map((game) => (
                        <Link
                          key={game.href}
                          href={game.href}
                          onClick={() => setGamesDropdownOpen(false)}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive(game.href) ? 'bg-accent/10' : 'hover:bg-white/[0.04]'}`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/10 to-transparent flex items-center justify-center text-xl">
                            {game.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{game.label}</div>
                            <div className="text-xs text-gray-500">{game.description}</div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-600 -rotate-90 group-hover:text-accent transition-colors" />
                        </Link>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/[0.06] mx-3" />

                    {/* Coming Soon */}
                    <div className="p-2">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Coming Soon</span>
                      </div>
                      {GAMES.filter(g => g.status === 'soon').map((game) => (
                        <div
                          key={game.label}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-40"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/[0.02] flex items-center justify-center text-xl grayscale">
                            {game.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-500 text-sm">{game.label}</div>
                            <div className="text-xs text-gray-600">{game.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Earn */}
              <Link
                href="/referral"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/referral') ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                <Users className="w-4 h-4" />
                <span>Earn</span>
              </Link>

              {/* Leaderboard */}
              <Link
                href="/leaderboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/leaderboard') ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                <Trophy className="w-4 h-4" />
                <span>Leaderboard</span>
              </Link>

              {/* Profile */}
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/profile') ? 'bg-accent text-black shadow-md shadow-accent/30' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Wallet - hidden on mobile, shown in mobile menu */}
              <div className="connect-button-wrapper hidden lg:block">
                <ConnectButton connectText="Connect" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sidebar */}
        <aside
          className={`absolute top-0 left-0 bottom-0 w-[300px] max-w-[85vw] bg-[#0a0c10] border-r border-border shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">
                  <span className="text-accent">Sui</span>
                  <span className="text-white">Dex</span>
                </span>
                <span className="text-[9px] text-text-muted uppercase tracking-widest">Games</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Wallet Connect */}
            <div className="p-1 mb-2">
              <div className="connect-button-wrapper-mobile">
                <ConnectButton connectText="Connect Wallet" />
              </div>
            </div>

            {/* Home */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive('/')
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive('/') ? 'bg-accent/20' : 'bg-white/5'}`}>
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="font-medium">Home</span>
            </Link>

            {/* Games Section */}
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2 mb-2 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Play Now
              </div>
              {GAMES.filter(g => g.status === 'live').map((game) => (
                <Link
                  key={game.href}
                  href={game.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border mb-2 ${
                    isActive(game.href)
                      ? 'bg-accent/15 text-accent border-accent/50'
                      : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${isActive(game.href) ? 'bg-accent/20' : 'bg-white/5'}`}>
                    {game.icon}
                  </div>
                  <div>
                    <div className="font-medium">{game.label}</div>
                    <div className="text-xs text-text-muted">{game.description}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Coming Soon */}
            <div className="pt-2">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-2 px-2">
                <Clock className="w-3 h-3" />
                Coming Soon
              </div>
              {GAMES.filter(g => g.status === 'soon').map((game) => (
                <div
                  key={game.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-surface/30 border-border/50 opacity-50 mb-2"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg bg-white/5 grayscale">
                    {game.icon}
                  </div>
                  <div>
                    <div className="font-medium text-text-muted">{game.label}</div>
                    <div className="text-xs text-text-muted">{game.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-border my-2" />

            {/* Earn */}
            <Link
              href="/referral"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive('/referral')
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive('/referral') ? 'bg-accent/20' : 'bg-white/5'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="font-medium">Earn</span>
            </Link>

            {/* Leaderboard */}
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive('/leaderboard')
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive('/leaderboard') ? 'bg-accent/20' : 'bg-white/5'}`}>
                <Trophy className="w-4 h-4" />
              </div>
              <span className="font-medium">Leaderboard</span>
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive('/profile')
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive('/profile') ? 'bg-accent/20' : 'bg-white/5'}`}>
                <User className="w-4 h-4" />
              </div>
              <span className="font-medium">Profile</span>
            </Link>

            {/* Docs */}
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive('/docs')
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive('/docs') ? 'bg-accent/20' : 'bg-white/5'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <span className="font-medium">Docs</span>
            </Link>
          </nav>
        </aside>
      </div>

      {/* ConnectButton style overrides */}
      <style jsx global>{`
        /* Desktop wallet button */
        .connect-button-wrapper button {
          padding: 0.5rem 1rem !important;
          font-size: 0.875rem !important;
          border-radius: 0.75rem !important;
          background: var(--card) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
          transition: all 0.15s ease !important;
          box-shadow: none !important;
        }
        /* Mobile wallet button - full width in menu, same style as desktop */
        .connect-button-wrapper-mobile button {
          width: 100% !important;
          padding: 0.875rem 1rem !important;
          font-size: 0.875rem !important;
          border-radius: 0.75rem !important;
          background: var(--card) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
          transition: all 0.15s ease !important;
          box-shadow: none !important;
          justify-content: center !important;
        }
        .connect-button-wrapper-mobile button:hover {
          background: var(--card-hover) !important;
          border-color: var(--accent) !important;
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
        .connect-button-wrapper button[data-state="connected"],
        .connect-button-wrapper button[aria-expanded="true"] {
          background: var(--card) !important;
          border-color: var(--border) !important;
          box-shadow: none !important;
        }
        .connect-button-wrapper button[aria-expanded="true"]:hover {
          border-color: var(--accent) !important;
        }
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
        .connect-button-wrapper [role="menuitem"]:last-child:hover {
          background: rgba(255, 68, 68, 0.1) !important;
          color: #ff6b6b !important;
        }
        .connect-button-wrapper [role="menu"] svg,
        .connect-button-wrapper [role="menuitem"] svg {
          color: inherit !important;
        }
        .connect-button-wrapper [role="menu"] span,
        .connect-button-wrapper [role="menuitem"] span {
          color: inherit !important;
        }
        .connect-button-wrapper * {
          --accent-color: var(--accent) !important;
        }
      `}</style>
    </header>
  )
}

export default Header
