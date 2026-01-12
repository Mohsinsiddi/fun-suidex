'use client'

// ============================================
// Wheel Game Component
// ============================================

import { useState, useCallback } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, Gift, Lock, Sparkles, AlertCircle } from 'lucide-react'
import { SpinWheel } from './SpinWheel'
import { PrizeRevealModal } from './PrizeRevealModal'
import { BuySpinsModal } from './BuySpinsModal'
import type { SpinReveal } from '@/types'
import { WHEEL_CONFIG } from '@/constants'

export function WheelGame() {
  const account = useCurrentAccount()
  
  // State
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [prizeResult, setPrizeResult] = useState<SpinReveal | null>(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Mock data (would come from API in production)
  const [spins, setSpins] = useState({
    purchased: 5,
    bonus: 2,
    free: 0,
  })
  
  const totalSpins = spins.purchased + spins.bonus + spins.free
  const canSpin = totalSpins > 0 && !isSpinning && account

  // Handle spin
  const handleSpin = useCallback(async () => {
    if (!canSpin) return
    
    setError(null)
    setIsSpinning(true)
    
    try {
      // Call API to execute spin
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinType: 'purchased' }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Spin failed')
      }
      
      const { spinId, slotIndex } = result.data
      
      // Calculate rotation
      const { MIN_ROTATIONS, MAX_ROTATIONS, SLOT_ANGLE } = WHEEL_CONFIG
      const fullRotations = MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS)
      const targetAngle = slotIndex * SLOT_ANGLE + SLOT_ANGLE / 2
      const totalDegrees = Math.floor(fullRotations * 360 + (360 - targetAngle))
      
      // Update rotation (relative to current)
      setCurrentRotation((prev) => prev + totalDegrees)
      
      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, WHEEL_CONFIG.SPIN_DURATION_MS + 500))
      
      // Reveal prize
      const revealResponse = await fetch(`/api/spin/${spinId}/reveal`)
      const revealResult = await revealResponse.json()
      
      if (revealResult.success) {
        setPrizeResult(revealResult.data)
        setShowPrizeModal(true)
        
        // Update spin count
        setSpins((prev) => ({
          ...prev,
          purchased: Math.max(0, prev.purchased - 1),
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSpinning(false)
    }
  }, [canSpin])

  return (
    <div className="flex-1 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
            Wheel of <span className="gradient-text">Victory</span>
          </h1>
          <p className="text-text-secondary">
            Spin to win Victory tokens, SuiTrump, and more!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Stats */}
          <div className="space-y-4">
            <SpinBalanceCard spins={spins} onBuyClick={() => setShowBuyModal(true)} />
            <StatsCard />
          </div>

          {/* Center - Wheel */}
          <div className="lg:col-span-1 flex flex-col items-center">
            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full mb-4 p-4 rounded-lg bg-error/10 border border-error/30 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                  <p className="text-sm text-error">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wheel */}
            <SpinWheel
              rotation={currentRotation}
              isSpinning={isSpinning}
            />

            {/* Spin Button */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className={`
                mt-8 px-12 py-4 rounded-xl font-display text-xl font-bold
                transition-all duration-300 transform
                ${canSpin
                  ? 'bg-accent text-background hover:bg-accent-hover hover:scale-105 glow cursor-pointer'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isSpinning ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Spinning...
                </span>
              ) : !account ? (
                'Connect Wallet'
              ) : totalSpins === 0 ? (
                'No Spins Available'
              ) : (
                `SPIN (${totalSpins})`
              )}
            </button>

            {!account && (
              <p className="mt-4 text-sm text-text-muted">
                Connect your wallet to start playing
              </p>
            )}
          </div>

          {/* Right Sidebar - Prize Table */}
          <div>
            <PrizeTableCard />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrizeRevealModal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        prize={prizeResult}
      />

      <BuySpinsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={(newSpins) => {
          setSpins((prev) => ({
            ...prev,
            purchased: prev.purchased + newSpins,
          }))
        }}
      />
    </div>
  )
}

// ----------------------------------------
// Sub-components
// ----------------------------------------

function SpinBalanceCard({
  spins,
  onBuyClick,
}: {
  spins: { purchased: number; bonus: number; free: number }
  onBuyClick: () => void
}) {
  return (
    <div className="card p-6">
      <h3 className="font-display font-bold mb-4 flex items-center gap-2">
        <Coins className="w-5 h-5 text-accent" />
        Your Spins
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Purchased</span>
          <span className="font-mono font-bold">{spins.purchased}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Bonus</span>
          <span className="font-mono font-bold text-accent">{spins.bonus}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Free (Daily)</span>
          <span className="font-mono font-bold text-secondary">{spins.free}</span>
        </div>

        <hr className="border-border my-4" />

        <div className="flex justify-between items-center text-lg">
          <span className="font-bold">Total</span>
          <span className="font-mono font-bold text-accent">
            {spins.purchased + spins.bonus + spins.free}
          </span>
        </div>
      </div>

      <button
        onClick={onBuyClick}
        className="btn btn-primary w-full mt-6"
      >
        Buy Spins
      </button>
    </div>
  )
}

function StatsCard() {
  return (
    <div className="card p-6">
      <h3 className="font-display font-bold mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-accent" />
        Your Stats
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Total Spins</span>
          <span className="font-mono">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Total Won</span>
          <span className="font-mono text-accent">$0.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Biggest Win</span>
          <span className="font-mono text-prize-gold">$0.00</span>
        </div>
      </div>
    </div>
  )
}

function PrizeTableCard() {
  const prizes = [
    { label: 'Liquid Victory', color: 'prize-liquid', values: '$5 - $50' },
    { label: 'Locked Victory', color: 'prize-purple', values: '$100 - $3,500', locked: true },
    { label: 'SuiTrump', color: 'prize-cyan', values: '$20 - $100' },
    { label: 'Jackpot', color: 'prize-gold', values: '$1,000+' },
    { label: 'No Prize', color: 'prize-none', values: '~50% chance' },
  ]

  return (
    <div className="card p-6">
      <h3 className="font-display font-bold mb-4">Prize Table</h3>

      <div className="space-y-3">
        {prizes.map((prize) => (
          <div
            key={prize.label}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors"
          >
            <div
              className={`w-4 h-4 rounded-full`}
              style={{ background: `var(--${prize.color})` }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{prize.label}</span>
                {prize.locked && <Lock className="w-3 h-3 text-text-muted" />}
              </div>
              <span className="text-xs text-text-muted">{prize.values}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        * Locked Victory tokens vest over 1 year
      </p>
    </div>
  )
}
