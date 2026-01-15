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
import { Users, ArrowRight } from 'lucide-react'

function HomePageContent() {
  const searchParams = useSearchParams()
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()
  
  const [referrer, setReferrer] = useState<string | null>(null)
  const [isLinked, setIsLinked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Handle referral from URL
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

  // Check auth and if already linked
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
    <div className="min-h-screen flex flex-col">
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
        <section className="relative py-16 sm:py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl opacity-20" />
          
          <div className="relative max-w-6xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">SuiDex</span>{' '}
              <span className="text-text-primary">Games</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-8">
              Spin to win Victory tokens! Free daily spins for stakers.
              Part of the SuiDex ecosystem.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/wheel" className="btn btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 glow">
                Play Now
              </Link>
              <a href="https://suidex.org" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Visit SuiDex
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              <StatItem label="Total Prizes Won" value="$12,450" />
              <StatItem label="Total Spins" value="8,234" />
              <StatItem label="Active Players" value="542" />
              <StatItem label="Top Prize" value="$3,500" />
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center">
              Available Games
            </h2>
            <p className="text-text-secondary text-center mb-8 sm:mb-12">
              Choose a game to start playing
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {GAMES.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-center">
              How It Works
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              <StepCard number={1} title="Connect Wallet" description="Connect your SUI wallet to get started. We support all major wallets." />
              <StepCard number={2} title="Get Spins" description="Stake $20+ in Victory pools for free daily spins, or purchase spins with SUI." />
              <StepCard number={3} title="Win Prizes" description="Spin the wheel and win Victory tokens, SuiTrump, and more!" />
            </div>
          </div>
        </section>

        {/* Referral CTA */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card p-6 sm:p-8 md:p-12 card-glow rounded-2xl bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent border border-accent/30">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-white">
                    Refer Friends, Earn{' '}<span className="text-accent">10%</span> Forever
                  </h2>
                  <p className="text-text-secondary mb-4 sm:mb-6">
                    Share your referral link and earn 10% of all prizes won by your friends.
                    Paid weekly in Victory tokens!
                  </p>
                  <Link href="/referral" className="inline-flex items-center gap-2 btn btn-primary px-6 py-3 rounded-xl font-semibold">
                    Start Earning <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-accent mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-text-secondary">{label}</div>
    </div>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
        <span className="font-display text-xl sm:text-2xl font-bold text-accent">{number}</span>
      </div>
      <h3 className="font-display text-lg sm:text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-text-secondary text-sm sm:text-base">{description}</p>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><div className="text-[var(--text-secondary)]">Loading...</div></div>}>
      <HomePageContent />
    </Suspense>
  )
}
