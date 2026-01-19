'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Gamepad2, Check, X, Loader2, Share } from 'lucide-react'
import { storeEncryptedWallet, getStoredWallet, clearStoredWallet } from '@/lib/pwa/encryption'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'

type TransferState = 'checking' | 'loading' | 'add_to_home' | 'success' | 'error'

export default function PWATransferPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { logout } = usePWAAuthStore()

  const [state, setState] = useState<TransferState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [pwaWallet, setPwaWallet] = useState<string | null>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if running as installed PWA (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    // If wallet already exists, silently redirect to /pwa
    const existing = getStoredWallet()
    if (existing) {
      router.replace('/pwa')
      return
    }

    // Always fetch and consume the token immediately (one-time use security)
    fetchTransferData(standalone)
  }, [token, router])

  const fetchTransferData = async (standalone: boolean) => {
    setState('loading')
    try {
      // Clear any old data first
      clearStoredWallet()
      logout()
      localStorage.removeItem('suidex-pwa-auth')

      const res = await fetch(`/api/pwa/transfer/${token}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Transfer failed')
        setState('error')
        return
      }

      // Store the encrypted wallet data immediately
      const { encryptedData, pwaWallet, mainWallet } = data.data
      storeEncryptedWallet(encryptedData, pwaWallet, mainWallet)
      setPwaWallet(pwaWallet)

      // If standalone (opened from homescreen), go to success and redirect
      if (standalone) {
        setState('success')
        setTimeout(() => {
          router.replace('/pwa')
        }, 1500)
      } else {
        // If in browser, show "Add to Home Screen" instructions
        setState('add_to_home')
      }
    } catch (err) {
      console.error('Transfer error:', err)
      setError('Failed to transfer wallet data')
      setState('error')
    }
  }

  const formatWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-4)}`

  // Checking/Loading state
  if (state === 'checking' || state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Setting Up...</h1>
        <p className="text-text-secondary text-sm">Please wait</p>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Transfer Failed</h1>
        <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
          {error || 'Link expired or already used'}
        </p>

        <div className="bg-surface rounded-xl border border-border p-4 max-w-xs w-full mb-6">
          <p className="text-white text-sm font-medium mb-2">Get a new link:</p>
          <ol className="space-y-1 text-xs text-text-secondary">
            <li>1. Open Nightly wallet</li>
            <li>2. Go to Profile → PWA Access</li>
            <li>3. Generate new transfer link</li>
          </ol>
        </div>

        <button
          onClick={() => router.push('/pwa')}
          className="text-accent text-sm"
        >
          Go to Login
        </button>
      </div>
    )
  }

  // Add to Home Screen instructions (wallet already stored!)
  if (state === 'add_to_home') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-4">
        {/* Success banner */}
        <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Wallet Saved!</span>
          {pwaWallet && (
            <span className="text-green-400/60 font-mono text-xs">{formatWallet(pwaWallet)}</span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Add to Home Screen
          </h1>
          <p className="text-text-secondary text-sm mb-6 text-center max-w-xs">
            Add this app to play anytime
          </p>

          {isIOS ? (
            <>
              {/* iOS: Step 1 - Share */}
              <div className="w-full max-w-sm bg-blue-500/10 border-2 border-blue-500/40 rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <Share className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Step 1</p>
                    <p className="text-blue-400 text-sm">Tap Share button below ↓</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                  <span className="text-white text-sm">Tap <strong className="text-accent">"Add to Home Screen"</strong></span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">3</div>
                  <span className="text-white text-sm">Tap <strong className="text-accent">"Add"</strong></span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="w-full max-w-sm bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-sm font-medium">Open from Home Screen & enter PIN</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Android: Step 1 - Menu */}
              <div className="w-full max-w-sm bg-accent/10 border-2 border-accent/40 rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                    <span className="text-black text-2xl font-bold">⋮</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">Step 1</p>
                    <p className="text-accent text-sm">Tap menu (⋮) top right</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                  <span className="text-white text-sm">Tap <strong className="text-accent">"Add to Home screen"</strong></span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="w-full max-w-sm bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-sm font-medium">Open from Home Screen & enter PIN</span>
                </div>
              </div>
            </>
          )}

          {/* Skip button */}
          <button
            onClick={() => router.push('/pwa')}
            className="text-text-muted text-xs"
          >
            Skip - Continue in browser
          </button>
        </div>
      </div>
    )
  }

  // Success state - redirecting
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
        <Check className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Ready!</h1>
      {pwaWallet && (
        <p className="text-accent font-mono text-sm mb-4">{formatWallet(pwaWallet)}</p>
      )}

      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
        <span className="text-text-muted text-sm">Opening...</span>
      </div>
    </div>
  )
}
