'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Skeleton } from '@/components/ui'

interface DashboardStats {
  totalUsers: number
  totalSpins: number
  totalRevenueSUI: number
  pendingPrizes: number
  todaySpins: number
  todayRevenueSUI: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
          <p className="text-text-secondary text-sm sm:text-base">Overview of your games platform</p>
        </div>
        <button onClick={fetchStats} className="btn btn-ghost self-start sm:self-auto" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <StatCard title="Total Users" value={stats?.totalUsers ?? '-'} icon={Users} loading={loading} />
        <StatCard title="Total Spins" value={stats?.totalSpins ?? '-'} icon={Activity} loading={loading} />
        <StatCard title="Revenue (SUI)" value={stats?.totalRevenueSUI?.toFixed(2) ?? '-'} icon={TrendingUp} loading={loading} accent />
        <StatCard title="Pending Prizes" value={stats?.pendingPrizes ?? '-'} icon={Gift} loading={loading} warning={stats?.pendingPrizes ? stats.pendingPrizes > 0 : false} />
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <div className="card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Today</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] text-sm sm:text-base">Spins</span>
              {loading ? <Skeleton className="h-5 w-12" /> : <span className="font-mono text-sm sm:text-base">{stats?.todaySpins ?? '-'}</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] text-sm sm:text-base">Revenue</span>
              {loading ? <Skeleton className="h-5 w-20" /> : <span className="font-mono text-sm sm:text-base text-[var(--accent)]">{stats?.todayRevenueSUI?.toFixed(2) ?? '-'} SUI</span>}
            </div>
          </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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
