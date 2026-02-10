'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Settings,
  DollarSign,
  Users,
  Gift,
  RefreshCw,
  Database,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  FileText,
  CloudCog,
} from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { useAdminStatsStore } from '@/lib/stores/admin'

// ============================================
// Sync Status Types
// ============================================

interface SyncStatus {
  lastSyncedAt: string | null
  totalVerified: number
  totalFailed: number
  totalSkipped: number
  syncInProgress: boolean
  hasDistributions: boolean
  totalDistributed: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { stats, isLoading: loading, error, fetchStats, invalidate } = useAdminStatsStore()
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null)

  // Distribution Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncTriggering, setSyncTriggering] = useState(false)

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Handle unauthorized
  useEffect(() => {
    if (error === 'Unauthorized') {
      router.push('/admin/login')
    }
  }, [error, router])

  // Fetch sync status (with abort to prevent double-fire in strict mode)
  const fetchSyncStatus = useCallback(async (signal?: AbortSignal) => {
    setSyncLoading(true)
    try {
      const res = await fetch('/api/admin/distribute/sync', { signal })
      if (res.status === 401) return
      const json = await res.json()
      if (json.success) {
        setSyncStatus(json.data)
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // Silently fail - sync status is supplementary
    } finally {
      setSyncLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSyncStatus(controller.signal)
    return () => controller.abort()
  }, [fetchSyncStatus])

  const handleRefresh = () => {
    invalidate()
    fetchStats()
    fetchSyncStatus()
  }

  const handleTriggerSync = async () => {
    setSyncTriggering(true)
    try {
      const res = await fetch('/api/admin/distribute/sync', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        // Refresh sync status after triggering
        await fetchSyncStatus()
      }
    } catch {
      // Silently fail
    } finally {
      setSyncTriggering(false)
    }
  }

  const handleResetSync = async () => {
    try {
      const res = await fetch('/api/admin/distribute/sync', { method: 'PUT' })
      const json = await res.json()
      if (json.success) {
        await fetchSyncStatus()
      }
    } catch {
      // Silently fail
    }
  }

  const handleSeedDefaults = async () => {
    if (!confirm('This will seed default configuration. Continue?')) return

    setSeeding(true)
    setSeedResult(null)

    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()

      setSeedResult({
        success: data.success,
        message: data.message || (data.success ? 'Defaults seeded successfully!' : 'Failed to seed'),
      })
    } catch (err) {
      setSeedResult({
        success: false,
        message: 'Network error. Please try again.',
      })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <>
      {/* Failed Verifications Alert Banner — only when real distributions exist */}
      {syncStatus && syncStatus.totalFailed > 0 && syncStatus.hasDistributions && (
        <div className="flex items-center gap-3 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30">
          <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-[var(--error)]">
              Distribution Sync Alert
            </p>
            <p className="text-xs sm:text-sm text-[var(--error)]/80">
              {syncStatus.totalFailed} distribution{syncStatus.totalFailed !== 1 ? 's' : ''} failed on-chain verification. Review in the Distribute tab.
            </p>
          </div>
          <button
            onClick={handleTriggerSync}
            disabled={syncTriggering || (syncStatus?.syncInProgress ?? false)}
            className="btn btn-ghost text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10 text-xs sm:text-sm flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncTriggering ? 'animate-spin' : ''}`} />
            Re-sync
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
          <p className="text-text-secondary text-sm sm:text-base">Overview of your games platform</p>
        </div>
        <button onClick={handleRefresh} className="btn btn-ghost self-start sm:self-auto" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <StatCard title="Total Users" value={stats?.totalUsers ?? '-'} icon={Users} loading={loading} />
        <StatCard title="Total Spins" value={stats?.totalSpins ?? '-'} icon={Activity} loading={loading} />
        <StatCard title="Revenue (SUI)" value={stats?.totalRevenueSUI?.toFixed(2) ?? '-'} icon={TrendingUp} loading={loading} accent />
        <StatCard title="Pending Prizes" value={stats?.pendingDistribution ?? '-'} icon={Gift} loading={loading} warning={stats?.pendingDistribution ? stats.pendingDistribution > 0 : false} />
      </div>

      {/* Distribution Sync + Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {/* Today Card */}
        <div className="card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Today</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] text-sm sm:text-base">Spins</span>
              {loading ? <Skeleton className="h-5 w-12" /> : <span className="font-mono text-sm sm:text-base">{stats?.spinsToday ?? '-'}</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] text-sm sm:text-base">Revenue</span>
              {loading ? <Skeleton className="h-5 w-20" /> : <span className="font-mono text-sm sm:text-base text-[var(--accent)]">{stats?.revenueTodaySUI?.toFixed(2) ?? '-'} SUI</span>}
            </div>
          </div>
        </div>

        {/* Distribution Sync Card */}
        <div className="card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <CloudCog className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)]" />
            Distribution Sync
          </h3>
          {syncLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full mt-2" />
            </div>
          ) : syncStatus ? (
            syncStatus.hasDistributions ? (
              <>
                <div className="space-y-2 mb-3 sm:mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-xs sm:text-sm">Last Sync</span>
                    <span className="font-mono text-xs sm:text-sm">
                      {syncStatus.lastSyncedAt
                        ? new Date(syncStatus.lastSyncedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-xs sm:text-sm">Distributed</span>
                    <span className="font-mono text-xs sm:text-sm">{syncStatus.totalDistributed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-xs sm:text-sm">Verified</span>
                    <span className="font-mono text-xs sm:text-sm text-[var(--success)]">{syncStatus.totalVerified}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-xs sm:text-sm">Failed</span>
                    <span className={`font-mono text-xs sm:text-sm ${syncStatus.totalFailed > 0 ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>
                      {syncStatus.totalFailed}
                    </span>
                  </div>
                  {syncStatus.totalSkipped > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)] text-xs sm:text-sm" title="TX not found on-chain (mock/test data)">Skipped</span>
                      <span className="font-mono text-xs sm:text-sm text-[var(--text-secondary)]">
                        {syncStatus.totalSkipped}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerSync}
                    disabled={syncTriggering || syncStatus.syncInProgress}
                    className="btn btn-secondary flex-1 text-xs sm:text-sm"
                  >
                    {syncTriggering || syncStatus.syncInProgress ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Sync Now</>
                    )}
                  </button>
                  {syncStatus.totalFailed > 0 && (
                    <button
                      onClick={handleResetSync}
                      disabled={syncTriggering || syncStatus.syncInProgress}
                      className="btn btn-ghost text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--error)]"
                      title="Reset all sync counters"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm mb-1">No distributions yet</p>
                <p className="text-[var(--text-secondary)]/60 text-[10px] sm:text-xs">
                  Distribute prizes first, then sync to verify TX hashes on-chain.
                </p>
                {(syncStatus.totalFailed > 0 || syncStatus.totalVerified > 0) && (
                  <button
                    onClick={handleResetSync}
                    className="btn btn-ghost text-xs mt-3 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    Reset Stale Counters
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Unable to load sync status.</p>
          )}
        </div>

        {/* Seed Defaults Card */}
        <div className="card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            Database Setup
          </h3>
          <p className="text-text-secondary text-xs sm:text-sm mb-3 sm:mb-4">
            Initialize the database with default prize table, rates, and configuration.
          </p>

          {seedResult && (
            <div className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm ${seedResult.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              {seedResult.success ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
              <span>{seedResult.message}</span>
            </div>
          )}

          <button onClick={handleSeedDefaults} disabled={seeding} className="btn btn-secondary w-full text-sm sm:text-base">
            {seeding ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Seeding...</>
            ) : (
              <><Database className="w-4 h-4" />Seed Defaults</>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          <Link href="/admin/revenue" className="p-3 sm:p-4 bg-background rounded-lg text-center hover:bg-card-hover transition-colors">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-accent" />
            <span className="text-xs sm:text-sm">View Revenue</span>
          </Link>
          <Link href="/admin/distribute" className="p-3 sm:p-4 bg-background rounded-lg text-center hover:bg-card-hover transition-colors">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-purple-400" />
            <span className="text-xs sm:text-sm">Distribute Prizes</span>
          </Link>
          <Link href="/admin/config" className="p-3 sm:p-4 bg-background rounded-lg text-center hover:bg-card-hover transition-colors">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-text-secondary" />
            <span className="text-xs sm:text-sm">Edit Config</span>
          </Link>
          <Link href="/admin/users" className="p-3 sm:p-4 bg-background rounded-lg text-center hover:bg-card-hover transition-colors">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-cyan-400" />
            <span className="text-xs sm:text-sm">Manage Users</span>
          </Link>
          <Link href="/admin/logs" className="p-3 sm:p-4 bg-background rounded-lg text-center hover:bg-card-hover transition-colors">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-amber-400" />
            <span className="text-xs sm:text-sm">Audit Logs</span>
          </Link>
        </div>
      </div>
    </>
  )
}

function StatCard({ title, value, icon: Icon, loading, accent, warning }: {
  title: string
  value: string | number
  icon: React.ElementType
  loading?: boolean
  accent?: boolean
  warning?: boolean
}) {
  return (
    <div className="card p-3 sm:p-4 md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm truncate">{title}</p>
          {loading ? (
            <Skeleton className="h-6 sm:h-8 w-16 sm:w-20 mt-1" />
          ) : (
            <p className={`text-lg sm:text-xl md:text-2xl font-bold mt-1 truncate ${accent ? 'text-[var(--accent)]' : warning ? 'text-[var(--warning)]' : ''}`}>
              {value}
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${accent ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : warning ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--card)] text-[var(--text-secondary)]'}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  )
}
