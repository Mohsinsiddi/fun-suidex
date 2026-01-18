'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Gamepad2, Check, X, Loader2, Share, Smartphone } from 'lucide-react'
import { storeEncryptedWallet, getStoredWallet, clearStoredWallet } from '@/lib/pwa/encryption'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'

type TransferState = 'checking' | 'not_installed' | 'loading' | 'success' | 'error'

export default function PWATransferPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { logout } = usePWAAuthStore()

  const [state, setState] = useState<TransferState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [pwaWallet, setPwaWallet] = useState<string | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if running as installed PWA (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    setIsStandalone(standalone)

    // If wallet already exists, silently redirect to /pwa
    // This handles the case when user opens app from homescreen after initial setup
    const existing = getStoredWallet()
    if (existing) {
      router.replace('/pwa')
      return
    }

    // If NOT standalone (opened in browser), show "Add to homescreen first" instructions
    if (!standalone) {
      setState('not_installed')
      return
    }

    // If standalone (opened from homescreen) and no wallet, proceed with transfer
    fetchTransferData()
  }, [token, router])

  const fetchTransferData = async () => {
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

      // Store the encrypted wallet data
      const { encryptedData, pwaWallet, mainWallet } = data.data
      storeEncryptedWallet(encryptedData, pwaWallet, mainWallet)
      setPwaWallet(pwaWallet)
      setState('success')

      // Auto-redirect to PIN entry after 2 seconds
      setTimeout(() => {
        router.replace('/pwa')
      }, 2000)
    } catch (err) {
      console.error('Transfer error:', err)
      setError('Failed to transfer wallet data')
      setState('error')
    }
  }

  const formatWallet = (w: string) => `${w.slice(0, 8)}...${w.slice(-6)}`

  // Checking state
  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    )
  }

  // Not installed - Show "Add to Home Screen FIRST" instructions
  if (state === 'not_installed') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
          <Smartphone className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 text-sm font-medium">Add to Home Screen First</span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Almost There!
          </h1>
          <p className="text-text-secondary text-sm mb-6 text-center max-w-xs">
            Add this page to your home screen, then open from there to complete setup.
          </p>

          {isIOS ? (
            <>
              {/* iOS Instructions - Step 1: Share Button */}
              <div className="w-full max-w-sm bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/50 rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Share className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Step 1</p>
                    <p className="text-blue-400 text-sm">Tap Share button below</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="animate-bounce">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                  <div>
                    <p className="text-white text-sm">Scroll down, tap</p>
                    <p className="text-accent font-bold">"Add to Home Screen"</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">3</div>
                  <div>
                    <p className="text-white text-sm">Tap <span className="text-accent font-bold">"Add"</span></p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="w-full max-w-sm bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/50 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Step 4</p>
                    <p className="text-green-400 text-sm">Open app from Home Screen</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Android Instructions */}
              <div className="w-full max-w-sm bg-gradient-to-br from-accent/20 to-secondary/10 border-2 border-accent/50 rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30">
                    <span className="text-black text-2xl font-bold">⋮</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Step 1</p>
                    <p className="text-accent text-sm">Tap menu (⋮) at top right</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                  <div>
                    <p className="text-white text-sm">Tap</p>
                    <p className="text-accent font-bold">"Add to Home screen"</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="w-full max-w-sm bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/50 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Step 3</p>
                    <p className="text-green-400 text-sm">Open app from Home Screen</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="text-text-muted text-xs text-center max-w-xs">
            The transfer will complete automatically when you open from Home Screen.
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Setting Up Wallet</h1>
        <p className="text-text-secondary text-sm">Please wait...</p>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Transfer Failed</h1>
        <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
          {error || 'The transfer link may have expired or already been used.'}
        </p>

        <div className="bg-surface rounded-xl border border-border p-4 max-w-xs w-full mb-6">
          <p className="text-white text-sm font-medium mb-2">What to do:</p>
          <ol className="space-y-2 text-xs text-text-secondary">
            <li className="flex gap-2">
              <span className="text-accent font-bold">1.</span>
              <span>Go back to Nightly wallet</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">2.</span>
              <span>Generate a new transfer link</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">3.</span>
              <span>Open the new link and add to Home Screen</span>
            </li>
          </ol>
        </div>

        <button
          onClick={() => router.push('/pwa')}
          className="text-accent text-sm hover:underline"
        >
          Go to PWA Login
        </button>
      </div>
    )
  }

  // Success state - Auto-redirecting to PIN entry
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
        <Check className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Wallet Ready!</h1>
      {pwaWallet && (
        <p className="text-accent font-mono text-sm mb-4">{formatWallet(pwaWallet)}</p>
      )}

      <p className="text-text-secondary text-sm mb-8">Redirecting to PIN entry...</p>

      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
        <span className="text-text-muted text-xs">Please wait</span>
      </div>
    </div>
  )
}
