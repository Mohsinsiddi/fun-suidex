'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Smartphone,
  Wallet,
  Shield,
  Download,
  ChevronRight,
  Check,
  AlertCircle,
  QrCode,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import { getStoredWallet } from '@/lib/pwa/encryption'
import { usePWAAuthStore } from '@/lib/stores/pwaAuthStore'

export default function PWASetupGuidePage() {
  const router = useRouter()
  const { isAuthenticated } = usePWAAuthStore()
  const [mounted, setMounted] = useState(false)
  const [hasStoredWallet, setHasStoredWallet] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if wallet is already set up
    const stored = getStoredWallet()
    setHasStoredWallet(!!stored)

    // Detect mobile
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setIsMobile(mobile)

    // Check if running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Auto-advance steps based on state
    if (mobile) setCurrentStep(2)
    if (stored) setCurrentStep(4)
  }, [])

  // Redirect if authenticated
  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace('/pwa/game')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse">
          <Smartphone className="w-12 h-12 text-accent" />
        </div>
      </div>
    )
  }

  // Already set up - go to login
  if (hasStoredWallet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-accent/20 rounded-2xl flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2 text-center">
          PWA Already Set Up!
        </h1>
        <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
          Your wallet is configured on this device. Enter your PIN to continue.
        </p>

        <button
          onClick={() => router.push('/pwa')}
          className="w-full max-w-xs py-3 bg-accent text-black rounded-xl font-bold text-sm"
        >
          Go to Login
        </button>
      </div>
    )
  }

  const steps = [
    {
      number: 1,
      title: 'Open on Mobile',
      description: 'Open this page on your mobile phone browser',
      icon: Smartphone,
      isComplete: isMobile,
    },
    {
      number: 2,
      title: 'Connect Wallet',
      description: 'Connect your SUI wallet on mobile',
      icon: Wallet,
      isComplete: false,
    },
    {
      number: 3,
      title: 'Set Up PIN',
      description: 'Create a 6-digit PIN for quick access',
      icon: Shield,
      isComplete: false,
    },
    {
      number: 4,
      title: 'Install PWA',
      description: 'Add to your home screen',
      icon: Download,
      isComplete: isStandalone,
    },
  ]

  return (
    <div className="flex-1 flex flex-col p-6 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Set Up PWA
        </h1>
        <p className="text-text-secondary text-sm">
          Play SuiDex Games from your mobile home screen
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-medium mb-1">
              Important: Device-Specific Setup
            </p>
            <p className="text-amber-400/70 text-xs">
              PWA setup must be done on the device you want to use.
              If you set up on desktop, it won't work on mobile and vice versa.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.number
          const isPast = step.number < currentStep || step.isComplete

          return (
            <div
              key={step.number}
              className={`
                rounded-xl p-4 transition-all
                ${isActive
                  ? 'bg-accent/10 border-2 border-accent'
                  : isPast
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-surface/60 border border-border'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isPast
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-accent text-black'
                      : 'bg-surface text-text-secondary'
                  }
                `}>
                  {isPast ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${isPast || isActive ? 'text-white' : 'text-text-secondary'}`}>
                      Step {step.number}: {step.title}
                    </h3>
                    {isPast && (
                      <span className="text-green-400 text-xs font-medium">Done</span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${isPast || isActive ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action based on current step */}
      {!isMobile && (
        <div className="bg-surface/60 rounded-xl border border-border p-6 text-center">
          <div className="w-32 h-32 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center">
            <QrCode className="w-24 h-24 text-black" />
          </div>
          <p className="text-white text-sm font-medium mb-2">
            Scan to open on mobile
          </p>
          <p className="text-text-muted text-xs mb-4">
            Or manually open <span className="text-accent font-mono">/pwa/setup</span> on your phone
          </p>
          <div className="bg-background rounded-lg p-3">
            <code className="text-accent text-xs break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/pwa/setup` : '/pwa/setup'}
            </code>
          </div>
        </div>
      )}

      {isMobile && !hasStoredWallet && (
        <div className="space-y-4">
          <div className="bg-surface/60 rounded-xl border border-border p-4">
            <h3 className="text-white font-medium text-sm mb-3">
              Next: Connect Your Wallet
            </h3>
            <p className="text-text-secondary text-xs mb-4">
              You need to connect your SUI wallet to complete setup.
              Make sure you have a mobile wallet app installed (Sui Wallet, Suiet, etc.)
            </p>

            <a
              href="/wheel"
              className="w-full py-3 bg-accent text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              Open Web App
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-surface/60 rounded-xl border border-border p-4">
            <h3 className="text-white font-medium text-sm mb-3">
              How to Install PWA (After Setup)
            </h3>
            <div className="space-y-3 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">iOS:</span>
                <span>Safari → Share → Add to Home Screen</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">Android:</span>
                <span>Chrome → Menu (⋮) → Install App</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-text-secondary text-sm hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  )
}
