'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
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
import { Gamepad2, AlertTriangle, Trash2, Key, Loader2, Check, Share, Home } from 'lucide-react'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

export default function PWALoginPage() {
  const router = useRouter()
  const { isAuthenticated, setTokens, setUser, logout, isSessionLocked, unlockSession, setSpins } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [hasStoredWallet, setHasStoredWallet] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // PWA detection
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  // Transfer code entry
  const [transferCode, setTransferCode] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = getStoredWallet()
    setHasStoredWallet(!!stored)

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Detect standalone mode (opened from homescreen)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)
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

      // Check if this is a locked session (returning user) or new login
      if (isSessionLocked) {
        // Session was locked due to visibility change
        // Unlock and fetch fresh data
        unlockSession()

        // Fetch fresh user data
        try {
          const meRes = await pwaFetch('/api/auth/me')
          const meData = await meRes.json()
          if (meData.success) {
            const userData = meData.data
            setSpins(
              {
                free: userData.freeSpins || 0,
                purchased: userData.purchasedSpins || 0,
                bonus: userData.bonusSpins || 0,
              },
              {
                totalSpins: userData.totalSpins || 0,
                totalWinsUSD: userData.totalWinsUSD || 0,
              }
            )
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch fresh data after unlock:', fetchErr)
        }

        // Navigate to home
        router.replace('/pwa/home')
        return
      }

      // New login - authenticate with backend
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
  }, [router, setTokens, setUser, logout, isSessionLocked, unlockSession, setSpins])

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

      // Clear any existing wallet data before storing new one
      // This ensures clean slate for new transfer
      clearStoredWallet()
      logout()

      // Clear Zustand persisted storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('suidex-pwa-auth')
      }

      // Store the encrypted wallet data
      const { encryptedData, pwaWallet, mainWallet } = data.data
      storeEncryptedWallet(encryptedData, pwaWallet, mainWallet)

      setTransferSuccess(true)
      setTransferLoading(false)

      // Refresh state after short delay
      setTimeout(() => {
        setHasStoredWallet(true)
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

  // No stored wallet - show different screens based on context
  if (!hasStoredWallet) {
    // STANDALONE (opened from Home Screen) - Show transfer code entry
    if (isStandalone) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
            <Key className="w-8 h-8 text-accent" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2 text-center">
            Enter Transfer Code
          </h1>
          <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
            Enter the 8-character code from your wallet browser
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

              {/* How to get a code */}
              <div className="mt-6 bg-surface/40 rounded-xl border border-border/50 p-3 max-w-xs w-full">
                <p className="text-text-muted text-[10px] text-center">
                  Get code from <strong className="text-white">Nightly → Profile → PWA Access</strong>
                </p>
              </div>
            </>
          )}
        </div>
      )
    }

    // IN BROWSER - Show "Add to Home Screen" instructions only
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="w-16 h-16 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/30">
          <Gamepad2 className="w-8 h-8 text-black" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">Install SuiDex Games</h1>
        <p className="text-text-secondary text-sm text-center mb-8 max-w-xs">
          Add to your Home Screen to continue
        </p>

        {/* Add to Home Screen Instructions */}
        <div className="bg-surface/60 rounded-2xl border border-border p-5 max-w-xs w-full">
          {isIOS ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm">1</span>
                <span className="text-white text-sm">Tap <strong className="text-accent">⋯</strong> (bottom right)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm">2</span>
                <span className="text-white text-sm flex items-center gap-1">Tap <strong className="text-accent">Share</strong> <Share className="w-4 h-4 text-accent" /></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm">3</span>
                <span className="text-white text-sm">Tap <strong className="text-accent">⋯</strong> (in share menu)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">4</span>
                <span className="text-white text-sm">Tap <strong className="text-green-400">Add to Home Screen</strong></span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm">1</span>
                <span className="text-white text-sm">Tap <strong className="text-accent">⋮</strong> menu (top right)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">2</span>
                <span className="text-white text-sm">Tap <strong className="text-green-400">Add to Home screen</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Open from Home Screen note */}
        <div className="mt-6 flex items-center gap-2 text-text-muted text-xs">
          <Home className="w-4 h-4" />
          <span>Then open from Home Screen</span>
        </div>

        {/* Where to get code info */}
        <div className="mt-6 bg-surface/40 rounded-xl border border-border/50 p-3 max-w-xs w-full text-center">
          <p className="text-text-muted text-[10px]">
            You'll enter your transfer code after opening from Home Screen
          </p>
          <p className="text-text-muted/60 text-[9px] mt-1">
            Get code from <strong className="text-white">Nightly → Profile → PWA Access</strong>
          </p>
        </div>
      </div>
    )
  }

  // Has stored wallet - show PIN login
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/30">
        <Gamepad2 className="w-8 h-8 text-black" />
      </div>

      <h1 className="text-xl font-bold text-white mb-2">
        {isSessionLocked ? 'Session Locked' : 'Welcome Back'}
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        {isSessionLocked
          ? 'Enter your PIN to unlock'
          : 'Enter your PIN to continue'}
      </p>

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
