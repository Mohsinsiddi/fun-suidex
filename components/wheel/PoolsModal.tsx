'use client'

import { X, ArrowRight, Zap, Lock } from 'lucide-react'
import { LP_POOLS, SWAP_PAIRS, TOKENS, getPoolTokens } from '@/constants/pools'

interface PoolsModalProps {
  open: boolean
  onClose: () => void
}

export function PoolsModal({ open, onClose }: PoolsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] rounded-2xl bg-[#0a0c10] border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-white">Earn Free Spins</h2>
            <p className="text-[11px] text-text-muted">1 spin per $20 LP staked or swapped</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* LP Pools */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Stake LP</span>
              <span className="text-[10px] text-text-muted ml-auto">Earn spins while staked</span>
            </div>
            <div className="space-y-2">
              {LP_POOLS.filter(p => p.enabled).map((pool) => {
                const { token0, token1 } = getPoolTokens(pool)
                return (
                  <a
                    key={pool.id}
                    href={pool.farmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-surface/50 hover:border-green-500/30 hover:bg-green-500/5 transition-all"
                  >
                    <div className="flex -space-x-2 flex-shrink-0">
                      <img src={token0.logo} alt={token0.symbol} className="w-8 h-8 rounded-full border-2 border-[#0a0c10] bg-[#0a0c10]" />
                      <img src={token1.logo} alt={token1.symbol} className="w-8 h-8 rounded-full border-2 border-[#0a0c10] bg-[#0a0c10]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{pool.label}</div>
                      <div className="text-[10px] text-text-muted">farm.suidex.org</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-400 opacity-60 group-hover:opacity-100 transition-opacity">
                      <span>Stake</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Swap Pairs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Swap</span>
              <span className="text-[10px] text-text-muted ml-auto">Earn spins per swap</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SWAP_PAIRS.filter(p => p.enabled).map((pair) => {
                const { token0, token1 } = getPoolTokens(pair)
                return (
                  <a
                    key={pair.id}
                    href={pair.swapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-surface/30 hover:border-yellow-500/20 hover:bg-yellow-500/5 transition-all"
                  >
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      <img src={token0.logo} alt={token0.symbol} className="w-6 h-6 rounded-full border border-[#0a0c10] bg-[#0a0c10]" />
                      <img src={token1.logo} alt={token1.symbol} className="w-6 h-6 rounded-full border border-[#0a0c10] bg-[#0a0c10]" />
                    </div>
                    <span className="text-[11px] font-medium text-text-secondary group-hover:text-white transition-colors truncate">{pair.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-surface border border-border hover:text-white hover:bg-white/5 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
