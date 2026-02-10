'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Gift, ExternalLink, Check, AlertTriangle,
  CheckCircle, XCircle, ArrowUpDown, RotateCcw
} from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, EmptyState } from '@/components/ui'
import {
  AdminTable,
  FilterBar,
  Tabs,
  StatusBadge,
  ConfirmModal,
  BulkActionBar,
  type Column,
  type FilterConfig,
  type Tab,
} from '@/components/admin'

// ============================================
// Types
// ============================================

interface DistributionItem {
  _id: string
  wallet: string
  prizeType: string
  prizeAmount: number
  prizeValueUSD: number
  lockDuration?: string
  createdAt: string
  status: 'pending' | 'distributed' | 'failed'
  distributedAt?: string
  distributedBy?: string
  distributedTxHash?: string
  failureReason?: string
}

interface DistributionStats {
  pending: { count: number; totalValue: number }
  distributed: { count: number; totalValue: number }
  failed: { count: number; totalValue: number }
}

interface SyncCheckpoint {
  lastSyncedAt: string | null
  totalVerified: number
  totalFailed: number
  syncInProgress: boolean
}

type TabKey = 'pending' | 'distributed' | 'failed'

// ============================================
// Helpers
// ============================================

const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'
const SUISCAN_TX = `https://suiscan.xyz/${SUI_NETWORK}/tx/`
const SUISCAN_ACCOUNT = `https://suiscan.xyz/${SUI_NETWORK}/account/`

function getPrizeTypeLabel(type: string) {
  switch (type) {
    case 'liquid_victory': return 'Liquid VICT'
    case 'locked_victory': return 'Locked VICT'
    case 'suitrump': return 'SuiTrump'
    default: return type
  }
}

function getPrizeTypeBadgeClass(type: string) {
  switch (type) {
    case 'liquid_victory': return 'bg-[var(--warning)]/20 text-[var(--warning)]'
    case 'locked_victory': return 'bg-purple-500/20 text-purple-400'
    case 'suitrump': return 'bg-cyan-500/20 text-cyan-400'
    default: return 'bg-gray-500/20 text-gray-400'
  }
}

function formatWallet(w: string) {
  return w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ============================================
// Filter configuration
// ============================================

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'wallet',
    type: 'text',
    label: 'Wallet',
    placeholder: 'Search wallet address...',
  },
  {
    key: 'prizeType',
    type: 'select',
    label: 'Prize Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'liquid_victory', label: 'Liquid VICT' },
      { value: 'locked_victory', label: 'Locked VICT' },
      { value: 'suitrump', label: 'SuiTrump' },
    ],
  },
  {
    key: 'date',
    type: 'date-range',
    labelFrom: 'From',
    labelTo: 'To',
  },
]

// ============================================
// Page Component
// ============================================

export default function AdminDistributePage() {
  const router = useRouter()

  // Data state
  const [items, setItems] = useState<DistributionItem[]>([])
  const [stats, setStats] = useState<DistributionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('pending')

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  // Sort state
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Selection state (for pending tab bulk actions)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal state
  const [singleModal, setSingleModal] = useState<{ open: boolean; spinId: string; wallet: string }>({
    open: false,
    spinId: '',
    wallet: '',
  })
  const [singleTxHash, setSingleTxHash] = useState('')
  const [singleProcessing, setSingleProcessing] = useState(false)

  const [bulkModal, setBulkModal] = useState(false)
  const [bulkTxHash, setBulkTxHash] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Sync state
  const [syncCheckpoint, setSyncCheckpoint] = useState<SyncCheckpoint | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ verified: number; failed: number; total: number } | null>(null)
  const [syncBannerVisible, setSyncBannerVisible] = useState(false)

  // Deduplication refs
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef('')

  // ============================================
  // Data fetching
  // ============================================

  const fetchData = useCallback(async (force = false) => {
    const fetchKey = `${activeTab}-${page}-${sortBy}-${sortOrder}-${JSON.stringify(filterValues)}`

    // Prevent duplicate fetches
    if (fetchingRef.current) return
    if (!force && lastFetchRef.current === fetchKey) return

    fetchingRef.current = true
    lastFetchRef.current = fetchKey
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      })

      // Add filter params
      if (filterValues.wallet) params.set('wallet', filterValues.wallet)
      if (filterValues.prizeType) params.set('prizeType', filterValues.prizeType)
      if (filterValues.dateFrom) params.set('dateFrom', filterValues.dateFrom)
      if (filterValues.dateTo) params.set('dateTo', filterValues.dateTo)

      const res = await fetch(`/api/admin/distribute?${params}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      if (data.success) {
        setItems(data.data?.items || [])
        setStats(data.data?.stats || null)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      } else {
        setError(data.error || 'Failed to load data')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Network error. Please try again.')
    }

    setLoading(false)
    fetchingRef.current = false
  }, [activeTab, page, sortBy, sortOrder, filterValues, router])

  // Fetch on mount and when dependencies change
  useEffect(() => { fetchData() }, [fetchData])

  // Fetch sync checkpoint on mount
  useEffect(() => {
    fetch('/api/admin/distribute/sync')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSyncCheckpoint(data.data)
      })
      .catch(() => {})
  }, [])

  // ============================================
  // Tab change
  // ============================================

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey)
    setPage(1)
    setSelectedIds([])
    lastFetchRef.current = '' // Reset to allow fetch with new tab
  }

  // ============================================
  // Filter change
  // ============================================

  const handleFilterChange = (values: Record<string, string>) => {
    setFilterValues(values)
    setPage(1)
    lastFetchRef.current = '' // Reset to allow fetch with new filters
  }

  const handleFilterClear = () => {
    setFilterValues({})
    setPage(1)
    lastFetchRef.current = ''
  }

  // ============================================
  // Sort handling
  // ============================================

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
    lastFetchRef.current = ''
  }

  // ============================================
  // Page change
  // ============================================

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // ============================================
  // Refresh
  // ============================================

  const handleRefresh = () => {
    lastFetchRef.current = ''
    fetchData(true)
  }

  // ============================================
  // Single distribute
  // ============================================

  const openSingleModal = (spinId: string, wallet: string) => {
    setSingleTxHash('')
    setSingleModal({ open: true, spinId, wallet })
  }

  const handleSingleDistribute = async (txHash?: string) => {
    if (!txHash?.trim()) return
    setSingleProcessing(true)

    try {
      const res = await fetch('/api/admin/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinId: singleModal.spinId, txHash: txHash.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSingleModal({ open: false, spinId: '', wallet: '' })
        lastFetchRef.current = ''
        fetchData(true)
      } else {
        alert(data.error || 'Failed to distribute')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    }

    setSingleProcessing(false)
  }

  // ============================================
  // Bulk distribute
  // ============================================

  const openBulkModal = () => {
    setBulkTxHash('')
    setBulkModal(true)
  }

  const handleBulkDistribute = async (txHash?: string) => {
    if (!txHash?.trim() || selectedIds.length === 0) return
    setBulkProcessing(true)

    try {
      const res = await fetch('/api/admin/distribute/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinIds: selectedIds, txHash: txHash.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setBulkModal(false)
        setSelectedIds([])
        lastFetchRef.current = ''
        fetchData(true)
      } else {
        alert(data.error || 'Failed to bulk distribute')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    }

    setBulkProcessing(false)
  }

  // ============================================
  // Retry failed
  // ============================================

  const handleRetry = async (spinId: string) => {
    // Retry sets status back to pending
    try {
      const res = await fetch('/api/admin/distribute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spinId, action: 'retry' }),
      })
      const data = await res.json()
      if (data.success) {
        lastFetchRef.current = ''
        fetchData(true)
      } else {
        alert(data.error || 'Failed to retry')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    }
  }

  // ============================================
  // Sync
  // ============================================

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/admin/distribute/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSyncResult(data.data)
        setSyncBannerVisible(true)
        // Refresh checkpoint
        const checkRes = await fetch('/api/admin/distribute/sync')
        const checkData = await checkRes.json()
        if (checkData.success) setSyncCheckpoint(checkData.data)
        // Refresh data if needed
        if (data.data?.failed > 0) {
          lastFetchRef.current = ''
          fetchData(true)
        }
        // Auto-hide banner after 10s
        setTimeout(() => setSyncBannerVisible(false), 10000)
      } else {
        alert(data.error || 'Sync failed')
      }
    } catch (err) {
      console.error(err)
      alert('Network error during sync')
    }

    setSyncing(false)
  }

  // ============================================
  // Tabs configuration
  // ============================================

  const tabs: Tab[] = useMemo(
    () => [
      { key: 'pending', label: 'Pending', count: stats?.pending.count },
      { key: 'distributed', label: 'Distributed', count: stats?.distributed.count },
      { key: 'failed', label: 'Failed', count: stats?.failed.count },
    ],
    [stats]
  )

  // ============================================
  // Table columns
  // ============================================

  const pendingColumns: Column<DistributionItem>[] = useMemo(
    () => [
      {
        key: 'wallet',
        header: 'Wallet',
        render: (item) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm">{formatWallet(item.wallet)}</span>
            <a
              href={`${SUISCAN_ACCOUNT}${item.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
      },
      {
        key: 'prizeType',
        header: 'Type',
        render: (item) => (
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${getPrizeTypeBadgeClass(item.prizeType)}`}>
            {getPrizeTypeLabel(item.prizeType)}
          </span>
        ),
      },
      {
        key: 'prizeAmount',
        header: 'Amount',
        sortable: true,
        render: (item) => (
          <span className="font-medium">{item.prizeAmount.toLocaleString()}</span>
        ),
      },
      {
        key: 'prizeValueUSD',
        header: 'Value (USD)',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--success)]">${item.prizeValueUSD.toFixed(2)}</span>
        ),
      },
      {
        key: 'lockDuration',
        header: 'Lock',
        render: (item) => (
          <span className="text-[var(--text-secondary)]">{item.lockDuration || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] whitespace-nowrap">{formatDate(item.createdAt)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              openSingleModal(item._id, item.wallet)
            }}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--success)] hover:bg-[var(--success)]/80 rounded text-white text-[10px] sm:text-xs whitespace-nowrap transition-colors"
          >
            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            Mark Sent
          </button>
        ),
      },
    ],
    []
  )

  const distributedColumns: Column<DistributionItem>[] = useMemo(
    () => [
      {
        key: 'wallet',
        header: 'Wallet',
        render: (item) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm">{formatWallet(item.wallet)}</span>
            <a
              href={`${SUISCAN_ACCOUNT}${item.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
      },
      {
        key: 'prizeType',
        header: 'Type',
        render: (item) => (
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${getPrizeTypeBadgeClass(item.prizeType)}`}>
            {getPrizeTypeLabel(item.prizeType)}
          </span>
        ),
      },
      {
        key: 'prizeAmount',
        header: 'Amount',
        sortable: true,
        render: (item) => (
          <span className="font-medium">{item.prizeAmount.toLocaleString()}</span>
        ),
      },
      {
        key: 'prizeValueUSD',
        header: 'Value (USD)',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--success)]">${item.prizeValueUSD.toFixed(2)}</span>
        ),
      },
      {
        key: 'lockDuration',
        header: 'Lock',
        render: (item) => (
          <span className="text-[var(--text-secondary)]">{item.lockDuration || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] whitespace-nowrap">{formatDate(item.createdAt)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'distributedBy',
        header: 'Distributor',
        render: (item) => (
          <span className="text-[var(--text-secondary)] text-xs">{item.distributedBy || '-'}</span>
        ),
      },
      {
        key: 'distributedTxHash',
        header: 'TX Hash',
        render: (item) =>
          item.distributedTxHash ? (
            <a
              href={`${SUISCAN_TX}${item.distributedTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--accent)] hover:underline text-xs font-mono"
            >
              {item.distributedTxHash.slice(0, 8)}...
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-[var(--text-secondary)]">-</span>
          ),
      },
      {
        key: 'distributedAt',
        header: 'Distributed',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] whitespace-nowrap text-xs">
            {item.distributedAt ? formatDate(item.distributedAt) : '-'}
          </span>
        ),
      },
    ],
    []
  )

  const failedColumns: Column<DistributionItem>[] = useMemo(
    () => [
      {
        key: 'wallet',
        header: 'Wallet',
        render: (item) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm">{formatWallet(item.wallet)}</span>
            <a
              href={`${SUISCAN_ACCOUNT}${item.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent)] flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
      },
      {
        key: 'prizeType',
        header: 'Type',
        render: (item) => (
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${getPrizeTypeBadgeClass(item.prizeType)}`}>
            {getPrizeTypeLabel(item.prizeType)}
          </span>
        ),
      },
      {
        key: 'prizeAmount',
        header: 'Amount',
        sortable: true,
        render: (item) => (
          <span className="font-medium">{item.prizeAmount.toLocaleString()}</span>
        ),
      },
      {
        key: 'prizeValueUSD',
        header: 'Value (USD)',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--success)]">${item.prizeValueUSD.toFixed(2)}</span>
        ),
      },
      {
        key: 'lockDuration',
        header: 'Lock',
        render: (item) => (
          <span className="text-[var(--text-secondary)]">{item.lockDuration || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] whitespace-nowrap">{formatDate(item.createdAt)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'distributedTxHash',
        header: 'TX Hash',
        render: (item) =>
          item.distributedTxHash ? (
            <a
              href={`${SUISCAN_TX}${item.distributedTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--accent)] hover:underline text-xs font-mono"
            >
              {item.distributedTxHash.slice(0, 8)}...
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-[var(--text-secondary)]">-</span>
          ),
      },
      {
        key: 'failureReason',
        header: 'Reason',
        render: (item) => (
          <span className="text-[var(--error)] text-xs max-w-[200px] truncate block" title={item.failureReason}>
            {item.failureReason || 'Unknown'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRetry(item._id)
            }}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-[var(--warning)] hover:bg-[var(--warning)]/80 rounded text-white text-[10px] sm:text-xs whitespace-nowrap transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            Retry
          </button>
        ),
      },
    ],
    []
  )

  const activeColumns = useMemo(() => {
    switch (activeTab) {
      case 'distributed': return distributedColumns
      case 'failed': return failedColumns
      default: return pendingColumns
    }
  }, [activeTab, pendingColumns, distributedColumns, failedColumns])

  // ============================================
  // Render
  // ============================================

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Prize Distribution</h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">
            Distribute pending prizes to winners
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-ghost text-sm flex items-center gap-1.5"
            title="Verify distributed TX hashes on-chain"
          >
            <ArrowUpDown className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn btn-ghost text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncBannerVisible && syncResult && (
        <div className="mb-4 p-3 sm:p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 bg-[var(--card)] border-[var(--border)]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
            <span className="text-sm font-medium">Sync Complete</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
            <span>
              <strong className="text-[var(--success)]">{syncResult.verified}</strong> verified
            </span>
            <span>
              <strong className="text-[var(--error)]">{syncResult.failed}</strong> failed
            </span>
            <span>
              <strong>{syncResult.total}</strong> total checked
            </span>
          </div>
          <button
            onClick={() => setSyncBannerVisible(false)}
            className="ml-auto text-[var(--text-secondary)] hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Last Sync Info */}
      {syncCheckpoint?.lastSyncedAt && (
        <div className="mb-4 text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
          <ArrowUpDown className="w-3 h-3" />
          Last sync: {timeAgo(syncCheckpoint.lastSyncedAt)}
          <span className="mx-1">|</span>
          {syncCheckpoint.totalVerified} verified, {syncCheckpoint.totalFailed} failed
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {/* Pending */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Pending</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--warning)]">
                {stats?.pending.count ?? '-'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                ${(stats?.pending.totalValue ?? 0).toFixed(0)} USD
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex-shrink-0">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
        {/* Distributed */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Distributed</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--success)]">
                {stats?.distributed.count ?? '-'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                ${(stats?.distributed.totalValue ?? 0).toFixed(0)} USD
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[var(--success)]/10 text-[var(--success)] flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
        {/* Failed */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Failed</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--error)]">
                {stats?.failed.count ?? '-'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                ${(stats?.failed.totalValue ?? 0).toFixed(0)} USD
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] flex-shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* Filters */}
      <FilterBar
        filters={FILTER_CONFIGS}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      {/* Bulk Action Bar (pending tab only) */}
      {activeTab === 'pending' && (
        <BulkActionBar
          count={selectedIds.length}
          actions={[
            {
              label: `Mark as Distributed (${selectedIds.length})`,
              onClick: openBulkModal,
              variant: 'success',
              disabled: selectedIds.length === 0,
            },
          ]}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* Table Card */}
      <div className="card">
        <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold capitalize">
            {activeTab} Prizes
          </h3>
          {!loading && (
            <span className="text-xs text-[var(--text-secondary)]">
              {total} result{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={10} columns={activeTab === 'distributed' ? 10 : activeTab === 'failed' ? 10 : 8} />
        ) : error ? (
          <EmptyState
            title="Error loading prizes"
            message={error}
            icon={AlertTriangle}
            action={
              <button onClick={handleRefresh} className="btn btn-primary text-sm mt-2">
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Try Again
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} prizes`}
            message={
              Object.values(filterValues).some(Boolean)
                ? 'No prizes match your current filters. Try adjusting your search.'
                : activeTab === 'pending'
                  ? 'All prizes have been distributed!'
                  : activeTab === 'failed'
                    ? 'No failed distributions found.'
                    : 'No distributed prizes found yet.'
            }
            icon={Gift}
          />
        ) : (
          <>
            <AdminTable
              columns={activeColumns}
              data={items}
              selectable={activeTab === 'pending'}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 sm:p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>

      {/* Single Distribute Modal */}
      <ConfirmModal
        open={singleModal.open}
        onClose={() => setSingleModal({ open: false, spinId: '', wallet: '' })}
        onConfirm={handleSingleDistribute}
        title="Mark Prize as Distributed"
        description={`Confirm distribution to wallet ${formatWallet(singleModal.wallet)}. Enter the transaction hash from SuiScan.`}
        confirmLabel="Mark Sent"
        confirmVariant="success"
        loading={singleProcessing}
        inputLabel="Transaction Hash"
        inputPlaceholder="Enter SUI transaction hash or SuiScan URL..."
        inputValue={singleTxHash}
        onInputChange={setSingleTxHash}
        inputRequired
      />

      {/* Bulk Distribute Modal */}
      <ConfirmModal
        open={bulkModal}
        onClose={() => setBulkModal(false)}
        onConfirm={handleBulkDistribute}
        title="Bulk Mark as Distributed"
        description={`Mark ${selectedIds.length} selected prize${selectedIds.length !== 1 ? 's' : ''} as distributed. Enter the shared transaction hash.`}
        confirmLabel={`Distribute ${selectedIds.length} Prize${selectedIds.length !== 1 ? 's' : ''}`}
        confirmVariant="success"
        loading={bulkProcessing}
        inputLabel="Transaction Hash"
        inputPlaceholder="Enter SUI transaction hash or SuiScan URL..."
        inputValue={bulkTxHash}
        onInputChange={setBulkTxHash}
        inputRequired
      />
    </>
  )
}
