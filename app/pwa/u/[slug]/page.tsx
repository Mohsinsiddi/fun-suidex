'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import {
  ChevronLeft,
  User,
  Trophy,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  CircleDot,
  History,
  Search,
  Settings,
  Calendar,
} from 'lucide-react'

interface UserProfile {
  wallet: string
  slug: string | null
  totalSpins: number
  totalWinsUSD: number
  joinedAt: string
}

export default function PWAUserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const slug = params.slug as string

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Fetch user profile
  useEffect(() => {
    if (mounted && isAuthenticated && slug) {
      fetchProfile()
    }
  }, [mounted, isAuthenticated, slug])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await pwaFetch(`/api/users/${encodeURIComponent(slug)}`)
      const data = await res.json()

      if (data.success) {
        setProfile(data.data)
      } else {
        setError(data.error || 'User not found')
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('Failed to load profile')
    }

    setLoading(false)
  }

  const formatWallet = (w: string) => {
    return `${w.slice(0, 6)}...${w.slice(-4)}`
  }

  const copyWallet = () => {
    if (profile?.wallet) {
      navigator.clipboard.writeText(profile.wallet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Player Profile</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <User className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-white font-medium mb-2">User Not Found</p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <Link
            href="/pwa/search"
            className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium"
          >
            Search Users
          </Link>
        </div>
      ) : profile ? (
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary mx-auto mb-4 flex items-center justify-center">
              <User className="w-10 h-10 text-black" />
            </div>

            {/* Name */}
            {profile.slug ? (
              <h2 className="text-xl font-bold text-white mb-1">@{profile.slug}</h2>
            ) : (
              <h2 className="text-xl font-bold text-white mb-1 font-mono">
                {formatWallet(profile.wallet)}
              </h2>
            )}

            {/* Wallet */}
            <button
              onClick={copyWallet}
              className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors"
            >
              <span className="font-mono">{formatWallet(profile.wallet)}</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Join Date */}
            <div className="flex items-center justify-center gap-1 text-text-muted text-xs mt-2">
              <Calendar className="w-3 h-3" />
              <span>Joined {formatDate(profile.joinedAt)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {profile.totalSpins.toLocaleString()}
              </div>
              <div className="text-text-muted text-xs flex items-center justify-center gap-1">
                <CircleDot className="w-3 h-3" />
                Total Spins
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">
                ${profile.totalWinsUSD.toLocaleString()}
              </div>
              <div className="text-text-muted text-xs flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3" />
                Total Won
              </div>
            </div>
          </div>

          {/* View on Web */}
          <a
            href={`/u/${profile.slug || profile.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-surface border border-border rounded-xl text-text-secondary text-sm hover:text-white hover:border-accent/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Profile on Web
          </a>
        </div>
      ) : null}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/game" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <CircleDot className="w-5 h-5" />
            <span className="text-[10px] font-medium">Play</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>
          <Link href="/pwa/settings" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
