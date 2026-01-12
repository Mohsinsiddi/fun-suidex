'use client'

// ============================================
// Prize Reveal Modal
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Gift, Lock, Coins } from 'lucide-react'
import type { SpinReveal } from '@/types'

interface PrizeRevealModalProps {
  isOpen: boolean
  onClose: () => void
  prize: SpinReveal | null
}

export function PrizeRevealModal({ isOpen, onClose, prize }: PrizeRevealModalProps) {
  if (!prize) return null

  const isWin = prize.prizeType !== 'no_prize'
  const isLocked = prize.lockDuration === '1_year'

  const getPrizeIcon = () => {
    if (!isWin) return <Gift className="w-16 h-16 text-gray-500" />
    if (prize.prizeValueUSD >= 1000) return <Trophy className="w-16 h-16 text-prize-gold" />
    if (isLocked) return <Lock className="w-16 h-16 text-prize-purple" />
    return <Coins className="w-16 h-16 text-accent" />
  }

  const getPrizeColor = () => {
    if (!isWin) return 'text-gray-400'
    if (prize.prizeType === 'locked_victory') return 'text-prize-purple'
    if (prize.prizeType === 'suitrump') return 'text-prize-cyan'
    if (prize.prizeValueUSD >= 1000) return 'text-prize-gold'
    return 'text-accent'
  }

  const getPrizeLabel = () => {
    switch (prize.prizeType) {
      case 'liquid_victory':
        return 'Victory Tokens'
      case 'locked_victory':
        return 'Locked Victory'
      case 'suitrump':
        return 'SuiTrump'
      case 'no_prize':
        return 'No Prize'
      default:
        return 'Prize'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="card p-8 max-w-md w-full text-center pointer-events-auto relative overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-card-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Confetti/celebration effect for wins */}
              {isWin && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        background: ['var(--accent)', 'var(--prize-gold)', 'var(--prize-purple)', 'var(--prize-cyan)'][i % 4],
                      }}
                      initial={{ y: -20, opacity: 1, scale: 0 }}
                      animate={{
                        y: 400,
                        opacity: 0,
                        scale: [0, 1, 1, 0],
                        x: Math.random() * 100 - 50,
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.05,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Prize Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
                className={`inline-flex p-4 rounded-full mb-6 ${
                  isWin ? 'bg-accent/10' : 'bg-gray-700/50'
                }`}
              >
                {getPrizeIcon()}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`font-display text-3xl font-bold mb-2 ${
                  isWin ? 'gradient-text' : 'text-gray-400'
                }`}
              >
                {isWin ? 'Congratulations!' : 'Better Luck Next Time'}
              </motion.h2>

              {/* Prize Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                {isWin ? (
                  <>
                    <p className="text-text-secondary mb-4">You won:</p>
                    <div className={`text-4xl font-bold ${getPrizeColor()}`}>
                      {prize.prizeAmount.toLocaleString()} {getPrizeLabel()}
                    </div>
                    <div className="text-xl text-text-secondary mt-2">
                      ≈ ${prize.prizeValueUSD.toFixed(2)} USD
                    </div>
                    {isLocked && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-prize-purple">
                        <Lock className="w-4 h-4" />
                        <span>Vesting: 1 year linear unlock</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-text-secondary">
                    Don&apos;t give up! Your next spin could be a winner.
                  </p>
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3"
              >
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                >
                  Close
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary flex-1"
                >
                  Spin Again
                </button>
              </motion.div>

              {/* Prize pending notice */}
              {isWin && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 text-xs text-text-muted"
                >
                  Prize will be distributed within 24-48 hours
                </motion.p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
