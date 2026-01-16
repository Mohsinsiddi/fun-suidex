'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage, ConnectButton } from '@mysten/dapp-kit'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { ReferralStats, ReferralEarningsTable, ShareButtons } from '@/components/referral'
import { Users, Copy, Check, ArrowLeft, Lock, Loader2, Wallet } from 'lucide-react'
import { ReferralBanner } from '@/components/referral'

export default function ReferralPage() {
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referredBy, setReferredBy] = useState<string | null>(null)

  useEffect(() => {
    if (account?.address) {
      checkAuthAndEligibility()
    } else {
      setIsAuthenticated(false)
      setEligible(false)
      setReferredBy(null)
      setLoading(false)
    }
  }, [account?.address])

  const checkAuthAndEligibility = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()

      if (meData.success) {
        setIsAuthenticated(true)
        setReferredBy(meData.data.referredBy || null)

        if (meData.data.hasCompletedFirstSpin) {
          const linkRes = await fetch('/api/referral/link')
          const linkData = await linkRes.json()
          if (linkData.success) {
            setReferralLink(linkData.data.link)
            setEligible(true)
          }
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!account?.address) return
    setAuthLoading(true)
    setError(null)
    
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: account.address }),
      })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)

      signMessage(
        { message: new TextEncoder().encode(nonceData.data.nonce) },
        {
          onSuccess: async (sig) => {
            const verifyRes = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: account.address, signature: sig.signature, nonce: nonceData.data.nonce }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setIsAuthenticated(true)
              checkAuthAndEligibility()
            } else {
              setError(verifyData.error || 'Verification failed')
            }
            setAuthLoading(false)
          },
          onError: () => {
            setError('Signature rejected')
            setAuthLoading(false)
          },
        }
      )
    } catch (err: any) {
      setError(err.message)
      setAuthLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 sm:mb-6 text-text-secondary hover:text-white transition-colors min-h-[44px]">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="text-sm">Back to Home</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/30 flex-shrink-0">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Referral Program</h1>
              <p className="text-text-secondary text-xs sm:text-sm md:text-base">Earn 10% of your friends' winnings forever!</p>
            </div>
          </div>

          {/* Referred By Banner - Show if user joined via referral */}
          {referredBy && isAuthenticated && (
            <ReferralBanner
              referrerWallet={referredBy}
              isLinked={true}
              onClose={() => setReferredBy(null)}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : !account ? (
            <div className="p-6 sm:p-8 md:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 text-white">Connect Your Wallet</h2>
              <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">Connect your wallet to access the referral program and start earning</p>
              <div className="inline-block connect-button-cta">
                <ConnectButton connectText="Connect Wallet" />
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="p-6 sm:p-8 md:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 text-white">Sign to Claim Benefits</h2>
              <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">Verify your wallet to unlock referral earnings and rewards</p>
              {error && <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>}
              <button
                onClick={handleSignIn}
                disabled={authLoading || isSigning}
                className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {authLoading || isSigning ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </span>
                ) : (
                  'Sign to Claim Benefits'
                )}
              </button>
            </div>
          ) : !eligible ? (
            <div className="p-6 sm:p-8 md:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 text-white">Complete Your First Spin</h2>
              <p className="text-text-secondary text-sm sm:text-base mb-4 sm:mb-6">Spin the wheel once to unlock your referral link!</p>
              <Link
                href="/wheel"
                className="inline-flex px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base bg-accent text-black hover:bg-accent-hover transition-colors min-h-[44px]"
              >
                Go to Wheel
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <ReferralStats />

              <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white">Your Referral Link</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 mb-4 rounded-xl bg-background border border-border">
                  <input type="text" value={referralLink} readOnly className="flex-1 bg-transparent outline-none text-white font-mono text-xs sm:text-sm min-w-0 truncate" />
                  <button onClick={handleCopy} className={`p-2.5 sm:p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500' : 'bg-accent'} text-black flex-shrink-0`}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <span className="sm:hidden text-sm font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <ShareButtons referralLink={referralLink} />
              </div>

              <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white">Your Earnings</h2>
                <ReferralEarningsTable />
              </div>

              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/30">
                <h3 className="font-bold mb-3 text-sm sm:text-base text-accent">How it works</h3>
                <ol className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-text-secondary">
                  <li className="flex gap-2 sm:gap-3 items-start"><span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] sm:text-xs">1</span><span>Share your referral link with friends</span></li>
                  <li className="flex gap-2 sm:gap-3 items-start"><span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] sm:text-xs">2</span><span>They sign up and spin the wheel</span></li>
                  <li className="flex gap-2 sm:gap-3 items-start"><span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] sm:text-xs">3</span><span>You automatically earn 10% of every prize they win!</span></li>
                  <li className="flex gap-2 sm:gap-3 items-start"><span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] sm:text-xs">4</span><span>Tweet to claim each reward</span></li>
                  <li className="flex gap-2 sm:gap-3 items-start"><span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-[10px] sm:text-xs">5</span><span>Get paid weekly in Victory tokens</span></li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Connect button CTA styling */}
      <style jsx global>{`
        .connect-button-cta button {
          padding: 0.75rem 2rem !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          border-radius: 0.75rem !important;
          background: #22c55e !important;
          border: none !important;
          color: black !important;
          transition: all 0.15s ease !important;
          box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3) !important;
        }
        .connect-button-cta button:hover {
          background: #16a34a !important;
          box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>
    </div>
  )
}
