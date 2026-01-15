'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import Link from 'next/link'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { ReferralStats, ReferralEarningsTable, ShareButtons } from '@/components/referral'
import { Users, Copy, Check, ArrowLeft, Lock, Loader2 } from 'lucide-react'

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

  useEffect(() => {
    if (account?.address) {
      checkAuthAndEligibility()
    } else {
      setIsAuthenticated(false)
      setEligible(false)
      setLoading(false)
    }
  }, [account?.address])

  const checkAuthAndEligibility = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      
      if (meData.success) {
        setIsAuthenticated(true)
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
      
      <main className="flex-1 p-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30">
              <Users size={32} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Referral Program</h1>
              <p className="text-text-secondary">Earn 10% of your friends' winnings forever!</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : !account ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Connect Your Wallet</h2>
              <p className="text-text-secondary mb-6">Connect your wallet to access the referral program</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Sign In Required</h2>
              <p className="text-text-secondary mb-6">Sign a message to verify your wallet and access referrals</p>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button onClick={handleSignIn} disabled={authLoading || isSigning} className="px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors">
                {authLoading || isSigning ? 'Signing...' : 'Sign to Continue'}
              </button>
            </div>
          ) : !eligible ? (
            <div className="p-8 sm:p-12 rounded-2xl text-center bg-surface border border-border">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Complete Your First Spin</h2>
              <p className="text-text-secondary mb-6">Spin the wheel once to unlock your referral link!</p>
              <Link href="/wheel" className="inline-flex px-8 py-3 rounded-xl font-semibold bg-accent text-black hover:bg-accent-hover transition-colors">
                Go to Wheel
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <ReferralStats />

              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-lg font-bold mb-4 text-white">Your Referral Link</h2>
                <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-background border border-border">
                  <input type="text" value={referralLink} readOnly className="flex-1 bg-transparent outline-none text-white font-mono text-sm" />
                  <button onClick={handleCopy} className={`p-3 rounded-lg transition-all ${copied ? 'bg-green-500' : 'bg-accent'} text-black`}>
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <ShareButtons referralLink={referralLink} />
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h2 className="text-lg font-bold mb-4 text-white">Your Earnings</h2>
                <ReferralEarningsTable />
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/30">
                <h3 className="font-bold mb-3 text-accent">How it works</h3>
                <ol className="space-y-2 text-sm text-text-secondary">
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">1</span>Share your referral link with friends</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">2</span>They sign up and spin the wheel</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">3</span>You automatically earn 10% of every prize they win!</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">4</span>Tweet to claim each reward</li>
                  <li className="flex gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">5</span>Get paid weekly in Victory tokens</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
