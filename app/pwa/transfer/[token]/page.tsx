'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Gamepad2, Check, X, Loader2, Share, Download, AlertCircle } from 'lucide-react'
import { storeEncryptedWallet, getStoredWallet, clearStoredWallet } from '@/lib/pwa/encryption'

type TransferState = 'loading' | 'success' | 'error' | 'already_setup'

export default function PWATransferPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [state, setState] = useState<TransferState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [pwaWallet, setPwaWallet] = useState<string | null>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already has wallet stored
    const existing = getStoredWallet()
    if (existing) {
      setState('already_setup')
      return
    }

    // Fetch transfer data
    fetchTransferData()
  }, [token])

  const fetchTransferData = async () => {
    try {
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
    } catch (err) {
      console.error('Transfer error:', err)
      setError('Failed to transfer wallet data')
      setState('error')
    }
  }

  const formatWallet = (w: string) => `${w.slice(0, 8)}...${w.slice(-6)}`

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Transferring Wallet</h1>
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
              <span>Go back to the wallet app (Nightly)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">2.</span>
              <span>Generate a new transfer link</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">3.</span>
              <span>Open the new link in Safari within 10 minutes</span>
            </li>
          </ol>
        </div>

        <button
          onClick={() => router.push('/pwa')}
          className="text-accent text-sm hover:underline"
        >
          Go to PWA Home
        </button>
      </div>
    )
  }

  // Already setup
  if (state === 'already_setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Already Set Up</h1>
        <p className="text-text-secondary text-sm text-center mb-4 max-w-xs">
          This browser already has a PWA wallet configured.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => router.push('/pwa')}
            className="w-full py-3 bg-accent text-black rounded-xl font-bold text-sm"
          >
            Go to PWA Login
          </button>

          <button
            onClick={() => {
              clearStoredWallet()
              window.location.reload()
            }}
            className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl font-medium text-sm"
          >
            Clear & Try Again
          </button>

          <div className="bg-surface border border-border rounded-xl p-3 mt-4">
            <p className="text-text-muted text-[10px] text-center">
              <strong className="text-white">Note:</strong> Transfer links are one-time use. If clearing doesn't work, generate a new link from Nightly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success state - Focus entirely on Add to Home Screen
  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      {/* Success badge - small */}
      <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-green-400 text-sm font-medium">Wallet Ready!</span>
        {pwaWallet && (
          <span className="text-green-400/60 font-mono text-xs">{formatWallet(pwaWallet)}</span>
        )}
      </div>

      {/* Main focus - Add to Home Screen */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isIOS ? (
          <>
            {/* iOS Instructions - BIG and CLEAR */}
            <h1 className="text-2xl font-bold text-white mb-2 text-center">
              Now Add to Home Screen
            </h1>
            <p className="text-text-secondary text-sm mb-8 text-center">
              This creates an app icon on your phone
            </p>

            {/* Step 1 - The Share Button */}
            <div className="w-full max-w-sm bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/50 rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Share className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Step 1</p>
                  <p className="text-blue-400 text-sm">Tap the Share button</p>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-3 flex items-center justify-center gap-2">
                <span className="text-text-secondary text-xs">Look for this icon</span>
                <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <Share className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-text-secondary text-xs">at the bottom of Safari</span>
              </div>
              {/* Arrow pointing down */}
              <div className="flex justify-center mt-4">
                <div className="animate-bounce">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                <div>
                  <p className="text-white text-sm">Scroll down, tap</p>
                  <p className="text-accent font-bold">"Add to Home Screen"</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">3</div>
                <div>
                  <p className="text-white text-sm">Tap</p>
                  <p className="text-accent font-bold">"Add"</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Android Instructions */}
            <h1 className="text-2xl font-bold text-white mb-2 text-center">
              Now Add to Home Screen
            </h1>
            <p className="text-text-secondary text-sm mb-8 text-center">
              This creates an app icon on your phone
            </p>

            {/* Step 1 - Menu Button */}
            <div className="w-full max-w-sm bg-gradient-to-br from-accent/20 to-secondary/10 border-2 border-accent/50 rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30">
                  <span className="text-black text-3xl font-bold">⋮</span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Step 1</p>
                  <p className="text-accent text-sm">Tap the menu button</p>
                </div>
              </div>
              <div className="bg-black/40 rounded-xl p-3 text-center">
                <span className="text-text-secondary text-xs">Look for <strong className="text-white">⋮</strong> or <strong className="text-white">⋯</strong> at the top right of Chrome</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold">2</div>
                <div>
                  <p className="text-white text-sm">Tap</p>
                  <p className="text-accent font-bold">"Add to Home screen"</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Done button */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => router.push('/pwa')}
            className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Done - I've Added It
          </button>

          <p className="text-text-muted text-[10px] text-center">
            After adding, open the app from your home screen and enter your PIN.
          </p>
        </div>
      </div>
    </div>
  )
}
