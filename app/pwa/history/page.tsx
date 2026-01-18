'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import {
  History,
  ChevronLeft,
  Trophy,
  Clock,
  Check,
  X,
  Loader2,
  Home,
  Search,
  Settings,
  RefreshCw,
} from 'lucide-react'

interface SpinRecord {
  id: string
  prizeType: string
  prizeValueUSD: number
  prizeAmount?: number
  lockDuration?: string
  status: 'pending' | 'distributed' | 'failed'
  createdAt: string
  distributedTxHash?: string
}

export default function PWAHistoryPage() {
  const router = useRouter()
  const { isAuthenticated } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [spins, setSpins] = useState<SpinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Fetch spin history
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchHistory()
    }
  }, [mounted, isAuthenticated])

  const fetchHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await pwaFetch('/api/spin/history?limit=50')
      const data = await res.json()

      if (data.success) {
        setSpins(data.data.spins || [])
      } else {
        setError(data.error || 'Failed to load history')
      }
    } catch (err) {
      console.error('History fetch error:', err)
      setError('Failed to load spin history')
    }

    setLoading(false)
    setRefreshing(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'distributed':
        return (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <Check className="w-3 h-3" /> Sent
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <X className="w-3 h-3" /> Failed
          </span>
        )
      default:
        return null
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPrizeColor = (type: string) => {
    if (type === 'no_prize') return 'bg-gray-500'
    if (type === 'liquid_victory') return 'bg-yellow-500'
    if (type === 'suitrump') return 'bg-red-500'
    return 'bg-blue-500'
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/pwa/home" className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            Spin History
          </h1>
        </div>
        <button
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
          className="p-2 text-text-secondary hover:text-white transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <X className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-white font-medium mb-2">Failed to load history</p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchHistory()}
            className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      ) : spins.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Trophy className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-white font-medium mb-2">No spins yet</p>
          <p className="text-text-muted text-sm mb-4">Your spin history will appear here</p>
          <Link
            href="/pwa/game"
            className="px-4 py-2 bg-accent text-black rounded-lg text-sm font-medium"
          >
            Go Play!
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {spins.map((spin) => (
            <div
              key={spin.id}
              className="bg-surface rounded-xl border border-border p-3 flex items-center gap-3"
            >
              {/* Prize indicator */}
              <div className={`w-10 h-10 rounded-lg ${getPrizeColor(spin.prizeType)} flex items-center justify-center text-white font-bold text-sm`}>
                {spin.prizeType === 'no_prize' ? '—' : `$${spin.prizeValueUSD}`}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {spin.prizeType === 'no_prize' ? (
                    <span className="text-text-muted font-medium text-sm">No Prize</span>
                  ) : (
                    <>
                      <span className="text-white font-bold text-sm">
                        ${spin.prizeValueUSD}
                      </span>
                      {spin.lockDuration && spin.lockDuration !== 'LIQUID' && (
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                          {spin.lockDuration}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-text-muted text-xs">
                  {formatDate(spin.createdAt)}
                </div>
              </div>

              {/* Status */}
              {spin.prizeType !== 'no_prize' && (
                <div className="flex-shrink-0">
                  {getStatusBadge(spin.status)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/home" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-accent">
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
