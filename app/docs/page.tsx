'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CircleDot,
  Wallet,
  Smartphone,
  Gift,
  Users,
  Trophy,
  Medal,
  Shield,
  Coins,
  Lock,
  TrendingUp,
  Bell,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  Zap,
  Clock,
  Check,
  ArrowRight,
  Home,
  Settings,
  History,
  Search,
  User,
  Crown,
  Sparkles,
  Target,
  RefreshCw,
  Gamepad2,
  Plus,
} from 'lucide-react'

// Navigation sections
const sections = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'prizes', label: 'Prize System', icon: Gift },
  { id: 'authentication', label: 'Getting Started', icon: Wallet },
  { id: 'payments', label: 'Buy Spins', icon: Coins },
  { id: 'pwa', label: 'Mobile App', icon: Smartphone },
  { id: 'referrals', label: 'Referrals', icon: Users },
  { id: 'profiles', label: 'Profiles', icon: User },
  { id: 'badges', label: 'Badges', icon: Medal },
  { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
  { id: 'flows', label: 'User Journeys', icon: ArrowRight },
  { id: 'security', label: 'Security', icon: Shield },
]

// Feature cards data
const prizeTypes = [
  {
    type: 'Liquid VICT',
    description: 'Instantly tradeable Victory tokens',
    values: ['$5', '$50', '$1,000'],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    icon: Coins,
  },
  {
    type: 'Locked VICT',
    description: 'Time-locked Victory tokens with higher values',
    values: ['$5 - $3,500'],
    locks: ['1 Week', '3 Months', '1 Year', '3 Years'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    icon: Lock,
  },
  {
    type: 'SuiTrump',
    description: 'Meme token prizes for extra fun',
    values: ['$10', '$50', '$500'],
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
    icon: TrendingUp,
  },
]

const badgeTiers = [
  { tier: 'Bronze', color: 'text-amber-600', examples: '100 spins, $100 won' },
  { tier: 'Silver', color: 'text-gray-300', examples: '500 spins, $1K won' },
  { tier: 'Gold', color: 'text-yellow-400', examples: '1K spins, $5K won' },
  { tier: 'Diamond', color: 'text-cyan-400', examples: '5K spins, $25K won' },
  { tier: 'Legendary', color: 'text-purple-400', examples: '$3.5K single win' },
  { tier: 'Special', color: 'text-pink-400', examples: 'Early bird, events' },
]

const leaderboardTypes = [
  { type: 'Spins', metric: 'Total spins played', icon: CircleDot },
  { type: 'Wins', metric: 'Total USD value won', icon: Trophy },
  { type: 'Streak', metric: 'Longest winning streak', icon: Zap },
  { type: 'Referrals', metric: 'Users referred', icon: Users },
  { type: 'Biggest Win', metric: 'Largest single prize', icon: Crown },
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedFlow, setExpandedFlow] = useState<string | null>('first-spin')

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:bg-accent/30 transition-colors" />
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
                    <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base sm:text-lg leading-tight">
                    <span className="text-accent">Sui</span>
                    <span className="text-white">Dex</span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-text-muted uppercase tracking-widest hidden sm:block">Games</span>
                </div>
              </Link>
              <span className="text-text-muted text-sm hidden sm:block">/ Docs</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/wheel"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Play Now
                <ExternalLink className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-text-secondary hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sidebar - slides from left */}
        <aside
          className={`absolute top-0 left-0 bottom-0 w-[280px] bg-[#0a0c10] border-r border-border shadow-2xl transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
                <Gamepad2 className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight">
                  <span className="text-accent">Sui</span>
                  <span className="text-white">Dex</span>
                </span>
                <span className="text-[8px] text-text-muted uppercase tracking-widest">Docs</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-140px)]">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-all border ${
                    isActive
                      ? 'bg-accent/15 text-accent border-accent/50'
                      : 'bg-surface/80 text-text-secondary border-border hover:text-white hover:bg-surface hover:border-white/20'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-accent/20' : 'bg-white/5'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{section.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-[#0a0c10]">
            <Link
              href="/wheel"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent text-black rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Play Now
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 border-r border-border overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent/10 text-accent border-l-2 border-accent'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Link
              href="/wheel"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Play Now
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

            {/* Overview Section */}
            <section id="overview" className="mb-16">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                  SuiDex Games
                </h1>
                <p className="text-lg text-text-muted">
                  Your destination for blockchain gaming on SUI. Spin, win, and earn real crypto rewards.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-accent">$3,500</div>
                  <div className="text-xs sm:text-sm text-text-muted">Max Prize</div>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">16</div>
                  <div className="text-xs sm:text-sm text-text-muted">Prize Slots</div>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-400">10%</div>
                  <div className="text-xs sm:text-sm text-text-muted">Referral Rate</div>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-cyan-400">PWA</div>
                  <div className="text-xs sm:text-sm text-text-muted">Mobile App</div>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  How It Works
                </h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-medium mb-1">1. Connect Wallet</h3>
                    <p className="text-sm text-text-muted">Link your SUI wallet to start playing</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-3">
                      <Coins className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h3 className="font-medium mb-1">2. Get Spins</h3>
                    <p className="text-sm text-text-muted">Buy spins with SUI or earn free spins</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="font-medium mb-1">3. Win Prizes</h3>
                    <p className="text-sm text-text-muted">Spin the wheel and win VICT tokens</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Games Section */}
            <section id="games" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-accent" />
                </div>
                Games
              </h2>

              <div className="space-y-4">
                {/* Wheel of Victory - Current Game */}
                <div className="bg-gradient-to-br from-accent/20 via-surface to-purple-500/20 rounded-2xl border border-accent/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center flex-shrink-0">
                      <CircleDot className="w-7 h-7 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-xl">Wheel of Victory</h3>
                        <span className="px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/30 text-green-400 text-xs font-medium">LIVE</span>
                      </div>
                      <p className="text-text-muted mb-4">
                        Our flagship game! Spin the wheel to win VICT tokens, locked VICT with bonus multipliers, or SuiTrump tokens. 16 prize slots with prizes up to $3,500.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 text-xs font-medium">Liquid VICT</span>
                        <span className="px-2 py-1 rounded bg-purple-400/10 text-purple-400 text-xs font-medium">Locked VICT</span>
                        <span className="px-2 py-1 rounded bg-cyan-400/10 text-cyan-400 text-xs font-medium">SuiTrump</span>
                      </div>
                      <Link
                        href="/wheel"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        Play Now
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Coming Soon */}
                <div className="bg-surface/50 rounded-xl border border-border/50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-border/50 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-7 h-7 text-text-muted" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-text-muted">More Games Coming Soon</h3>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-medium">SOON</span>
                      </div>
                      <p className="text-text-muted/70">
                        We&apos;re building more exciting blockchain games. Stay tuned for announcements!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Game Features */}
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Wheel of Victory Features</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">16 Prize Slots</div>
                        <div className="text-xs text-text-muted">Weighted random selection</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Provably Fair</div>
                        <div className="text-xs text-text-muted">Cryptographic randomness</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Instant Results</div>
                        <div className="text-xs text-text-muted">Smooth wheel animation</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">48h Distribution</div>
                        <div className="text-xs text-text-muted">Prizes sent to your wallet</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spin Types */}
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Spin Types</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-purple-400/5 border border-purple-400/20">
                      <div className="text-purple-400 font-medium mb-1">Bonus Spins</div>
                      <p className="text-sm text-text-muted">From prizes & promotions (used first)</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                      <div className="text-yellow-400 font-medium mb-1">Purchased Spins</div>
                      <p className="text-sm text-text-muted">Bought with SUI tokens</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-400/5 border border-green-400/20">
                      <div className="text-green-400 font-medium mb-1">Free Spins</div>
                      <p className="text-sm text-text-muted">Earned from staking VICT</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Prize System Section */}
            <section id="prizes" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-yellow-400" />
                </div>
                Prize System
              </h2>

              <div className="space-y-4">
                {prizeTypes.map((prize) => {
                  const Icon = prize.icon
                  return (
                    <div
                      key={prize.type}
                      className={`${prize.bgColor} rounded-xl border ${prize.borderColor} p-6`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${prize.bgColor} border ${prize.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${prize.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg ${prize.color} mb-1`}>{prize.type}</h3>
                          <p className="text-text-muted text-sm mb-3">{prize.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {prize.values.map((value) => (
                              <span
                                key={value}
                                className="px-2 py-1 rounded bg-white/5 text-white text-sm font-medium"
                              >
                                {value}
                              </span>
                            ))}
                          </div>
                          {prize.locks && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {prize.locks.map((lock) => (
                                <span
                                  key={lock}
                                  className="px-2 py-1 rounded bg-white/5 text-text-muted text-xs"
                                >
                                  {lock}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-green-400/5 border border-green-400/20">
                <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                  <Clock className="w-4 h-4" />
                  Prize Distribution
                </div>
                <p className="text-sm text-text-muted">
                  All prizes are manually distributed within 48 hours of winning. You&apos;ll receive a push notification (if using the mobile app) when your prize is sent to your wallet.
                </p>
              </div>
            </section>

            {/* Getting Started Section */}
            <section id="authentication" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                Getting Started
              </h2>

              <div className="space-y-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Connect Your Wallet</h3>
                  <div className="space-y-3">
                    {[
                      'Click "Connect Wallet" button on the game page',
                      'Select your SUI wallet (Sui Wallet, Suiet, Ethos, etc.)',
                      'Approve the connection in your wallet app',
                      'Sign the authentication message to verify ownership',
                      'You\'re ready to play! Your session stays active for 7 days',
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-text-muted">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20">
                  <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                    <Shield className="w-4 h-4" />
                    Secure Authentication
                  </div>
                  <p className="text-sm text-text-muted">
                    We never have access to your private keys. Authentication uses cryptographic signatures to verify you own the wallet.
                  </p>
                </div>
              </div>
            </section>

            {/* Payments Section */}
            <section id="payments" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-yellow-400" />
                </div>
                Buy Spins
              </h2>

              <div className="space-y-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Purchase Spins with SUI</h3>
                  <div className="space-y-3">
                    {[
                      'Click "Buy Spins" on the wheel page',
                      'Select how many spins you want (1 SUI = 1 spin)',
                      'Confirm the transaction in your wallet',
                      'Transaction is verified on the SUI blockchain',
                      'Spins are credited to your account instantly!',
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-text-muted">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      Instant Credit
                    </div>
                    <p className="text-sm text-text-muted">Small purchases (up to 10 SUI) are credited instantly after blockchain confirmation.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-border">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      Large Purchases
                    </div>
                    <p className="text-sm text-text-muted">Purchases over 10 SUI are reviewed and credited within a few hours.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* PWA Section */}
            <section id="pwa" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                Mobile App
              </h2>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-500/10 to-accent/10 rounded-xl border border-purple-400/30 p-6">
                  <h3 className="font-bold text-lg mb-2">Play Anywhere, Anytime</h3>
                  <p className="text-text-muted mb-4">
                    Install our Progressive Web App on your phone for the best mobile experience with push notifications when you win.
                  </p>
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                    <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-sm text-yellow-400 font-medium">Requires 25 spins to unlock</span>
                  </div>
                  <Link
                    href="/pwa/setup"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-400 transition-colors"
                  >
                    <Smartphone className="w-4 h-4" />
                    Setup Mobile App
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Mobile App Features</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: Lock, label: '6-Digit PIN', desc: 'Quick & secure login' },
                      { icon: Bell, label: 'Push Notifications', desc: 'Get notified when you win' },
                      { icon: RefreshCw, label: 'Works Offline', desc: 'View history anytime' },
                      { icon: Zap, label: 'Native App Feel', desc: 'Installs like a real app' },
                    ].map((feature) => (
                      <div key={feature.label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{feature.label}</div>
                          <div className="text-xs text-text-muted">{feature.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">What You Can Do</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Home, label: 'Dashboard' },
                      { icon: CircleDot, label: 'Spin Wheel' },
                      { icon: History, label: 'View History' },
                      { icon: Search, label: 'Find Players' },
                      { icon: User, label: 'View Profiles' },
                      { icon: Settings, label: 'Settings' },
                    ].map((page) => (
                      <div key={page.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                        <page.icon className="w-4 h-4 text-text-muted" />
                        <span className="text-sm">{page.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Referrals Section */}
            <section id="referrals" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                Referral Program
              </h2>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-500/10 to-accent/10 rounded-xl border border-green-400/30 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl font-bold text-green-400">10%</span>
                    <div>
                      <div className="font-medium text-lg">Commission Forever</div>
                      <div className="text-text-muted text-sm">On every prize your friends win</div>
                    </div>
                  </div>
                  <p className="text-text-muted mt-3">
                    Share your unique referral link. When friends sign up and win prizes, you earn 10% of their winnings forever. No limits, no expiry.
                  </p>
                  <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-purple-400/10 border border-purple-400/30 rounded-lg">
                    <CircleDot className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-purple-400 font-medium">Complete at least 1 spin to start referring friends</span>
                  </div>
                </div>

                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">How It Works</h3>
                  <div className="space-y-4">
                    {[
                      { step: 'Play First', desc: 'Complete at least 1 spin to unlock referral access' },
                      { step: 'Get Your Link', desc: 'Find your unique referral code on the referral page' },
                      { step: 'Share It', desc: 'Send your link to friends via social media or messaging' },
                      { step: 'They Sign Up', desc: 'Friends connect their wallet through your link' },
                      { step: 'Earn Forever', desc: 'Get 10% of every prize they win, paid in VICT tokens' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-400/20 text-green-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.step}</div>
                          <div className="text-sm text-text-muted">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
                  <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                    <Coins className="w-4 h-4" />
                    Weekly Payouts
                  </div>
                  <p className="text-sm text-text-muted">
                    Referral commissions are aggregated weekly and distributed in VICT tokens directly to your wallet.
                  </p>
                </div>
              </div>
            </section>

            {/* Profiles Section */}
            <section id="profiles" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
                Player Profiles
              </h2>

              <div className="space-y-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Profile Features</h3>
                  <ul className="space-y-3 text-text-muted">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Custom Username</strong> - Set a display name for leaderboards</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Shareable Profile URL</strong> - Your own /u/username page</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Bio Section</strong> - Tell others about yourself</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Featured Badges</strong> - Showcase your achievements</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Public Stats</strong> - Display spins, wins, and streaks</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/20">
                  <div className="flex items-center gap-2 text-cyan-400 font-medium mb-2">
                    <Lock className="w-4 h-4" />
                    Unlock Requirement
                  </div>
                  <p className="text-sm text-text-muted">
                    Complete at least 10 spins to unlock your public profile and custom URL.
                  </p>
                </div>
              </div>
            </section>

            {/* Badges Section */}
            <section id="badges" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/30 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-orange-400" />
                </div>
                Badge System
              </h2>

              <div className="space-y-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Badge Tiers</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {badgeTiers.map((badge) => (
                      <div key={badge.tier} className="p-3 rounded-lg bg-white/5">
                        <div className={`font-medium ${badge.color} mb-1`}>{badge.tier}</div>
                        <div className="text-xs text-text-muted">{badge.examples}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="font-medium mb-4">Badge Categories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Spins', 'Earnings', 'Single Win', 'Referrals', 'Commission', 'Social', 'Activity', 'Special'].map((cat) => (
                      <div key={cat} className="px-3 py-2 rounded-lg bg-white/5 text-sm text-center">
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-orange-400/5 border border-orange-400/20">
                  <div className="flex items-center gap-2 text-orange-400 font-medium mb-2">
                    <Sparkles className="w-4 h-4" />
                    Automatically Awarded
                  </div>
                  <p className="text-sm text-text-muted">
                    Badges are automatically awarded when you meet the criteria. Just keep playing!
                  </p>
                </div>
              </div>
            </section>

            {/* Leaderboards Section */}
            <section id="leaderboards" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                Leaderboards
              </h2>

              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="font-medium mb-4">Compete for the Top</h3>
                <div className="space-y-3">
                  {leaderboardTypes.map((lb) => (
                    <div key={lb.type} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                        <lb.icon className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-medium">{lb.type}</div>
                        <div className="text-sm text-text-muted">{lb.metric}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* User Flows Section */}
            <section id="flows" className="mb-16">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-accent" />
                </div>
                User Journeys
              </h2>
              <p className="text-text-muted mb-6">Step-by-step guides for common actions</p>

              <div className="space-y-4">
                {/* Flow 1: First Spin */}
                <div className="bg-surface rounded-xl border-2 border-accent/30 overflow-hidden">
                  <button
                    onClick={() => setExpandedFlow(expandedFlow === 'first-spin' ? null : 'first-spin')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400/20 to-accent/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium block">Your First Spin</span>
                        <span className="text-xs text-text-muted">New player guide</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedFlow === 'first-spin' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFlow === 'first-spin' && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <div className="space-y-3">
                        {[
                          { text: 'Visit the wheel page', highlight: false },
                          { text: 'Click "Connect Wallet" and select your SUI wallet', highlight: false },
                          { text: 'Sign the authentication message', highlight: false },
                          { text: 'Click "Buy Spins" and choose how many', highlight: true },
                          { text: 'Send SUI and claim your spins', highlight: false },
                          { text: 'Click the big SPIN button!', highlight: true },
                          { text: 'Watch the wheel spin and see your prize', highlight: false },
                          { text: 'Share your win on social media', highlight: false },
                        ].map((step, i) => (
                          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${step.highlight ? 'bg-accent/10' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <span className={step.highlight ? 'text-white font-medium' : 'text-text-muted'}>{step.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Flow 2: Referral */}
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedFlow(expandedFlow === 'referral' ? null : 'referral')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-400/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium block">Refer a Friend</span>
                        <span className="text-xs text-text-muted">Earn 10% forever</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedFlow === 'referral' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFlow === 'referral' && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <div className="space-y-3">
                        {[
                          { text: 'Complete at least 1 spin to unlock referral access', highlight: true },
                          { text: 'Go to the Referral page to find your unique code', highlight: false },
                          { text: 'Copy your referral link (suidex.games/r/YOURCODE)', highlight: false },
                          { text: 'Share the link with friends on social media', highlight: false },
                          { text: 'Friend clicks your link and connects their wallet', highlight: false },
                          { text: 'They\'re automatically linked to you as referrer', highlight: false },
                          { text: 'When they win prizes, you earn 10% commission', highlight: false },
                          { text: 'Commissions are paid weekly in VICT tokens', highlight: false },
                        ].map((step, i) => (
                          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${step.highlight ? 'bg-purple-400/10' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-purple-400/20 text-purple-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <span className={step.highlight ? 'text-white font-medium' : 'text-text-muted'}>{step.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Flow 3: PWA Setup */}
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedFlow(expandedFlow === 'pwa' ? null : 'pwa')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium block">Install Mobile App</span>
                        <span className="text-xs text-text-muted">Play on the go</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedFlow === 'pwa' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFlow === 'pwa' && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <div className="space-y-3">
                        {[
                          { text: 'Complete 25 spins on the web to unlock the mobile app', highlight: true },
                          { text: 'Open /pwa/setup on your mobile browser', highlight: false },
                          { text: 'Make sure you\'ve connected your wallet on the web first', highlight: false },
                          { text: 'Create a 6-digit PIN (stored securely on your device)', highlight: false },
                          { text: 'Add to Home Screen (iOS: Share → Add to Home Screen)', highlight: false },
                          { text: 'Launch the app from your home screen', highlight: false },
                          { text: 'Enter your PIN to log in', highlight: false },
                          { text: 'Enable push notifications to get win alerts!', highlight: false },
                        ].map((step, i) => (
                          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${step.highlight ? 'bg-cyan-400/10' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-cyan-400/20 text-cyan-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <span className={step.highlight ? 'text-white font-medium' : 'text-text-muted'}>{step.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Flow 4: Create Profile */}
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedFlow(expandedFlow === 'profile' ? null : 'profile')}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium block">Create Your Profile</span>
                        <span className="text-xs text-text-muted">Get your own page</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedFlow === 'profile' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFlow === 'profile' && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <div className="space-y-3">
                        {[
                          'Complete at least 10 spins to unlock profiles',
                          'Go to your Profile page',
                          'Click "Create Profile"',
                          'Choose a unique username',
                          'Add a bio (optional, up to 160 characters)',
                          'Select badges to feature on your profile',
                          'Share your /u/username link with friends!',
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-orange-400/20 text-orange-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <span className="text-text-muted">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Security Section */}
            <section id="security" className="mb-16">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                Security
              </h2>

              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="font-medium mb-4">Your Safety is Our Priority</h3>
                <ul className="space-y-3 text-text-muted">
                  {[
                    'We never have access to your private keys',
                    'All connections use secure HTTPS encryption',
                    'Wallet authentication uses cryptographic signatures',
                    'Sessions expire automatically for your protection',
                    'Mobile app PIN is encrypted and stored only on your device',
                    'All game results use provably fair random generation',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Footer CTA */}
            <div className="bg-gradient-to-br from-accent/20 via-surface to-purple-500/20 rounded-2xl border border-accent/30 p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Ready to Play?</h2>
              <p className="text-text-muted mb-6">
                Connect your wallet and start spinning the Wheel of Victory today!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/wheel"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-black rounded-xl font-medium hover:bg-accent/90 transition-colors"
                >
                  <CircleDot className="w-5 h-5" />
                  Play Now
                </Link>
                <Link
                  href="/pwa/setup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/20"
                >
                  <Smartphone className="w-5 h-5" />
                  Get Mobile App
                </Link>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
