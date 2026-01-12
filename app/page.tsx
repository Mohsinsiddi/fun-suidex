import Link from 'next/link'
import { GAMES } from '@/constants'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { GameCard } from '@/components/ui/GameCard'

// ----------------------------------------
// Home Page
// ----------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl opacity-20" />
          
          <div className="relative max-w-6xl mx-auto text-center">
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">SuiDex</span>{' '}
              <span className="text-text-primary">Games</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-8">
              Spin to win Victory tokens! Free daily spins for stakers.
              Part of the SuiDex ecosystem.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/wheel"
                className="btn btn-primary text-lg px-8 py-4 glow"
              >
                Play Now
              </Link>
              <a
                href="https://suidex.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-lg px-8 py-4"
              >
                Visit SuiDex
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem label="Total Prizes Won" value="$12,450" />
              <StatItem label="Total Spins" value="8,234" />
              <StatItem label="Active Players" value="542" />
              <StatItem label="Top Prize" value="$3,500" />
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2 text-center">
              Available Games
            </h2>
            <p className="text-text-secondary text-center mb-12">
              Choose a game to start playing
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {GAMES.map((game) => (
                <GameCard key={game.slug} {...game} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-12 text-center">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                number={1}
                title="Connect Wallet"
                description="Connect your SUI wallet to get started. We support all major wallets."
              />
              <StepCard
                number={2}
                title="Get Spins"
                description="Stake $20+ in Victory pools for free daily spins, or purchase spins with SUI."
              />
              <StepCard
                number={3}
                title="Win Prizes"
                description="Spin the wheel and win Victory tokens, SuiTrump, and more!"
              />
            </div>
          </div>
        </section>

        {/* Referral CTA */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card p-8 md:p-12 text-center card-glow">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Refer Friends, Earn{' '}
                <span className="text-accent">10%</span> Commission
              </h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">
                Share your referral link and earn 10% of all prizes won by your
                referrals. Paid weekly in Victory tokens!
              </p>
              <Link
                href="/wheel"
                className="btn btn-primary inline-flex"
              >
                Get Your Referral Link
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

// ----------------------------------------
// Sub-components
// ----------------------------------------

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-accent mb-1">
        {value}
      </div>
      <div className="text-sm text-text-secondary">{label}</div>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
        <span className="font-display text-2xl font-bold text-accent">
          {number}
        </span>
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-text-secondary">{description}</p>
    </div>
  )
}
