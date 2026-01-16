'use client'

import { X, Gift, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface ReferralBannerProps {
  referrerWallet: string
  isLinked?: boolean
  onClose?: () => void
}

export default function ReferralBanner({ referrerWallet, isLinked = false, onClose }: ReferralBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  if (!isVisible) return null

  const handleClose = () => { setIsVisible(false); onClose?.() }
  const shortWallet = `${referrerWallet.slice(0, 6)}...${referrerWallet.slice(-4)}`

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 rounded-xl border bg-accent/10 border-accent/30">
      <div className="flex items-center gap-3">
        {isLinked ? (
          <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
        ) : (
          <Gift className="text-accent flex-shrink-0" size={20} />
        )}
        <div>
          <p className="text-white text-sm font-medium">
            {isLinked ? (
              <>Connected via <span className="text-accent font-semibold">{shortWallet}</span></>
            ) : (
              <>You were invited by <span className="text-accent font-semibold">{shortWallet}</span></>
            )}
          </p>
          {!isLinked && <p className="text-text-secondary text-xs">Sign in to link your account & unlock rewards!</p>}
        </div>
      </div>
      <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-text-secondary">
        <X size={18} />
      </button>
    </div>
  )
}
