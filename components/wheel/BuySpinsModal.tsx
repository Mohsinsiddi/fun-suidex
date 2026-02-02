'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Wallet, Copy, Check, ExternalLink, Loader2, RefreshCw, Zap } from 'lucide-react'

interface UnclaimedTx {
  txHash: string
  amountSUI: number
  suggestedSpins: number
  timestamp: Date
  requiresApproval: boolean
}

interface BuySpinsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (spinsAdded: number) => void
}

export function BuySpinsModal({ isOpen, onClose, onSuccess }: BuySpinsModalProps) {
  const [adminWallet, setAdminWallet] = useState('')
  const [spinRate, setSpinRate] = useState(1)
  const [step, setStep] = useState<'info' | 'verify' | 'auto'>('info')
  const [txHash, setTxHash] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ spins: number } | null>(null)
  const [copied, setCopied] = useState(false)

  // Real-time TX scanning
  const [scanning, setScanning] = useState(false)
  const [unclaimedTxs, setUnclaimedTxs] = useState<UnclaimedTx[]>([])
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(true)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanRef = useRef<number>(0)

  // Fetch config on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setAdminWallet(data.data.adminWalletAddress || '')
            setSpinRate(data.data.spinRateSUI || 1)
          }
        })
        .catch(console.error)
    }
  }, [isOpen])

  // Scan for unclaimed transactions
  const scanForTransactions = useCallback(async () => {
    // Prevent rapid scanning
    const now = Date.now()
    if (now - lastScanRef.current < 3000) return
    lastScanRef.current = now

    try {
      setScanning(true)
      const res = await fetch('/api/payment/claim')
      const data = await res.json()

      if (data.success && data.data?.unclaimed) {
        const newTxs = data.data.unclaimed as UnclaimedTx[]
        setUnclaimedTxs(newTxs)

        // Auto-claim first unclaimed TX if enabled
        if (autoClaimEnabled && newTxs.length > 0 && !newTxs[0].requiresApproval) {
          await claimTransaction(newTxs[0].txHash)
        }
      }
    } catch (err) {
      console.error('Scan error:', err)
    } finally {
      setScanning(false)
    }
  }, [autoClaimEnabled])

  // Claim a specific transaction
  const claimTransaction = async (hash: string) => {
    setVerifying(true)
    setError('')

    try {
      const res = await fetch('/api/payment/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim payment')
      }

      if (data.data.status === 'pending_approval') {
        setError('Payment requires admin approval (>10 SUI)')
        setUnclaimedTxs(prev => prev.filter(tx => tx.txHash !== hash))
      } else {
        setSuccess({ spins: data.data.spinsCredited })
        onSuccess?.(data.data.spinsCredited)
        stopScanning()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setVerifying(false)
    }
  }

  // Start real-time scanning
  const startScanning = useCallback(() => {
    setStep('auto')
    scanForTransactions()

    // Poll every 5 seconds
    scanIntervalRef.current = setInterval(scanForTransactions, 5000)
  }, [scanForTransactions])

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount or close
  useEffect(() => {
    return () => stopScanning()
  }, [stopScanning])

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setUnclaimedTxs([])
    }
  }, [isOpen, stopScanning])

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(adminWallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = adminWallet
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleVerifyPayment = async () => {
    if (!txHash.trim()) {
      setError('Please enter a transaction hash')
      return
    }

    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/payment/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHash.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify payment')
      }

      setSuccess({ spins: data.data.spinsCredited })
      onSuccess?.(data.data.spinsCredited)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleClose = () => {
    stopScanning()
    setStep('info')
    setTxHash('')
    setError('')
    setSuccess(null)
    setUnclaimedTxs([])
    onClose()
  }

  const shortenAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          /* Success State */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Verified!</h3>
            <p className="text-text-secondary mb-6">
              <span className="text-accent font-bold text-2xl">{success.spins}</span>
              {' '}spins have been credited to your account
            </p>
            <button onClick={handleClose} className="px-6 py-3 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl transition-colors">
              Start Spinning!
            </button>
          </div>
        ) : step === 'info' ? (
          /* Step 1: Show Payment Info */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-accent/10">
                <Wallet className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Buy Spins</h3>
                <p className="text-sm text-text-secondary">Send SUI to get spins</p>
              </div>
            </div>

            {/* Rate Info */}
            <div className="bg-background rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-text-secondary">Rate</span>
                <span className="font-bold text-white">{spinRate} SUI = 1 Spin</span>
              </div>
              <div className="text-xs text-text-muted">
                Send any amount of SUI to receive spins
              </div>
            </div>

            {/* Admin Wallet */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Send SUI to this address:
              </label>
              <div className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border">
                <code className="flex-1 text-sm text-accent break-all font-mono">
                  {shortenAddress(adminWallet)}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : (
                    <Copy className="w-4 h-4 text-text-muted" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-accent mt-1">Address copied!</p>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <h4 className="font-medium text-yellow-400 mb-2">Instructions:</h4>
              <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                <li>Copy the wallet address above</li>
                <li>Send SUI from your connected wallet</li>
                <li>Come back and click &quot;Verify Payment&quot;</li>
                <li>Enter your transaction hash</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={startScanning}
                className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                I&apos;ve Sent Payment - Auto Detect
              </button>
              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 px-4 py-3 bg-background hover:bg-surface-alt border border-border rounded-xl font-medium text-text-secondary transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => setStep('verify')}
                  className="flex-1 px-4 py-3 bg-surface hover:bg-white/10 border border-border rounded-xl font-medium text-white transition-colors"
                >
                  Enter TX Manually
                </button>
              </div>
            </div>
          </>
        ) : step === 'auto' ? (
          /* Step 2a: Auto-Scan Mode */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${scanning ? 'bg-accent/20' : 'bg-accent/10'}`}>
                <RefreshCw className={`w-6 h-6 text-accent ${scanning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Scanning for Payment</h3>
                <p className="text-sm text-text-secondary">Waiting to detect your transaction...</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Scanning Status */}
            <div className="bg-background rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-secondary text-sm">Status</span>
                <span className={`text-sm font-medium ${scanning ? 'text-accent' : 'text-text-muted'}`}>
                  {scanning ? 'Scanning...' : 'Waiting'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Transactions Found</span>
                <span className="text-white font-bold">{unclaimedTxs.length}</span>
              </div>
            </div>

            {/* Detected Transactions */}
            {unclaimedTxs.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-white">Detected Payments:</p>
                {unclaimedTxs.map((tx) => (
                  <div key={tx.txHash} className="bg-accent/10 border border-accent/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">{tx.amountSUI} SUI</span>
                      <span className="text-accent font-medium">= {tx.suggestedSpins} Spins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-text-muted font-mono">
                        {tx.txHash.slice(0, 16)}...
                      </code>
                      {tx.requiresApproval ? (
                        <span className="text-xs text-yellow-400">Needs Approval</span>
                      ) : (
                        <button
                          onClick={() => claimTransaction(tx.txHash)}
                          disabled={verifying}
                          className="text-xs text-accent hover:underline"
                        >
                          {verifying ? 'Claiming...' : 'Claim Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 text-sm text-blue-300">
              <p>Keep this window open. We&apos;ll automatically detect and claim your payment when it arrives.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { stopScanning(); setStep('info'); }}
                className="flex-1 px-4 py-3 bg-background hover:bg-surface-alt border border-border rounded-xl font-medium text-text-secondary transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => { stopScanning(); setStep('verify'); }}
                className="flex-1 px-4 py-3 bg-surface hover:bg-white/10 border border-border rounded-xl font-medium text-white transition-colors"
              >
                Enter TX Manually
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Verify Payment */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-accent/10">
                <Check className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Verify Payment</h3>
                <p className="text-sm text-text-secondary">Enter your transaction hash</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter transaction hash..."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white font-mono text-sm focus:outline-none focus:border-accent"
                disabled={verifying}
              />
              <p className="text-xs text-text-muted mt-2">
                Find this in your wallet&apos;s transaction history
              </p>
            </div>

            <a
              href="https://suiscan.xyz/mainnet/account/txs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline mb-6"
            >
              <ExternalLink className="w-4 h-4" />
              Check your transactions on Suiscan
            </a>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 px-4 py-3 bg-background hover:bg-surface-alt border border-border rounded-xl font-medium text-text-secondary transition-colors"
                disabled={verifying}
              >
                Back
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={verifying || !txHash.trim()}
                className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Payment'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BuySpinsModal