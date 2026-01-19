'use client'

import { useState, useEffect, useCallback } from 'react'
import { PWASetupModal } from './PWASetupModal'
import { getStoredWallet } from '@/lib/pwa/encryption'
import {
  Smartphone,
  Lock,
  Check,
  ChevronRight,
  ChevronDown,
  Zap,
  Bell,
  Trash2,
  Loader2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

interface PWAStatusCardProps {
  wallet: string
  isAuthenticated: boolean
}

interface PWAStatus {
  isEnabled: boolean
  isEligible: boolean
  pwaWallet: string | null
  linkedAt: string | null
  hasPushEnabled: boolean
  requirements: {
    minSpins: number
    currentSpins: number
    spinsRemaining: number
  }
}

interface TransferStatus {
  status: 'active' | 'used' | 'expired' | 'none' | 'loading'
  token?: string
  expiresAt?: Date
  remainingSeconds?: number
  usedAt?: Date
}

export function PWAStatusCard({ wallet, isAuthenticated }: PWAStatusCardProps) {
  const [status, setStatus] = useState<PWAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  // Transfer code state
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ status: 'none' })
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferCopied, setTransferCopied] = useState(false)
  const [showTransferSection, setShowTransferSection] = useState(false)

  // Fetch on mount/auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus()
    }
  }, [isAuthenticated])

  // Fetch transfer token status
  const fetchTransferStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pwa/transfer/status')
      const data = await res.json()
      if (data.success) {
        const { hasActiveToken, token, status: tokenStatus, expiresAt, remainingSeconds, usedAt } = data.data
        setTransferStatus({
          status: tokenStatus,
          token: hasActiveToken ? token : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          remainingSeconds: remainingSeconds || 0,
          usedAt: usedAt ? new Date(usedAt) : undefined,
        })
        // Auto-expand if there's an active code
        if (hasActiveToken) setShowTransferSection(true)
      } else {
        setTransferStatus({ status: 'none' })
      }
    } catch (err) {
      console.error('Transfer status fetch error:', err)
      setTransferStatus({ status: 'none' })
    }
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pwa/status')
      const data = await res.json()
      if (data.success) {
        setStatus(data.data)
        if (data.data.isEnabled) {
          fetchTransferStatus()
        }
      }
    } catch (err) {
      console.error('PWA status fetch error:', err)
    }
    setLoading(false)
  }

  // Countdown timer
  useEffect(() => {
    if (transferStatus.status !== 'active' || !transferStatus.expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((transferStatus.expiresAt!.getTime() - Date.now()) / 1000))
      if (remaining <= 0) {
        setTransferStatus(prev => ({ ...prev, status: 'expired', remainingSeconds: 0 }))
        clearInterval(interval)
      } else {
        setTransferStatus(prev => ({ ...prev, remainingSeconds: remaining }))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [transferStatus.status, transferStatus.expiresAt])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      const res = await fetch('/api/pwa/unlink', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setShowUnlinkConfirm(false)
        fetchStatus()
      }
    } catch (err) {
      console.error('PWA unlink error:', err)
    }
    setUnlinking(false)
  }

  const handleGetTransferCode = async () => {
    const stored = getStoredWallet()
    if (!stored) return

    setTransferLoading(true)
    try {
      const res = await fetch('/api/pwa/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedData: stored.encryptedData,
          pwaWallet: stored.pwaWallet,
          mainWallet: stored.mainWallet,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTransferStatus({
          status: 'active',
          token: data.data.token,
          expiresAt: new Date(data.data.expiresAt),
          remainingSeconds: data.data.expiresIn || 600,
        })
        setShowTransferSection(true)
      }
    } catch (err) {
      console.error('Transfer code error:', err)
    }
    setTransferLoading(false)
  }

  const copyTransferCode = () => {
    if (transferStatus.token) {
      navigator.clipboard.writeText(transferStatus.token)
      setTransferCopied(true)
      setTimeout(() => setTransferCopied(false), 2000)
    }
  }

  // Modal close handler - always refresh status
  const handleModalClose = () => {
    setShowSetupModal(false)
    fetchStatus() // Always refresh when modal closes
  }

  const formatWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-4)}`

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-border" />
          <div className="flex-1">
            <div className="h-3 w-20 bg-border rounded mb-1" />
            <div className="h-2.5 w-28 bg-border rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!status) return null

  // Not eligible yet - compact progress bar
  if (!status.isEligible) {
    const progress = (status.requirements.currentSpins / status.requirements.minSpins) * 100
    return (
      <div className="bg-surface rounded-xl border border-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-xs font-medium">PWA Locked</span>
              <span className="text-[10px] text-text-muted">
                {status.requirements.currentSpins}/{status.requirements.minSpins} spins
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-secondary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Eligible but not set up
  if (!status.isEnabled) {
    return (
      <>
        <button
          onClick={() => setShowSetupModal(true)}
          className="w-full bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-accent/30 p-3 text-left hover:border-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-xs flex items-center gap-1.5">
                Unlock PWA Access
                <Zap className="w-3 h-3 text-accent" />
              </h3>
              <p className="text-text-muted text-[10px]">Play on mobile with notifications</p>
            </div>
            <ChevronRight className="w-4 h-4 text-accent flex-shrink-0" />
          </div>
        </button>

        <PWASetupModal
          isOpen={showSetupModal}
          onClose={handleModalClose}
          wallet={wallet}
          onSuccess={fetchStatus}
        />
      </>
    )
  }

  // PWA is enabled - compact view
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header row */}
      <div className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-medium">PWA Active</span>
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[9px] rounded-full">
              Enabled
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
            <span className="font-mono">{formatWallet(status.pwaWallet!)}</span>
            {status.hasPushEnabled && (
              <span className="flex items-center gap-0.5">
                <Bell className="w-2.5 h-2.5" /> Push
              </span>
            )}
          </div>
        </div>
        <a
          href="/pwa"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-accent text-[10px] font-medium hover:bg-accent/20 transition-colors flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      </div>

      {/* Transfer Code Section - Collapsible */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowTransferSection(!showTransferSection)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-background/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Transfer Code</span>
            {transferStatus.status === 'active' && (
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[9px] rounded-full flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatTime(transferStatus.remainingSeconds || 0)}
              </span>
            )}
            {transferStatus.status === 'expired' && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded-full">
                Expired
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showTransferSection ? 'rotate-180' : ''}`} />
        </button>

        {showTransferSection && (
          <div className="px-3 pb-3 space-y-2">
            {/* Active Code */}
            {transferStatus.status === 'active' && transferStatus.token && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black rounded-lg px-3 py-2 text-center">
                  <span className={`font-mono text-lg font-bold tracking-[0.15em] ${
                    (transferStatus.remainingSeconds || 0) < 60 ? 'text-red-400' : 'text-accent'
                  }`}>
                    {transferStatus.token}
                  </span>
                </div>
                <button
                  onClick={copyTransferCode}
                  className="p-2 bg-accent/20 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  {transferCopied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-accent" />
                  )}
                </button>
              </div>
            )}

            {/* Used/Expired/None States */}
            {transferStatus.status === 'used' && (
              <p className="text-green-400 text-[10px] text-center py-1">
                ✓ Code used successfully
              </p>
            )}
            {transferStatus.status === 'expired' && (
              <p className="text-amber-400 text-[10px] text-center py-1">
                Code expired - generate a new one
              </p>
            )}
            {transferStatus.status === 'none' && (
              <p className="text-text-muted text-[10px] text-center py-1">
                Transfer your PWA to another device
              </p>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGetTransferCode}
              disabled={transferLoading}
              className="w-full py-2 bg-background border border-border rounded-lg text-xs font-medium hover:border-accent/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {transferLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {transferStatus.status === 'none' ? 'Generate Code' : 'New Code'}
            </button>
          </div>
        )}
      </div>

      {/* Unlink - Very compact */}
      <div className="border-t border-border px-3 py-2">
        {!showUnlinkConfirm ? (
          <button
            onClick={() => setShowUnlinkConfirm(true)}
            className="text-text-muted text-[10px] hover:text-red-400 transition-colors"
          >
            Unlink PWA
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-[10px] flex-1">Unlink PWA?</span>
            <button
              onClick={() => setShowUnlinkConfirm(false)}
              className="px-2 py-1 text-[10px] text-text-secondary hover:text-white"
              disabled={unlinking}
            >
              Cancel
            </button>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="px-2 py-1 bg-red-500 rounded text-white text-[10px] font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {unlinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Unlink
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
