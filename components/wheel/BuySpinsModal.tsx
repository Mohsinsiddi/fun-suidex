'use client'

import { useState, useEffect } from 'react'
import { X, Wallet, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BuySpinsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (spinsAdded: number) => void
  adminWallet?: string
  spinRate?: number
}

export function BuySpinsModal({
  isOpen,
  onClose,
  onSuccess,
  adminWallet: propAdminWallet,
  spinRate: propSpinRate,
}: BuySpinsModalProps) {
  const [adminWallet, setAdminWallet] = useState(propAdminWallet || '')
  const [spinRate, setSpinRate] = useState(propSpinRate || 1)

  useEffect(() => {
    if (!propAdminWallet || !propSpinRate) {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            if (!propAdminWallet) setAdminWallet(data.data.adminWalletAddress || '')
            if (!propSpinRate) setSpinRate(data.data.spinRateSUI || 1)
          }
        })
        .catch(console.error)
    }
  }, [propAdminWallet, propSpinRate])

  const [step, setStep] = useState<'info' | 'verify'>('info')
  const [txHash, setTxHash] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ spins: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(adminWallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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

      if (!res.ok) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md card p-6"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment Verified!</h3>
                <p className="text-text-secondary mb-6">
                  <span className="text-accent font-bold text-2xl">{success.spins}</span>
                  {' '}spins have been credited to your account
                </p>
                <button onClick={handleClose} className="btn btn-primary">
                  Start Spinning!
                </button>
              </div>
            ) : step === 'info' ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Wallet className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Buy Spins</h3>
                    <p className="text-sm text-text-secondary">Send SUI to get spins</p>
                  </div>
                </div>

                <div className="bg-background rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text-secondary">Rate</span>
                    <span className="font-bold">{spinRate} SUI = 1 Spin</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    Send any amount of SUI to receive spins
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Send SUI to this address:
                  </label>
                  <div className="flex items-center gap-2 bg-background rounded-lg p-3 border border-border">
                    <code className="flex-1 text-sm text-accent break-all">
                      {shortenAddress(adminWallet)}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 hover:bg-card rounded transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-success mt-1">Address copied!</p>
                  )}
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-warning mb-2">Instructions:</h4>
                  <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Copy the wallet address above</li>
                    <li>Send SUI from your connected wallet</li>
                    <li>Come back and click "Verify Payment"</li>
                    <li>Enter your transaction hash</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep('verify')}
                    className="btn btn-primary flex-1"
                  >
                    I've Sent Payment
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Verify Payment</h3>
                    <p className="text-sm text-text-secondary">Enter your transaction hash</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4 text-sm text-error">
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
                    className="input font-mono text-sm"
                    disabled={verifying}
                  />
                  <p className="text-xs text-text-muted mt-2">
                    Find this in your wallet's transaction history
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
                    className="btn btn-ghost flex-1"
                    disabled={verifying}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyPayment}
                    disabled={verifying || !txHash.trim()}
                    className="btn btn-primary flex-1"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default BuySpinsModal