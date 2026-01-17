'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import {
  Search,
  ChevronLeft,
  User,
  Trophy,
  X,
  Loader2,
  CircleDot,
  History,
  Settings,
} from 'lucide-react'

interface UserResult {
  wallet: string
  slug: string | null
  totalSpins: number
  totalWinsUSD: number
}

export default function PWASearchPage() {
  const router = useRouter()
  const { isAuthenticated } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
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

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await pwaFetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.success) {
        setResults(data.data.users || [])
      } else {
        setError(data.error || 'Search failed')
        setResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search users')
      setResults([])
    }

    setLoading(false)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatWallet = (w: string) => {
    return `${w.slice(0, 6)}...${w.slice(-4)}`
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/pwa/game" className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-accent" />
          Search Users
        </h1>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Username or wallet address..."
          className="w-full bg-[#0a0c10] border-2 border-border rounded-xl px-4 py-3 pl-10 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-accent"
          autoComplete="off"
          spellCheck={false}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={loading || query.trim().length < 2}
        className="w-full py-3 bg-accent text-black rounded-xl font-medium text-sm mb-4 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching...
          </span>
        ) : (
          'Search'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          {results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <User className="w-12 h-12 text-text-muted mb-4" />
              <p className="text-white font-medium mb-2">No users found</p>
              <p className="text-text-muted text-sm">
                Try searching by username or wallet address
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-text-muted text-xs mb-2">
                Found {results.length} user{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((user) => (
                <Link
                  key={user.wallet}
                  href={`/pwa/u/${user.slug || user.wallet}`}
                  className="block bg-surface rounded-xl border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {user.slug ? (
                          <span className="text-white font-medium truncate">@{user.slug}</span>
                        ) : (
                          <span className="text-white font-mono text-sm">{formatWallet(user.wallet)}</span>
                        )}
                      </div>
                      {user.slug && (
                        <div className="text-text-muted text-xs font-mono">
                          {formatWallet(user.wallet)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-accent text-sm font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        ${user.totalWinsUSD.toLocaleString()}
                      </div>
                      <div className="text-text-muted text-xs">
                        {user.totalSpins} spins
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Search className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-white font-medium mb-2">Find Players</p>
          <p className="text-text-muted text-sm">
            Search by username or wallet address
          </p>
        </div>
      )}

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
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-accent">
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
