'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import { clearStoredWallet } from '@/lib/pwa/encryption'
import {
  Settings,
  Bell,
  BellOff,
  LogOut,
  Trash2,
  AlertTriangle,
  Check,
  X,
  ChevronLeft,
  Wallet,
  Home,
  History,
  Search,
  RefreshCw,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react'

export default function PWASettingsPage() {
  const router = useRouter()
  const { isAuthenticated, wallet, pwaWallet, purchasedSpins, bonusSpins, totalSpins, totalWinsUSD, logout, fetchUser } = usePWAAuthStore()

  const [mounted, setMounted] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [testingPush, setTestingPush] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check push status from server (more reliable than just browser permission)
  useEffect(() => {
    if (mounted && isAuthenticated) {
      pwaFetch('/api/pwa/push/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPushEnabled(data.data.enabled)
          }
        })
        .catch((err) => console.error('Push status check error:', err))
    }
  }, [mounted, isAuthenticated])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage(null)
    try {
      const success = await fetchUser()
      if (success) {
        setMessage({ type: 'success', text: 'Data refreshed' })
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage({ type: 'error', text: 'Failed to refresh data' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to refresh data' })
    }
    setRefreshing(false)
  }

  const handleTestPush = async () => {
    setTestingPush(true)
    setMessage(null)
    try {
      const res = await pwaFetch('/api/pwa/push/test', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Test notification sent! Check your phone.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test notification' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test notification' })
    }
    setTestingPush(false)
  }

  const handleTogglePush = async () => {
    setPushLoading(true)
    setMessage(null)

    try {
      if (pushEnabled) {
        // Unsubscribe
        const res = await pwaFetch('/api/pwa/push/subscribe', { method: 'DELETE' })
        const data = await res.json()
        if (data.success) {
          setPushEnabled(false)
          setMessage({ type: 'success', text: 'Push notifications disabled' })
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to disable notifications' })
        }
      } else {
        // Request permission and subscribe
        if (!('Notification' in window)) {
          setMessage({ type: 'error', text: 'Push notifications not supported' })
          setPushLoading(false)
          return
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setMessage({ type: 'error', text: 'Please allow notifications in browser settings' })
          setPushLoading(false)
          return
        }

        // Get push subscription
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })

        // Send to server
        const res = await pwaFetch('/api/pwa/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        })

        const data = await res.json()
        if (data.success) {
          setPushEnabled(true)
          setMessage({ type: 'success', text: 'Push notifications enabled' })
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to enable notifications' })
        }
      }
    } catch (err) {
      console.error('Push toggle error:', err)
      setMessage({ type: 'error', text: 'Failed to update notification settings' })
    }

    setPushLoading(false)
  }

  const handleLogout = () => {
    logout()
    router.replace('/pwa')
  }

  const handleClearWallet = () => {
    clearStoredWallet()
    logout()
    router.replace('/pwa')
  }

  const formatWallet = (w: string | null) => {
    if (!w) return '—'
    return `${w.slice(0, 6)}...${w.slice(-4)}`
  }

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/pwa/home" className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Settings
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-text-secondary hover:text-accent transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Your Spins */}
      <div className="bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-accent/30 p-4 mb-4">
        <h2 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          Your Spins
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-accent">{purchasedSpins}</div>
            <div className="text-text-muted text-xs">Purchased</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-secondary">{bonusSpins}</div>
            <div className="text-text-muted text-xs">Bonus</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-text-muted text-sm">Total Available</span>
          <span className="text-white font-bold text-lg">{purchasedSpins + bonusSpins}</span>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <h2 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent" />
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-sm">Main Wallet</span>
            <span className="text-white font-mono text-sm">{formatWallet(wallet)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-sm">PWA Wallet</span>
            <span className="text-white font-mono text-sm">{formatWallet(pwaWallet)}</span>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-text-muted text-sm">Total Spins</span>
            <span className="text-white font-bold">{totalSpins}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-sm">Total Won</span>
            <span className="text-accent font-bold">${totalWinsUSD.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {pushEnabled ? (
              <Bell className="w-5 h-5 text-accent" />
            ) : (
              <BellOff className="w-5 h-5 text-text-muted" />
            )}
            <div>
              <h2 className="text-white font-medium text-sm">Push Notifications</h2>
              <p className="text-text-muted text-xs">Get notified when prizes are sent</p>
            </div>
          </div>
          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              pushEnabled ? 'bg-accent' : 'bg-border'
            } ${pushLoading ? 'opacity-50' : ''}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
              pushEnabled ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>
        {/* Test notification button - only show when enabled */}
        {pushEnabled && (
          <button
            onClick={handleTestPush}
            disabled={testingPush}
            className="mt-3 w-full py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent text-xs font-medium flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {testingPush ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test Notification
              </>
            )}
          </button>
        )}
      </div>

      {/* Logout */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="text-white font-medium text-sm">Sign Out</h2>
                <p className="text-text-muted text-xs">Sign out of this device</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-text-muted rotate-180" />
          </button>
        ) : (
          <div>
            <p className="text-text-secondary text-sm mb-3">Are you sure you want to sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-background rounded-lg text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-orange-500 rounded-lg text-white text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Wallet Data */}
      <div className="bg-surface rounded-xl border border-red-500/30 p-4">
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <div>
                <h2 className="text-red-400 font-medium text-sm">Clear Wallet Data</h2>
                <p className="text-text-muted text-xs">Remove PWA wallet from this device</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-text-muted rotate-180" />
          </button>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Clear all wallet data?</p>
                <p className="text-red-400/70 text-xs mt-1">
                  This will remove your PWA wallet from this device. You'll need to set up again from the web app.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-background rounded-lg text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWallet}
                className="flex-1 py-2 bg-red-500 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/home" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>
          <Link href="/pwa/settings" className="flex flex-col items-center gap-1 py-1 px-3 text-accent">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
