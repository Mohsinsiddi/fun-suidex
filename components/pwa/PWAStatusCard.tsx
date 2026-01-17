'use client'

import { useState, useEffect } from 'react'
import { PWASetupModal } from './PWASetupModal'
import { getStoredWallet } from '@/lib/pwa/encryption'
import {
  Smartphone,
  Lock,
  Check,
  ChevronRight,
  Zap,
  Bell,
  Trophy,
  Trash2,
  Loader2,
  AlertTriangle,
  Key,
  Copy,
  RefreshCw,
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

export function PWAStatusCard({ wallet, isAuthenticated }: PWAStatusCardProps) {
  const [status, setStatus] = useState<PWAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  // Transfer code state
  const [transferCode, setTransferCode] = useState<string | null>(null)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferCopied, setTransferCopied] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus()
    }
  }, [isAuthenticated])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pwa/status')
      const data = await res.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (err) {
      console.error('PWA status fetch error:', err)
    }
    setLoading(false)
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      const res = await fetch('/api/pwa/unlink', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setShowUnlinkConfirm(false)
        fetchStatus() // Refresh status
      }
    } catch (err) {
      console.error('PWA unlink error:', err)
    }
    setUnlinking(false)
  }

  const handleGetTransferCode = async () => {
    const stored = getStoredWallet()
    if (!stored) {
      console.error('No stored wallet to transfer')
      return
    }

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
        setTransferCode(data.data.token)
      }
    } catch (err) {
      console.error('Transfer code error:', err)
    }
    setTransferLoading(false)
  }

  const copyTransferCode = () => {
    if (transferCode) {
      navigator.clipboard.writeText(transferCode)
      setTransferCopied(true)
      setTimeout(() => setTransferCopied(false), 2000)
    }
  }

  const formatWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-4)}`

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-border" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-border rounded mb-2" />
            <div className="h-3 w-32 bg-border rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!status) return null

  // Not eligible yet
  if (!status.isEligible) {
    const progress = (status.requirements.currentSpins / status.requirements.minSpins) * 100

    return (
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm mb-1">PWA Access Locked</h3>
            <p className="text-text-muted text-xs mb-3">
              Complete {status.requirements.spinsRemaining} more spins to unlock mobile app access
            </p>

            {/* Progress bar */}
            <div className="relative">
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-secondary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-text-muted">
                  {status.requirements.currentSpins} / {status.requirements.minSpins} spins
                </span>
                <span className="text-[10px] text-accent font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
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
          className="w-full bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-accent/30 p-4 text-left hover:border-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm mb-0.5 flex items-center gap-2">
                Unlock PWA Access
                <Zap className="w-3.5 h-3.5 text-accent" />
              </h3>
              <p className="text-text-muted text-xs">
                Play from your mobile device with push notifications
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-accent" />
          </div>
        </button>

        <PWASetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          wallet={wallet}
          onSuccess={fetchStatus}
        />
      </>
    )
  }

  // PWA is enabled
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium text-sm mb-1 flex items-center gap-2">
            PWA Active
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full">
              Enabled
            </span>
          </h3>

          <div className="space-y-2 mt-3">
            {/* PWA Wallet */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">PWA Wallet</span>
              <span className="text-white font-mono">{formatWallet(status.pwaWallet!)}</span>
            </div>

            {/* Push Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Push Notifications
              </span>
              {status.hasPushEnabled ? (
                <span className="text-green-400">Enabled</span>
              ) : (
                <span className="text-text-muted">Disabled</span>
              )}
            </div>

            {/* Linked Date */}
            {status.linkedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Linked</span>
                <span className="text-text-secondary">
                  {new Date(status.linkedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Access PWA Link */}
          <a
            href="/pwa"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Open PWA
          </a>

          {/* Transfer Code for Mobile */}
          {!transferCode ? (
            <button
              onClick={handleGetTransferCode}
              disabled={transferLoading}
              className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-surface border border-border rounded-lg text-white text-xs font-medium hover:border-accent/50 transition-colors disabled:opacity-50"
            >
              {transferLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Key className="w-3.5 h-3.5" />
              )}
              Get Transfer Code
            </button>
          ) : (
            <div className="mt-3 bg-accent/10 border border-accent/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-muted text-[10px]">Transfer Code (10 min)</span>
                <button
                  onClick={handleGetTransferCode}
                  disabled={transferLoading}
                  className="text-text-muted hover:text-accent"
                >
                  <RefreshCw className={`w-3 h-3 ${transferLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-accent font-mono text-xl font-bold tracking-widest">{transferCode}</span>
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
              <p className="text-text-muted text-[10px] mt-2">
                Enter this code in the PWA app on your phone
              </p>
            </div>
          )}

          {/* Unlink option */}
          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="mt-2 text-text-muted text-[10px] hover:text-red-400 transition-colors w-full text-center"
            >
              Unlink PWA
            </button>
          ) : (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-xs font-medium">Unlink PWA?</p>
                  <p className="text-red-400/70 text-[10px] mt-0.5">
                    You'll need to set up again to use PWA.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="flex-1 py-1.5 bg-surface rounded text-white text-xs"
                  disabled={unlinking}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="flex-1 py-1.5 bg-red-500 rounded text-white text-xs font-medium flex items-center justify-center gap-1"
                >
                  {unlinking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      Unlink
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
