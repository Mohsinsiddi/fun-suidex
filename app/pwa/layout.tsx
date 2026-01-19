'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'
import { Gamepad2, Download, Share, Check, Smartphone, ArrowDown, ExternalLink, Copy } from 'lucide-react'

// Minimum time in background before requiring PIN re-auth (30 seconds)
const LOCK_AFTER_MS = 30 * 1000

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallStep = 'detect' | 'install' | 'confirm' | 'ready'

export default function PWALayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, lockSession, updateLastActive, isSessionLocked } = usePWAAuthStore()

  // Track when user went to background
  const hiddenAtRef = useRef<number | null>(null)

  // Install state
  const [installStep, setInstallStep] = useState<InstallStep>('detect')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  // Visibility change detection - lock session when app goes to background
  useEffect(() => {
    if (!mounted) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from app - record time
        hiddenAtRef.current = Date.now()
      } else {
        // User came back to app
        const hiddenAt = hiddenAtRef.current
        hiddenAtRef.current = null

        // If was authenticated and hidden for more than LOCK_AFTER_MS, lock session
        if (hiddenAt && isAuthenticated && Date.now() - hiddenAt > LOCK_AFTER_MS) {
          console.log('Session locked due to inactivity')
          lockSession()
          // Don't redirect here - let the pages handle it
        } else if (isAuthenticated) {
          // Update last active time
          updateLastActive()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mounted, isAuthenticated, lockSession, updateLastActive])

  // Redirect to login when session is locked
  useEffect(() => {
    if (mounted && isSessionLocked && pathname !== '/pwa') {
      router.replace('/pwa')
    }
  }, [mounted, isSessionLocked, pathname, router])

  useEffect(() => {
    setMounted(true)
    setCurrentUrl(window.location.href)

    // Check if already installed as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true // iOS Safari

    if (isStandalone) {
      setInstallStep('ready')
      return
    }

    // Check if user already confirmed install
    const hasConfirmed = localStorage.getItem('pwa-install-confirmed')
    if (hasConfirmed) {
      setInstallStep('ready')
      return
    }

    // Detect platform
    const userAgent = navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(userAgent)
    const android = /Android/.test(userAgent)
    setIsIOS(iOS)
    setIsAndroid(android)

    // Detect in-app browsers (wallet dApp browsers, social media apps, etc.)
    const inAppBrowser =
      /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Snapchat|TikTok/i.test(userAgent) || // Social apps
      /WebView|wv\)/i.test(userAgent) || // Generic WebView
      /Nightly|SuiWallet|Suiet|Martian|Petra|Trust/i.test(userAgent) || // Wallet apps
      (iOS && !/Safari/i.test(userAgent) && /AppleWebKit/i.test(userAgent)) // iOS in-app browser (has WebKit but not Safari)

    setIsInAppBrowser(inAppBrowser)

    // Listen for install prompt (Chrome/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Show install screen
    setInstallStep('install')

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (installPrompt) {
      // Chrome/Android - trigger native prompt
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallStep('ready')
        localStorage.setItem('pwa-install-confirmed', 'true')
      }
    } else {
      // iOS or Android manual - user confirms they've added
      localStorage.setItem('pwa-install-confirmed', 'true')
      setInstallStep('ready')
    }
  }, [installPrompt])

  const handleConfirmInstall = () => {
    localStorage.setItem('pwa-install-confirmed', 'true')
    setInstallStep('ready')
  }

  const [copied, setCopied] = useState(false)
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = currentUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Loading state
  if (!mounted || installStep === 'detect') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Gamepad2 className="w-12 h-12 text-accent" />
        </div>
      </div>
    )
  }

  // In-app browser warning - need to open in real browser
  if (installStep === 'install' && isInAppBrowser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
            <ExternalLink className="w-10 h-10 text-amber-400" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2 text-center">
            Open in {isIOS ? 'Safari' : 'Chrome'}
          </h1>
          <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
            PWA installation requires {isIOS ? 'Safari' : 'Chrome'} browser.
            You're currently in an in-app browser.
          </p>

          {/* Instructions */}
          <div className="w-full max-w-sm bg-surface rounded-xl border border-border p-4 mb-6">
            <p className="text-white font-medium text-sm mb-3">How to open in {isIOS ? 'Safari' : 'Chrome'}:</p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">1</span>
                <span className="text-text-secondary text-sm">Copy the link below</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">2</span>
                <span className="text-text-secondary text-sm">Open <strong className="text-white">{isIOS ? 'Safari' : 'Chrome'}</strong> app</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">3</span>
                <span className="text-text-secondary text-sm">Paste the link and go</span>
              </li>
            </ol>
          </div>

          {/* Copy URL */}
          <div className="w-full max-w-sm space-y-3">
            <div className="bg-background rounded-xl border border-border p-3">
              <p className="text-text-muted text-[10px] mb-1">Link to copy:</p>
              <p className="text-accent text-xs font-mono break-all">{currentUrl}</p>
            </div>

            <button
              onClick={copyUrl}
              className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Link
                </>
              )}
            </button>

            <button
              onClick={handleConfirmInstall}
              className="w-full py-2.5 text-text-muted text-xs hover:text-accent transition-colors"
            >
              Continue anyway (PWA won't install)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Install screen - blocks access until installed
  if (installStep === 'install') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-accent/30">
            <Gamepad2 className="w-10 h-10 text-black" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Install SuiDex Games
          </h1>
          <p className="text-text-secondary text-sm text-center mb-8 max-w-xs">
            Add to your home screen for the best experience
          </p>

          {/* Platform-specific instructions */}
          <div className="w-full max-w-sm space-y-4 mb-8">
            {isIOS ? (
              // iOS Instructions
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Share className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Safari Instructions</p>
                    <p className="text-text-muted text-xs">Follow these steps</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">1</span>
                    <span className="text-text-secondary text-sm">Tap the <Share className="w-4 h-4 inline text-blue-400" /> Share button at the bottom</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">2</span>
                    <span className="text-text-secondary text-sm">Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">3</span>
                    <span className="text-text-secondary text-sm">Tap <strong className="text-white">"Add"</strong> in the top right</span>
                  </li>
                </ol>
              </div>
            ) : isAndroid ? (
              // Android Instructions
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Chrome Instructions</p>
                    <p className="text-text-muted text-xs">Quick install</p>
                  </div>
                </div>
                {installPrompt ? (
                  <p className="text-text-secondary text-sm mb-4">
                    Tap the button below to install the app directly.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">1</span>
                      <span className="text-text-secondary text-sm">Tap the <strong className="text-white">⋮</strong> menu (top right)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">2</span>
                      <span className="text-text-secondary text-sm">Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong></span>
                    </li>
                  </ol>
                )}
              </div>
            ) : (
              // Desktop/Other
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Mobile Recommended</p>
                    <p className="text-text-muted text-xs">Best on phone</p>
                  </div>
                </div>
                <p className="text-text-secondary text-sm">
                  For the best experience, open this page on your mobile phone and add to home screen.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="w-full max-w-sm space-y-3">
            {installPrompt ? (
              // Android/Chrome - can trigger native install
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-gradient-to-r from-accent to-secondary text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install App Now
              </button>
            ) : isIOS ? (
              // iOS - manual install required
              <>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-2">
                  <p className="text-amber-400 text-xs text-center">
                    <strong>Important:</strong> Complete the steps above first, then tap the button below.
                  </p>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  I've Added to Home Screen
                </button>
                <button
                  onClick={handleConfirmInstall}
                  className="w-full py-2.5 text-text-muted text-xs hover:text-accent transition-colors"
                >
                  Skip for now (not recommended)
                </button>
              </>
            ) : isAndroid ? (
              // Android without prompt - manual install
              <>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-2">
                  <p className="text-amber-400 text-xs text-center">
                    <strong>Important:</strong> Complete the steps above first, then tap the button below.
                  </p>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  I've Added to Home Screen
                </button>
                <button
                  onClick={handleConfirmInstall}
                  className="w-full py-2.5 text-text-muted text-xs hover:text-accent transition-colors"
                >
                  Skip for now (not recommended)
                </button>
              </>
            ) : (
              // Desktop
              <button
                onClick={handleConfirmInstall}
                className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm"
              >
                Continue to PWA
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Confirm screen - verify user actually installed
  if (installStep === 'confirm') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-accent" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2 text-center">
            Did you add to Home Screen?
          </h1>
          <p className="text-text-secondary text-sm text-center mb-8 max-w-xs">
            {isIOS
              ? "After adding, you can open the app from your home screen for the best experience."
              : "After installing, you can open the app from your home screen."
            }
          </p>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={handleConfirmInstall}
              className="w-full py-3.5 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Yes, I've Added It
            </button>

            <button
              onClick={() => setInstallStep('install')}
              className="w-full py-3 bg-surface border border-border text-white rounded-xl font-medium text-sm"
            >
              Go Back to Instructions
            </button>
          </div>

          <p className="mt-6 text-text-muted text-xs text-center max-w-xs">
            Tip: After adding, open the app from your home screen. It will look and feel like a native app!
          </p>
        </div>
      </div>
    )
  }

  // Ready - show normal PWA
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal PWA Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border/50">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
              <Gamepad2 className="w-4 h-4 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold leading-tight">
                <span className="text-accent">Sui</span>
                <span className="text-white">Dex</span>
              </span>
              <span className="text-[8px] text-text-muted uppercase tracking-widest">PWA</span>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Safe area padding for mobile */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  )
}
