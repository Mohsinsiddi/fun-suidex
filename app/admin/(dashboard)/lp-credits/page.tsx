'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Zap, DollarSign, Users, Hash } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, SkeletonCardGrid, EmptyState } from '@/components/ui'
import { AdminTable, Tabs, FilterBar, StatusBadge } from '@/components/admin'
import type { Column } from '@/components/admin'
import type { FilterConfig } from '@/components/admin'

// ============================================
// Types
// ============================================

interface LPCreditItem {
  _id: string
  wallet: string
  txHash: string
  eventType: 'lp_stake' | 'swap' | 'other'
  pair: string
  amountUSD: number
  spinsCredited: number
  ratePerSpin: number
  status: 'credited' | 'reversed'
  creditedAt: string
  reversedAt?: string
}

interface SummaryStats {
  totalCredits: number
  totalSpinsCredited: number
  totalAmountUSD: number
  uniqueWallets: number
  byEventType: Record<string, { count: number; spins: number; usd: number }>
  byPair: Record<string, { count: number; spins: number; usd: number }>
  reversed: { count: number; spins: number }
  statusCounts: Record<string, number>
}

// ============================================
// Helpers
// ============================================

const formatWallet = (w: string) => (w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-')
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatTxHash = (h: string) => (h ? `${h.slice(0, 8)}...${h.slice(-6)}` : '-')

// ============================================
// Page Component
// ============================================

export default function AdminLPCreditsPage() {
  const router = useRouter()

  // Data state
  const [items, setItems] = useState<LPCreditItem[]>([])
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab / filter state
  const [activeTab, setActiveTab] = useState('all')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  // Sort state
  const [sortBy, setSortBy] = useState('creditedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Dedup refs
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef('')

  // ============================================
  // Data fetching
  // ============================================

  const fetchData = useCallback(
    async (force = false) => {
      const fetchKey = `${activeTab}-${page}-${sortBy}-${sortOrder}-${JSON.stringify(filterValues)}`

      if (fetchingRef.current) return
      if (!force && lastFetchRef.current === fetchKey) return

      fetchingRef.current = true
      lastFetchRef.current = fetchKey
      setLoading(true)

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
        })

        // Tab filter maps to eventType
        if (activeTab !== 'all') {
          params.set('eventType', activeTab)
        }

        // Append advanced filters
        if (filterValues.wallet) params.set('wallet', filterValues.wallet)
        if (filterValues.pair) params.set('pair', filterValues.pair)
        if (filterValues.status) params.set('status', filterValues.status)
        if (filterValues.dateFrom) params.set('dateFrom', filterValues.dateFrom)
        if (filterValues.dateTo) params.set('dateTo', filterValues.dateTo)

        const [creditsRes, summaryRes] = await Promise.all([
          fetch(`/api/admin/lp-credits?${params}`),
          fetch('/api/admin/lp-credits/summary'),
        ])

        if (creditsRes.status === 401 || summaryRes.status === 401) {
          router.push('/admin/login')
          return
        }

        const [creditsData, summaryData] = await Promise.all([
          creditsRes.json(),
          summaryRes.json(),
        ])

        if (creditsData.success) {
          setItems(creditsData.data?.items || [])
          setTotalPages(creditsData.pagination?.totalPages || 1)
          setTotal(creditsData.pagination?.total || 0)
        }

        if (summaryData.success) {
          setStats(summaryData.data || null)
        }
      } catch (err) {
        console.error('Failed to fetch LP credits:', err)
      }
      setLoading(false)
      fetchingRef.current = false
    },
    [activeTab, page, sortBy, sortOrder, filterValues, router]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when tab or filters change
  useEffect(() => {
    lastFetchRef.current = ''
    setPage(1)
  }, [activeTab, filterValues])

  // ============================================
  // Handlers
  // ============================================

  const handleRefresh = () => {
    lastFetchRef.current = ''
    fetchData(true)
  }

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    lastFetchRef.current = ''
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
  }

  const handleFilterChange = (values: Record<string, string>) => {
    setFilterValues(values)
    lastFetchRef.current = ''
  }

  const handleFilterClear = () => {
    setFilterValues({})
    lastFetchRef.current = ''
  }

  // ============================================
  // Tabs config
  // ============================================

  const tabs = useMemo(
    () => [
      {
        key: 'all',
        label: 'All',
        count: stats?.totalCredits,
      },
      {
        key: 'lp_stake',
        label: 'LP Stake',
        count: stats?.byEventType?.lp_stake?.count,
      },
      {
        key: 'swap',
        label: 'Swap',
        count: stats?.byEventType?.swap?.count,
      },
      {
        key: 'other',
        label: 'Other',
        count: stats?.byEventType?.other?.count,
      },
    ],
    [stats]
  )

  // ============================================
  // Unique pairs for filter dropdown
  // ============================================

  const pairOptions = useMemo(() => {
    const pairs = stats?.byPair ? Object.keys(stats.byPair) : []
    return [
      { value: '', label: 'All Pairs' },
      ...pairs.map((p) => ({ value: p, label: p })),
    ]
  }, [stats])

  // ============================================
  // Filter config
  // ============================================

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        key: 'wallet',
        type: 'text' as const,
        label: 'Wallet',
        placeholder: 'Search wallet address...',
      },
      {
        key: 'pair',
        type: 'select' as const,
        label: 'Pair',
        options: pairOptions,
      },
      {
        key: 'status',
        type: 'select' as const,
        label: 'Status',
        options: [
          { value: '', label: 'All Statuses' },
          { value: 'credited', label: 'Credited' },
          { value: 'reversed', label: 'Reversed' },
        ],
      },
      {
        key: 'date',
        type: 'date-range' as const,
        labelFrom: 'From',
        labelTo: 'To',
      },
    ],
    [pairOptions]
  )

  // ============================================
  // Table columns
  // ============================================

  const columns: Column<LPCreditItem>[] = useMemo(
    () => [
      {
        key: 'wallet',
        header: 'Wallet',
        render: (item) => (
          <span className="font-mono text-xs sm:text-sm" title={item.wallet}>
            {formatWallet(item.wallet)}
          </span>
        ),
      },
      {
        key: 'txHash',
        header: 'TX Hash',
        render: (item) => (
          <a
            href={`https://suiscan.xyz/mainnet/tx/${item.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs sm:text-sm text-[var(--accent)] hover:underline"
            title={item.txHash}
          >
            {formatTxHash(item.txHash)}
          </a>
        ),
      },
      {
        key: 'eventType',
        header: 'Event',
        render: (item) => (
          <StatusBadge
            status={item.eventType === 'lp_stake' ? 'ready' : item.eventType === 'swap' ? 'manual' : 'pending'}
            label={item.eventType.replace(/_/g, ' ')}
          />
        ),
      },
      {
        key: 'pair',
        header: 'Pair',
        render: (item) => (
          <span className="text-xs sm:text-sm whitespace-nowrap">{item.pair}</span>
        ),
      },
      {
        key: 'amountUSD',
        header: 'Amount USD',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--success)] text-xs sm:text-sm font-medium">
            ${(item.amountUSD || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: 'spinsCredited',
        header: 'Spins',
        sortable: true,
        render: (item) => (
          <span className="text-xs sm:text-sm font-medium">{item.spinsCredited}</span>
        ),
      },
      {
        key: 'ratePerSpin',
        header: 'Rate',
        render: (item) => (
          <span className="text-[var(--text-secondary)] text-xs sm:text-sm">${item.ratePerSpin}/spin</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'creditedAt',
        header: 'Date',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] text-xs sm:text-sm whitespace-nowrap">
            {formatDate(item.creditedAt)}
          </span>
        ),
      },
    ],
    []
  )

  // ============================================
  // Render
  // ============================================

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">LP Credits</h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">
            View LP staking and swap credit history
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn-ghost self-start sm:self-auto text-sm sm:text-base"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      {loading && !stats ? (
        <SkeletonCardGrid count={4} />
      ) : (
        stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[var(--accent)] opacity-70">
                  <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Total Credits</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--accent)]">
                {(stats.totalCredits || 0).toLocaleString()}
              </p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-yellow-400 opacity-70">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Total Spins</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                {(stats.totalSpinsCredited || 0).toLocaleString()}
              </p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[var(--success)] opacity-70">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Total USD</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--success)]">
                ${(stats.totalAmountUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-blue-400 opacity-70">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Unique Wallets</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-400">
                {(stats.uniqueWallets || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )
      )}

      {/* Tabs */}
      <div className="mb-3 sm:mb-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} columns={9} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No LP credits found"
            message={
              activeTab !== 'all'
                ? `No credits with event type "${activeTab.replace(/_/g, ' ')}"`
                : Object.values(filterValues).some(Boolean)
                ? 'No credits match your current filters. Try adjusting or clearing them.'
                : 'No LP credits have been recorded yet.'
            }
            icon={Zap}
          />
        ) : (
          <>
            <AdminTable<LPCreditItem>
              columns={columns}
              data={items}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyState={
                <EmptyState title="No LP credits found" message="No LP credits to display." icon={Zap} />
              }
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 sm:p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
