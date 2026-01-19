'use client'

import { useState, useEffect } from 'react'
import { X, Wallet, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'

interface BuySpinsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (spinsAdded: number) => void
}

export function BuySpinsModal({ isOpen, onClose, onSuccess }: BuySpinsModalProps) {
  const [adminWallet, setAdminWallet] = useState('')
  const [spinRate, setSpinRate] = useState(1)
  const [step, setStep] = useState<'info' | 'verify'>('info')
  const [txHash, setTxHash] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ spins: number } | null>(null)
  const [copied, setCopied] = useState(false)

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
    setStep('info')
    setTxHash('')
    setError('')
    setSuccess(null)
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
            <div className="flex gap-3">
              <button onClick={handleClose} className="flex-1 px-4 py-3 bg-background hover:bg-surface-alt border border-border rounded-xl font-medium text-text-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep('verify')}
                className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl transition-colors"
              >
                I&apos;ve Sent Payment
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