'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { GAMES } from '@/constants'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { GameCard } from '@/components/ui/GameCard'
import { ReferralBanner } from '@/components/referral'
import {
  Users,
  ArrowRight,
  Sparkles,
  Gift,
  Trophy,
  Zap,
  Shield,
  Clock,
  Star,
  TrendingUp,
  Wallet,
  ChevronRight,
  Coins,
  Lock,
  Flame,
  Target,
  Play
} from 'lucide-react'

function HomePageContent() {
  const searchParams = useSearchParams()
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  const [referrer, setReferrer] = useState<string | null>(null)
  const [isLinked, setIsLinked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('suidex_referrer', ref)
      setReferrer(ref)
    } else {
      const stored = localStorage.getItem('suidex_referrer')
      if (stored) setReferrer(stored)
    }
  }, [searchParams])

  useEffect(() => {
    if (account?.address) {
      checkAuth()
    } else {
      setIsAuthenticated(false)
      setIsLinked(false)
    }
  }, [account?.address])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setIsAuthenticated(true)
        if (data.data.referredBy) {
          setIsLinked(true)
          localStorage.removeItem('suidex_referrer')
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSignIn = async () => {
    if (!account?.address) return
    setAuthLoading(true)

    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account.address }),
      })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)

      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const storedRef = localStorage.getItem('suidex_referrer')
            const verifyRes = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet: account.address,
                signature: sig.signature,
                nonce: nonceData.data.nonce,
                referrer: storedRef || undefined,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setIsAuthenticated(true)
              if (verifyData.data.referredBy) {
                setIsLinked(true)
                setReferrer(verifyData.data.referredBy)
                localStorage.removeItem('suidex_referrer')
              }
            }
            setAuthLoading(false)
          },
          onError: () => setAuthLoading(false),
        }
      )
    } catch (err) {
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Referral Banner */}
        {referrer && (
          <div className="max-w-6xl mx-auto px-4 pt-4">
            <ReferralBanner
              referrerWallet={referrer}
              isLinked={isLinked}
              onClose={() => { setReferrer(null); localStorage.removeItem('suidex_referrer') }}
            />
            {!isAuthenticated && account && (
              <button
                onClick={handleSignIn}
                disabled={authLoading || isSigning}
                className="w-full mb-4 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {authLoading || isSigning ? 'Signing...' : 'Sign in to Link Referral & Get Benefits'}
              </button>
            )}
          </div>
        )}

        {/* Hero Section */}
        <section className="relative py-16 sm:py-20 lg:py-28 px-4 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-accent/10 rounded-full blur-3xl opacity-30" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_100%)]" />

          <div className="relative max-w-6xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6 sm:mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Part of the SuiDex Ecosystem</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-accent via-cyan-400 to-secondary bg-clip-text text-transparent">SuiDex</span>
              {' '}
              <span className="text-white">Games</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
              Spin to win <span className="text-accent font-semibold">Victory tokens</span>!
              {' '}Free daily spins for stakers. Up to{' '}
              <span className="text-yellow-400 font-bold">$3,500</span> per spin.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <Link
                href="/wheel"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-accent text-black hover:bg-accent-hover hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-accent/25"
              >
                <Play className="w-5 h-5" />
                <span>Play Now</span>
              </Link>
              <a
                href="https://suidex.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border-2 border-accent/50 text-accent hover:bg-accent/10 hover:border-accent transition-all duration-200"
              >
                Visit SuiDex
              </a>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span><strong className="text-white">16</strong> Prize Slots</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Gift className="w-4 h-4 text-accent" />
                <span><strong className="text-white">Free</strong> Daily Spins</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Users className="w-4 h-4 text-purple-400" />
                <span><strong className="text-white">10%</strong> Referral Rewards</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border/50 bg-surface/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard label="Total Prizes Won" value="$12,450" icon={<Trophy className="w-5 h-5" />} color="yellow" />
              <StatCard label="Total Spins" value="8,234" icon={<Zap className="w-5 h-5" />} color="accent" />
              <StatCard label="Active Players" value="542" icon={<Users className="w-5 h-5" />} color="purple" />
              <StatCard label="Top Prize" value="$3,500" icon={<Star className="w-5 h-5" />} color="green" />
            </div>
          </div>
        </section>

        {/* Wheel of Victory - Enhanced Section */}
        <section className="py-20 sm:py-28 px-4 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Live Now</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
                Wheel of Victory
              </h2>
              <p className="text-text-secondary text-lg max-w-xl mx-auto">
                Spin the wheel and win amazing prizes instantly
              </p>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left - Wheel Visual */}
              <div className="relative order-1">
                <div className="relative max-w-sm mx-auto">
                  {/* Outer Glow */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-accent/20 via-purple-500/20 to-yellow-500/20 rounded-full blur-3xl opacity-60" />

                  {/* Wheel Container */}
                  <div className="relative">
                    {/* Decorative Ring */}
                    <div className="absolute -inset-3 rounded-full border-2 border-dashed border-accent/20 animate-spin-slow" />

                    {/* Main Wheel */}
                    <div className="relative aspect-square rounded-full p-1 bg-gradient-to-br from-accent via-purple-500 to-yellow-500">
                      <div className="w-full h-full rounded-full bg-card p-2">
                        {/* Inner Wheel with Segments */}
                        <div className="relative w-full h-full rounded-full overflow-hidden">
                          {/* Wheel Segments */}
                          <svg viewBox="0 0 200 200" className="w-full h-full animate-spin-slow" style={{ animationDuration: '30s' }}>
                            {[...Array(16)].map((_, i) => {
                              const colors = ['#FFD700', '#00e5ff', '#a855f7', '#22c55e', '#f97316', '#ec4899', '#3b82f6', '#ef4444']
                              const angle = (i * 22.5) * Math.PI / 180
                              const nextAngle = ((i + 1) * 22.5) * Math.PI / 180
                              const x1 = 100 + 95 * Math.cos(angle)
                              const y1 = 100 + 95 * Math.sin(angle)
                              const x2 = 100 + 95 * Math.cos(nextAngle)
                              const y2 = 100 + 95 * Math.sin(nextAngle)
                              return (
                                <path
                                  key={i}
                                  d={`M 100 100 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`}
                                  fill={colors[i % 8]}
                                  opacity={0.9}
                                />
                              )
                            })}
                            {/* Center Circle */}
                            <circle cx="100" cy="100" r="25" fill="#0f1218" stroke="#00e5ff" strokeWidth="2" />
                            <text x="100" y="108" textAnchor="middle" fontSize="24">🎰</text>
                          </svg>

                          {/* Pointer */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-accent drop-shadow-lg" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating Badges */}
                    <div className="absolute -top-4 -left-4 px-3 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-400">$3.5K</span>
                      </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 px-3 py-2 rounded-xl bg-accent/20 border border-accent/30 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-accent" />
                        <span className="text-sm font-bold text-accent">16 Slots</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Info */}
              <div className="order-2">
                {/* Prize Types */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <PrizeTypeCard
                    icon={<Coins className="w-5 h-5" />}
                    title="Liquid VICT"
                    description="Instant tokens"
                    color="yellow"
                  />
                  <PrizeTypeCard
                    icon={<Lock className="w-5 h-5" />}
                    title="Locked VICT"
                    description="1W to 3Y locks"
                    color="purple"
                  />
                  <PrizeTypeCard
                    icon={<Flame className="w-5 h-5" />}
                    title="SuiTrump"
                    description="Meme tokens"
                    color="red"
                  />
                  <PrizeTypeCard
                    icon={<Gift className="w-5 h-5" />}
                    title="Free Spins"
                    description="For stakers"
                    color="accent"
                  />
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  <FeatureRow icon={<Gift className="w-5 h-5" />} text="Free daily spins for $20+ Victory stakers" highlight />
                  <FeatureRow icon={<Trophy className="w-5 h-5" />} text="Win up to $3,500 per spin" />
                  <FeatureRow icon={<Clock className="w-5 h-5" />} text="All prizes distributed within 48 hours" />
                  <FeatureRow icon={<Shield className="w-5 h-5" />} text="Provably fair & transparent" />
                </div>

                {/* CTA */}
                <Link
                  href="/wheel"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-accent to-cyan-400 text-black hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02] transition-all duration-200"
                >
                  <Play className="w-5 h-5" />
                  <span>Spin the Wheel</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-20 sm:py-24 px-4 bg-gradient-to-b from-card/20 via-card/40 to-card/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">
                All Games
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto">
                Choose your game and start winning. More coming soon!
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {GAMES.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 sm:py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">
                How It Works
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto">
                Get started in 3 simple steps
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 lg:gap-12 mb-12">
              <StepCard
                number={1}
                icon={<Wallet className="w-7 h-7" />}
                title="Connect"
                description="Connect your SUI wallet. We support all major wallets including Sui Wallet and Suiet."
                color="accent"
              />
              <StepCard
                number={2}
                icon={<TrendingUp className="w-7 h-7" />}
                title="Get Spins"
                description="Stake $20+ for free daily spins, or purchase additional spins with SUI tokens."
                color="purple"
              />
              <StepCard
                number={3}
                icon={<Trophy className="w-7 h-7" />}
                title="Win Prizes"
                description="Spin the wheel and win Victory tokens, SuiTrump, and more amazing prizes!"
                color="yellow"
              />
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 pt-10 border-t border-border/50">
              <TrustBadge icon={<Shield className="w-4 h-4" />} text="Provably Fair" />
              <TrustBadge icon={<Zap className="w-4 h-4" />} text="Instant Results" />
              <TrustBadge icon={<Clock className="w-4 h-4" />} text="48h Payouts" />
              <TrustBadge icon={<Users className="w-4 h-4" />} text="10% Referrals" />
            </div>
          </div>
        </section>

        {/* Referral CTA */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden border border-accent/20">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,229,255,0.1),transparent_50%)]" />

              <div className="relative p-8 sm:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Users className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-white">
                      Earn <span className="text-accent">10%</span> Forever
                    </h2>
                    <p className="text-text-secondary mb-6 text-lg max-w-md">
                      Refer friends and earn 10% of every prize they win. Paid weekly in Victory tokens!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center md:justify-start">
                      <Link
                        href="/referral"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-accent text-black hover:bg-accent-hover transition-all"
                      >
                        <span>Start Earning</span>
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                      <span className="text-text-muted text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Weekly payouts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Animations */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  )
}

// Components
function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    yellow: 'text-yellow-400 bg-yellow-500/10',
    accent: 'text-accent bg-accent/10',
    purple: 'text-purple-400 bg-purple-500/10',
    green: 'text-green-400 bg-green-500/10',
  }
  const [textColor, bgColor] = colors[color].split(' ')

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgColor} ${textColor} mb-3`}>
        {icon}
      </div>
      <div className={`text-3xl sm:text-4xl font-bold mb-1 ${textColor}`}>{value}</div>
      <div className="text-sm text-text-secondary">{label}</div>
    </div>
  )
}

function PrizeTypeCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400' },
    purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400' },
    accent: { bg: 'bg-accent/5', border: 'border-accent/20', text: 'text-accent' },
  }
  const c = colors[color]

  return (
    <div className={`p-4 rounded-xl ${c.bg} border ${c.border}`}>
      <div className={`${c.text} mb-2`}>{icon}</div>
      <div className="font-semibold text-white text-sm">{title}</div>
      <div className="text-xs text-text-muted">{description}</div>
    </div>
  )
}

function FeatureRow({ icon, text, highlight }: { icon: React.ReactNode; text: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${highlight ? 'p-3 rounded-xl bg-accent/5 border border-accent/10' : ''}`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${highlight ? 'bg-accent/10 text-accent' : 'bg-white/5 text-text-secondary'} flex items-center justify-center`}>
        {icon}
      </div>
      <span className={highlight ? 'text-white font-medium' : 'text-text-secondary'}>{text}</span>
    </div>
  )
}

function StepCard({ number, icon, title, description, color }: { number: number; icon: React.ReactNode; title: string; description: string; color: string }) {
  const colors: Record<string, { bg: string; border: string; text: string; numBg: string }> = {
    accent: { bg: 'bg-accent/5', border: 'border-accent/30', text: 'text-accent', numBg: 'bg-accent' },
    purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-400', numBg: 'bg-purple-500' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', text: 'text-yellow-400', numBg: 'bg-yellow-500' },
  }
  const c = colors[color]

  return (
    <div className="relative text-center group">
      {/* Connection Line */}
      <div className="hidden sm:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-border/50 to-transparent" />

      <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-2xl ${c.bg} border ${c.border} mb-6 group-hover:scale-105 transition-transform`}>
        <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${c.numBg} text-black flex items-center justify-center text-sm font-bold`}>
          {number}
        </div>
        <div className={c.text}>{icon}</div>
      </div>
      <h3 className="font-display text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-text-secondary text-sm max-w-[280px] mx-auto">{description}</p>
    </div>
  )
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <span className="text-accent">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-7 h-7 text-accent" />
          </div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
