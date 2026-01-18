'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'
import {
  getStoredWallet,
  decryptWithPIN,
  trackPINAttempt,
  clearStoredWallet,
  storeTokens,
  storeEncryptedWallet,
} from '@/lib/pwa/encryption'
import { createPWAAuthMessage } from '@/lib/pwa/auth'
import { PINInput } from '@/components/pwa/PINInput'
import { Gamepad2, Smartphone, ArrowRight, AlertTriangle, Trash2, Key, Loader2, Check } from 'lucide-react'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

export default function PWALoginPage() {
  const router = useRouter()
  const { isAuthenticated, setTokens, setUser, logout } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [hasStoredWallet, setHasStoredWallet] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Transfer code entry
  const [showTransferInput, setShowTransferInput] = useState(false)
  const [transferCode, setTransferCode] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = getStoredWallet()
    setHasStoredWallet(!!stored)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace('/pwa/home')
    }
  }, [mounted, isAuthenticated, router])

  const handlePINSubmit = useCallback(async (pin: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const stored = getStoredWallet()
      if (!stored) {
        setError('No wallet found. Please set up PWA from the web app.')
        setIsLoading(false)
        return
      }

      // Decrypt private key with PIN
      const privateKey = await decryptWithPIN(stored.encryptedData, pin)
      if (!privateKey) {
        const remaining = trackPINAttempt(false)
        if (remaining <= 0) {
          clearStoredWallet()
          logout()
          setHasStoredWallet(false)
          setError('Too many failed attempts. Wallet data cleared for security.')
        } else {
          setError(`Incorrect PIN. ${remaining} attempts remaining.`)
        }
        setIsLoading(false)
        return
      }

      // Success - reset attempts
      trackPINAttempt(true)

      // Create keypair from decrypted seed
      const keypair = Ed25519Keypair.deriveKeypairFromSeed(privateKey)
      const pwaWallet = keypair.getPublicKey().toSuiAddress()

      // Create auth message and sign
      const timestamp = Date.now()
      const message = createPWAAuthMessage(pwaWallet, timestamp)
      const messageBytes = new TextEncoder().encode(message)
      const signedMessage = await keypair.signPersonalMessage(messageBytes)
      // signPersonalMessage returns { bytes, signature } where signature is already base64
      const signatureBase64 = signedMessage.signature

      // Authenticate with backend
      const res = await fetch('/api/pwa/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pwaWallet,
          signature: signatureBase64,
          timestamp,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Authentication failed')
        setIsLoading(false)
        return
      }

      // Store tokens and update state
      storeTokens(data.data.accessToken, data.data.refreshToken)
      setTokens(data.data.accessToken, data.data.refreshToken)
      // User data is nested inside data.data.user
      const userData = data.data.user
      setUser({
        wallet: userData.wallet,
        pwaWallet: data.data.pwaWallet,
        purchasedSpins: userData.purchasedSpins || 0,
        bonusSpins: userData.bonusSpins || 0,
        totalSpins: userData.totalSpins || 0,
        totalWinsUSD: userData.totalWinsUSD || 0,
      })

      // Navigate to home
      router.replace('/pwa/home')
    } catch (err) {
      console.error('PWA login error:', err)
      setError('Login failed. Please try again.')
      setIsLoading(false)
    }
  }, [router, setTokens, setUser, logout])

  const handleClearWallet = () => {
    clearStoredWallet()
    logout()
    setHasStoredWallet(false)
    setShowClearConfirm(false)
    setError(null)
  }

  const handleTransferCode = async () => {
    if (transferCode.length !== 8) {
      setTransferError('Code must be 8 characters')
      return
    }

    setTransferLoading(true)
    setTransferError(null)

    try {
      const res = await fetch(`/api/pwa/transfer/${transferCode.toUpperCase()}`)
      const data = await res.json()

      if (!data.success) {
        setTransferError(data.error || 'Invalid or expired code')
        setTransferLoading(false)
        return
      }

      // Store the encrypted wallet data
      const { encryptedData, pwaWallet, mainWallet } = data.data
      storeEncryptedWallet(encryptedData, pwaWallet, mainWallet)

      setTransferSuccess(true)
      setTransferLoading(false)

      // Refresh state after short delay
      setTimeout(() => {
        setHasStoredWallet(true)
        setShowTransferInput(false)
        setTransferSuccess(false)
        setTransferCode('')
      }, 1500)
    } catch (err) {
      console.error('Transfer error:', err)
      setTransferError('Failed to transfer. Try again.')
      setTransferLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse">
          <Gamepad2 className="w-12 h-12 text-accent" />
        </div>
      </div>
    )
  }

  // No stored wallet - need to set up or enter transfer code
  if (!hasStoredWallet) {
    // Show transfer code input
    if (showTransferInput) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
            <Key className="w-8 h-8 text-accent" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2 text-center">
            Enter Transfer Code
          </h1>
          <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
            Enter the 8-character code from Nightly
          </p>

          {transferSuccess ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-green-400 font-medium">Wallet Transferred!</p>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={transferCode}
                onChange={(e) => setTransferCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="XXXXXXXX"
                className="w-full max-w-xs px-4 py-4 bg-black border-2 border-accent/50 rounded-xl text-accent text-center text-3xl font-mono tracking-[0.3em] placeholder:text-gray-600 focus:border-accent focus:outline-none"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />

              {transferError && (
                <p className="mt-3 text-red-400 text-sm">{transferError}</p>
              )}

              <button
                onClick={handleTransferCode}
                disabled={transferCode.length !== 8 || transferLoading}
                className="mt-6 w-full max-w-xs py-3 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {transferLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Transfer Wallet'
                )}
              </button>

              <button
                onClick={() => {
                  setShowTransferInput(false)
                  setTransferCode('')
                  setTransferError(null)
                }}
                className="mt-4 text-text-muted text-xs hover:text-white"
              >
                Back
              </button>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
          <Smartphone className="w-8 h-8 text-accent" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2 text-center">
          PWA Not Set Up
        </h1>
        <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
          Enter your transfer code or set up from Nightly
        </p>

        {/* Transfer Code Button - PRIMARY */}
        <button
          onClick={() => setShowTransferInput(true)}
          className="w-full max-w-xs py-4 bg-gradient-to-r from-accent to-secondary text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-4"
        >
          <Key className="w-5 h-5" />
          Enter Transfer Code
        </button>

        <p className="text-text-muted text-xs mb-6">or</p>

        {/* Setup Instructions */}
        <div className="bg-surface/60 rounded-xl border border-border p-4 mb-6 max-w-xs w-full">
          <h3 className="text-white font-medium text-sm mb-3">How to get a code:</h3>
          <ol className="space-y-2 text-xs text-text-secondary">
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">1.</span>
              <span>Open SuiDex in <strong className="text-white">Nightly</strong> wallet</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">2.</span>
              <span>Go to <strong className="text-white">Profile → PWA Access</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">3.</span>
              <span>Set up PWA (sign + set PIN)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">4.</span>
              <span>Copy the <strong className="text-white">8-character code</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">5.</span>
              <span>Enter it here (within 10 min)</span>
            </li>
          </ol>
        </div>

        <p className="text-text-muted text-[10px] text-center max-w-xs">
          Need 25+ spins to unlock PWA access
        </p>
      </div>
    )
  }

  // Has stored wallet - show PIN login
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/30">
        <Gamepad2 className="w-8 h-8 text-black" />
      </div>

      <h1 className="text-xl font-bold text-white mb-2">Welcome Back</h1>
      <p className="text-text-secondary text-sm mb-8">Enter your PIN to continue</p>

      <PINInput
        length={6}
        onComplete={handlePINSubmit}
        error={error}
        disabled={isLoading}
        autoFocus
      />

      {isLoading && (
        <div className="mt-6 flex items-center gap-2 text-text-secondary text-sm">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span>Authenticating...</span>
        </div>
      )}

      {/* Clear wallet option */}
      <div className="mt-12">
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-text-muted text-xs hover:text-red-400 transition-colors"
          >
            Use a different wallet?
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-xs">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Clear wallet data?</p>
                <p className="text-red-400/70 text-xs mt-1">
                  This will remove your PWA wallet. You'll need to set up again from the web app.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-surface rounded-lg text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWallet}
                className="flex-1 py-2 bg-red-500 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
