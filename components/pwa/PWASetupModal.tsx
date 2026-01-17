'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSignPersonalMessage } from '@mysten/dapp-kit'
import { PINInput } from './PINInput'
import {
  createDerivationMessage,
  derivePWAWallet,
} from '@/lib/pwa/auth'
import {
  encryptWithPIN,
  storeEncryptedWallet,
  storeTokens,
} from '@/lib/pwa/encryption'
import {
  X,
  Smartphone,
  Key,
  Shield,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  Copy,
  ExternalLink,
  Share,
} from 'lucide-react'

interface PWASetupModalProps {
  isOpen: boolean
  onClose: () => void
  wallet: string
  onSuccess: () => void
}

type Step = 'intro' | 'sign' | 'pin' | 'confirm' | 'success'

export function PWASetupModal({
  isOpen,
  onClose,
  wallet,
  onSuccess,
}: PWASetupModalProps) {
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  const [step, setStep] = useState<Step>('intro')
  const [error, setError] = useState<string | null>(null)
  const [derivedSignature, setDerivedSignature] = useState<string | null>(null)
  const [pwaWalletAddress, setPwaWalletAddress] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [transferToken, setTransferToken] = useState<string | null>(null)
  const [transferUrl, setTransferUrl] = useState<string | null>(null)
  const [copiedTransfer, setCopiedTransfer] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  // Detect platform and in-app browser on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      const iOS = /iPad|iPhone|iPod/.test(ua)
      setIsIOS(iOS)

      // Check if in wallet/social app browser
      const inApp = /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Snapchat|TikTok/i.test(ua) ||
        /WebView|wv\)/i.test(ua) ||
        /Nightly|SuiWallet|Suiet|Martian|Petra|Trust/i.test(ua) ||
        (iOS && !/Safari/i.test(ua) && /AppleWebKit/i.test(ua))
      setIsInAppBrowser(inApp)
    }
  }, [])

  const handleClose = () => {
    // Reset state
    setStep('intro')
    setError(null)
    setDerivedSignature(null)
    setPwaWalletAddress(null)
    setPin(null)
    setIsSubmitting(false)
    setTransferToken(null)
    setTransferUrl(null)
    setCopiedTransfer(false)
    onClose()
  }

  const handleSign = useCallback(() => {
    setError(null)
    const message = createDerivationMessage(wallet)

    signMessage(
      { message: new TextEncoder().encode(message) },
      {
        onSuccess: (result) => {
          const sig = result.signature
          setDerivedSignature(sig)

          // Derive PWA wallet
          const { address } = derivePWAWallet(sig)
          setPwaWalletAddress(address)
          setStep('pin')
        },
        onError: (err) => {
          console.error('Signature error:', err)
          setError('Signature rejected. Please try again.')
        },
      }
    )
  }, [wallet, signMessage])

  const handlePINComplete = useCallback((enteredPin: string) => {
    setPin(enteredPin)
    setStep('confirm')
  }, [])

  const handleConfirmPIN = useCallback(async (confirmedPin: string) => {
    if (confirmedPin !== pin) {
      setError('PINs do not match. Please try again.')
      setStep('pin')
      setPin(null)
      return
    }

    if (!derivedSignature || !pwaWalletAddress) {
      setError('Missing signature data. Please start over.')
      setStep('intro')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Derive wallet again to get the seed
      const { seed } = derivePWAWallet(derivedSignature)

      // Encrypt the seed with PIN
      const encrypted = await encryptWithPIN(seed, confirmedPin)

      // Store encrypted wallet locally (for this browser)
      storeEncryptedWallet(encrypted, pwaWalletAddress, wallet)

      // Link PWA wallet on server
      const res = await fetch('/api/pwa/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainWallet: wallet,
          pwaWallet: pwaWalletAddress,
          derivationSignature: derivedSignature,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to link PWA wallet')
        setIsSubmitting(false)
        return
      }

      // Store tokens
      storeTokens(data.data.accessToken, data.data.refreshToken)

      // Create transfer token for Safari/mobile browser
      try {
        const transferRes = await fetch('/api/pwa/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encryptedData: encrypted,
            pwaWallet: pwaWalletAddress,
            mainWallet: wallet,
          }),
        })
        const transferData = await transferRes.json()

        if (transferData.success) {
          setTransferToken(transferData.data.token)
          const baseUrl = window.location.origin
          setTransferUrl(`${baseUrl}/pwa/transfer/${transferData.data.token}`)
        }
      } catch (transferErr) {
        // Transfer token creation failed, but main setup succeeded
        console.error('Failed to create transfer token:', transferErr)
      }

      setStep('success')
      setIsSubmitting(false)
    } catch (err) {
      console.error('PWA setup error:', err)
      setError('Failed to set up PWA. Please try again.')
      setIsSubmitting(false)
    }
  }, [pin, derivedSignature, pwaWalletAddress, wallet])

  const copyPwaWallet = () => {
    if (pwaWalletAddress) {
      navigator.clipboard.writeText(pwaWalletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyTransferUrl = () => {
    if (transferUrl) {
      navigator.clipboard.writeText(transferUrl)
      setCopiedTransfer(true)
      setTimeout(() => setCopiedTransfer(false), 2000)
    }
  }

  const formatWallet = (w: string) => `${w.slice(0, 8)}...${w.slice(-6)}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-accent" />
            PWA Setup
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                Set Up PWA Access
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4 sm:mb-6">
                Play SuiDex Games from your mobile device with a secure PIN-protected wallet.
              </p>

              {/* Steps preview */}
              <div className="bg-background rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-left">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] sm:text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-white text-xs sm:text-sm font-medium">Sign a message</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] sm:text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-white text-xs sm:text-sm font-medium">Set a 6-digit PIN</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] sm:text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-white text-xs sm:text-sm font-medium">Install the PWA</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('sign')}
                className="w-full py-3 bg-accent text-black rounded-xl font-bold text-sm hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sign Step */}
          {step === 'sign' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Key className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Create PWA Wallet
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4">
                Sign to derive your unique PWA wallet. Same signature = same wallet.
              </p>

              {error && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSign}
                disabled={isSigning}
                className="w-full py-2.5 sm:py-3 bg-accent text-black rounded-xl font-bold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isSigning ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </span>
                ) : (
                  'Sign Message'
                )}
              </button>
            </div>
          )}

          {/* PIN Step */}
          {step === 'pin' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Set Your PIN
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4">
                Choose a 6-digit PIN for quick mobile login.
              </p>

              {error && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <PINInput
                length={6}
                onComplete={handlePINComplete}
                error={null}
                autoFocus
              />
            </div>
          )}

          {/* Confirm PIN Step */}
          {step === 'confirm' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Confirm Your PIN
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4">
                Enter your PIN again to confirm.
              </p>

              {error && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <PINInput
                length={6}
                onComplete={handleConfirmPIN}
                error={null}
                disabled={isSubmitting}
                autoFocus
              />

              {isSubmitting && (
                <div className="mt-3 flex items-center justify-center gap-2 text-text-secondary text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up PWA...
                </div>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                PWA Ready!
              </h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-1">
                Your PWA Wallet: <span className="text-accent font-mono">{formatWallet(pwaWalletAddress || '')}</span>
              </p>

              {/* Transfer to Mobile - PROMINENT */}
              {transferToken && transferUrl && (
                <div className="bg-gradient-to-br from-accent/10 to-secondary/10 border-2 border-accent/50 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                      {isIOS ? <Share className="w-4 h-4 text-accent" /> : <Smartphone className="w-4 h-4 text-accent" />}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm">Open on {isIOS ? 'Safari' : 'Mobile'}</p>
                      <p className="text-text-muted text-[10px]">Link expires in 10 minutes</p>
                    </div>
                  </div>

                  {/* Transfer Code - Easy to see */}
                  <div className="bg-black/40 rounded-lg p-3 mb-3">
                    <p className="text-text-muted text-[10px] mb-1">Transfer Code</p>
                    <p className="text-accent font-mono text-2xl font-bold tracking-wider">{transferToken}</p>
                  </div>

                  {/* Copy Link Button */}
                  <button
                    onClick={copyTransferUrl}
                    className="w-full py-2.5 bg-accent text-black rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {copiedTransfer ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Transfer Link
                      </>
                    )}
                  </button>

                  {/* Instructions */}
                  <div className="mt-3 text-left">
                    <p className="text-white text-xs font-medium mb-1.5">Instructions:</p>
                    <ol className="space-y-1 text-text-secondary text-[10px]">
                      {isIOS ? (
                        <>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">1.</span>
                            <span>Copy the link above</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">2.</span>
                            <span>Open <strong className="text-white">Safari</strong> (not this app)</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">3.</span>
                            <span>Paste and go</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">4.</span>
                            <span>Tap Share → Add to Home Screen</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">1.</span>
                            <span>Copy the link above</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">2.</span>
                            <span>Open Chrome on your phone</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">3.</span>
                            <span>Paste and go</span>
                          </li>
                          <li className="flex gap-1.5">
                            <span className="text-accent font-bold">4.</span>
                            <span>Menu → Add to Home screen</span>
                          </li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              )}

              {/* If in-app browser, show extra warning */}
              {isInAppBrowser && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 mb-3 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-400/90 text-[10px] leading-tight">
                      You're in a wallet browser. Copy the link and open in {isIOS ? 'Safari' : 'Chrome'} to install the PWA.
                    </p>
                  </div>
                </div>
              )}

              {/* Done button */}
              <button
                onClick={() => {
                  onSuccess()
                  handleClose()
                }}
                className="w-full py-2.5 bg-surface border border-border text-white rounded-xl font-bold text-xs sm:text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
