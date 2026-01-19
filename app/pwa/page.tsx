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
import { Gamepad2, AlertTriangle, Trash2, Key, Loader2, Check, Share, ChevronDown } from 'lucide-react'
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
  const [isSamsung, setIsSamsung] = useState(false)

  // Transfer code entry
  const [transferCode, setTransferCode] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState(false)

  // Expanded step for details
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const stored = getStoredWallet()
    setHasStoredWallet(!!stored)

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Detect Samsung
    const samsung = /Samsung/i.test(navigator.userAgent)
    setIsSamsung(samsung)

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
        unlockSession()
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
        router.replace('/pwa/home')
        return
      }

      // New login - authenticate with backend
      const keypair = Ed25519Keypair.deriveKeypairFromSeed(privateKey)
      const pwaWallet = keypair.getPublicKey().toSuiAddress()

      const timestamp = Date.now()
      const message = createPWAAuthMessage(pwaWallet, timestamp)
      const messageBytes = new TextEncoder().encode(message)
      const signedMessage = await keypair.signPersonalMessage(messageBytes)
      const signatureBase64 = signedMessage.signature

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

      storeTokens(data.data.accessToken, data.data.refreshToken)
      setTokens(data.data.accessToken, data.data.refreshToken)
      const userData = data.data.user
      setUser({
        wallet: userData.wallet,
        pwaWallet: data.data.pwaWallet,
        purchasedSpins: userData.purchasedSpins || 0,
        bonusSpins: userData.bonusSpins || 0,
        totalSpins: userData.totalSpins || 0,
        totalWinsUSD: userData.totalWinsUSD || 0,
      })

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

      clearStoredWallet()
      logout()

      if (typeof window !== 'undefined') {
        localStorage.removeItem('suidex-pwa-auth')
      }

      const { encryptedData, pwaWallet, mainWallet } = data.data
      storeEncryptedWallet(encryptedData, pwaWallet, mainWallet)

      setTransferSuccess(true)
      setTransferLoading(false)

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
            Enter the 8-character code from your desktop browser
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
                className="w-full max-w-xs px-4 py-4 bg-black border-2 border-accent/50 rounded-xl text-accent text-center text-2xl font-mono tracking-[0.2em] placeholder:text-gray-600 focus:border-accent focus:outline-none"
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
                    Verifying...
                  </>
                ) : (
                  'Continue'
                )}
              </button>

              <p className="mt-4 text-text-muted text-xs text-center max-w-xs">
                Get code from <strong className="text-white">Profile → PWA Access</strong> on web
              </p>
            </>
          )}
        </div>
      )
    }

    // IN BROWSER - Expandable steps with details
    const toggleStep = (step: number) => {
      setExpandedStep(expandedStep === step ? null : step)
    }

    // iOS Steps with detailed instructions
    const iosSteps = [
      {
        num: 1,
        title: 'Tap Share',
        icon: <Share className="w-4 h-4" />,
        color: 'blue',
        details: [
          'Look at the bottom of Safari',
          'Find the Share icon (square with arrow ↑)',
          'It\'s in the center of the bottom toolbar',
        ],
      },
      {
        num: 2,
        title: 'Add to Home Screen',
        icon: <span className="text-sm font-bold">+</span>,
        color: 'accent',
        details: [
          'A menu will slide up from the bottom',
          'Scroll DOWN in this menu',
          'Look for "Add to Home Screen" with a + icon',
          'If you don\'t see it, tap "Edit Actions" at the bottom',
        ],
      },
      {
        num: 3,
        title: 'Tap Add',
        icon: <Check className="w-4 h-4" />,
        color: 'accent',
        details: [
          'You can edit the app name if you want',
          'Tap "Add" in the top right corner',
          'The app icon will be added to your Home Screen',
        ],
      },
      {
        num: 4,
        title: 'Open from Home Screen',
        icon: <Gamepad2 className="w-4 h-4" />,
        color: 'green',
        details: [
          'Go to your Home Screen (where all app icons are)',
          'Find the SuiDex Games icon',
          'Tap it to open the app',
          'Then enter your transfer code',
        ],
      },
    ]

    // Android Steps with detailed instructions
    const androidSteps = [
      {
        num: 1,
        title: 'Tap Menu ⋮',
        icon: <span className="text-sm font-bold">⋮</span>,
        color: 'accent',
        details: [
          'Look at the top right corner of Chrome',
          'Tap the three dots (⋮) menu icon',
          'A dropdown menu will appear',
        ],
      },
      {
        num: 2,
        title: isSamsung ? 'Add page to' : 'Add to Home screen',
        icon: <span className="text-sm font-bold">+</span>,
        color: 'accent',
        details: isSamsung
          ? [
              'Scroll down in the menu',
              'Tap "Add page to"',
              'Select "Home screen" from the options',
            ]
          : [
              'Scroll down in the dropdown menu',
              'Tap "Add to Home screen"',
              'Or look for "Install app" option',
            ],
      },
      {
        num: 3,
        title: 'Tap Add',
        icon: <Check className="w-4 h-4" />,
        color: 'accent',
        details: [
          'A confirmation popup will appear',
          'You can edit the app name',
          'Tap "Add" to confirm',
        ],
      },
      {
        num: 4,
        title: 'Open from Home Screen',
        icon: <Gamepad2 className="w-4 h-4" />,
        color: 'green',
        details: [
          'Go to your Home Screen (where all app icons are)',
          'Find the SuiDex Games icon',
          'Tap it to open the app',
          'Then enter your transfer code',
        ],
      },
    ]

    const steps = isIOS ? iosSteps : androidSteps

    return (
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Header */}
        <div className="text-center pt-2 pb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent to-secondary rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-accent/20">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-lg font-bold text-white">Install SuiDex Games</h1>
          <p className="text-text-secondary text-xs">Tap each step for details</p>
        </div>

        {/* Steps */}
        <div className="space-y-2 flex-1">
          {steps.map((step) => {
            const isExpanded = expandedStep === step.num
            const bgClass = step.color === 'blue'
              ? 'bg-blue-500/10 border-blue-500/30'
              : step.color === 'green'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-surface border-border'
            const iconBgClass = step.color === 'blue'
              ? 'bg-blue-500 text-white'
              : step.color === 'green'
                ? 'bg-green-500 text-white'
                : 'bg-accent/20 text-accent'
            const textColor = step.color === 'blue'
              ? 'text-blue-400'
              : step.color === 'green'
                ? 'text-green-400'
                : 'text-accent'

            return (
              <div key={step.num} className={`rounded-xl border overflow-hidden ${bgClass}`}>
                <button
                  onClick={() => toggleStep(step.num)}
                  className="w-full p-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                    {step.icon}
                  </div>
                  <p className="text-white text-sm flex-1 text-left">
                    <span className="font-bold">{step.num}.</span>{' '}
                    <strong className={textColor}>{step.title}</strong>
                  </p>
                  <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-black/30 rounded-lg p-2.5 space-y-1.5">
                      {step.details.map((detail, idx) => (
                        <p key={idx} className="text-text-secondary text-xs flex items-start gap-2">
                          <span className="text-accent">•</span>
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-3 bg-surface/60 rounded-xl p-3 text-center">
          <p className="text-text-secondary text-xs">
            After opening, enter your <strong className="text-white">transfer code</strong>
          </p>
          <p className="text-text-muted text-[10px] mt-1">
            Get code from Profile → PWA Access
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
                  You'll need a new transfer code from the web app.
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
