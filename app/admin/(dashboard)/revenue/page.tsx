'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react'
import { SkeletonCardGrid, SkeletonTable, EmptyState, Pagination, PaginationInfo } from '@/components/ui'
import { AdminTable, FilterBar, StatusBadge } from '@/components/admin'
import type { Column, FilterConfig } from '@/components/admin'
// Note: Revenue page uses a combined stats+payments API response that doesn't fit the paginated store pattern

interface RevenueStats {
  totalRevenueSUI: number
  totalPayments: number
  todayRevenueSUI: number
  todayPayments: number
  weekRevenueSUI: number
  weekPayments: number
  pendingApproval: number
}

interface Payment {
  _id: string
  txHash: string
  senderWallet: string
  amountSUI: number
  spinsCredited: number
  claimStatus: string
  claimedAt: string
  createdAt: string
}

interface RevenueData {
  stats: RevenueStats
  recentPayments: Payment[]
}

// Filter configuration
const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'claimed', label: 'Claimed' },
      { value: 'pending_approval', label: 'Pending Approval' },
      { value: 'unclaimed', label: 'Unclaimed' },
    ],
  },
  {
    key: 'date',
    type: 'date-range',
    labelFrom: 'From',
    labelTo: 'To',
  },
  {
    key: 'minAmount',
    type: 'text',
    label: 'Min Amount (SUI)',
    placeholder: 'e.g. 5',
  },
]

// Status pill options for quick filter
const STATUS_PILLS = [
  { value: '', label: 'All' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'pending_approval', label: 'Pending' },
] as const

export default function AdminRevenuePage() {
  const router = useRouter()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Sorting
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [activeStatusPill, setActiveStatusPill] = useState('')

  // Deduplication refs
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef('')

  const fetchRevenue = useCallback(async (force = false) => {
    const fetchKey = `${page}-${sortBy}-${sortOrder}-${JSON.stringify(filterValues)}`

    // Prevent duplicate fetches
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

      // Add filter params
      if (filterValues.status) params.set('status', filterValues.status)
      if (filterValues.dateFrom) params.set('dateFrom', filterValues.dateFrom)
      if (filterValues.dateTo) params.set('dateTo', filterValues.dateTo)
      if (filterValues.minAmount) params.set('minAmount', filterValues.minAmount)

      const res = await fetch(`/api/admin/revenue?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setTotalPages(json.pagination?.totalPages || 1)
        setTotal(json.pagination?.total || 0)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
    fetchingRef.current = false
  }, [page, sortBy, sortOrder, filterValues, router])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  // Handle sort toggle
  const handleSort = useCallback((key: string) => {
    setSortOrder((prev) => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
    setSortBy(key)
    setPage(1)
    lastFetchRef.current = '' // Reset dedup
  }, [sortBy])

  // Handle filter changes
  const handleFilterChange = useCallback((values: Record<string, string>) => {
    setFilterValues(values)
    // Sync status pill with filter
    setActiveStatusPill(values.status || '')
    setPage(1)
    lastFetchRef.current = ''
  }, [])

  // Handle filter clear
  const handleFilterClear = useCallback(() => {
    setFilterValues({})
    setActiveStatusPill('')
    setPage(1)
    lastFetchRef.current = ''
  }, [])

  // Handle status pill click
  const handleStatusPill = useCallback((status: string) => {
    setActiveStatusPill(status)
    setFilterValues((prev) => ({ ...prev, status }))
    setPage(1)
    lastFetchRef.current = ''
  }, [])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    lastFetchRef.current = ''
  }, [])

  // Table columns
  const columns = useMemo<Column<Payment>[]>(() => [
    {
      key: 'senderWallet',
      header: 'Wallet',
      render: (p) => (
        <span className="font-mono text-xs sm:text-sm">
          {p.senderWallet.slice(0, 8)}...{p.senderWallet.slice(-4)}
        </span>
      ),
    },
    {
      key: 'amountSUI',
      header: 'Amount',
      sortable: true,
      render: (p) => (
        <span className="text-[var(--accent)] font-medium">{p.amountSUI} SUI</span>
      ),
    },
    {
      key: 'spinsCredited',
      header: 'Spins',
      render: (p) => (
        <span className="text-[var(--warning)]">{p.spinsCredited}</span>
      ),
    },
    {
      key: 'claimStatus',
      header: 'Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.claimStatus} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (p) => (
        <span className="text-[var(--text-secondary)] whitespace-nowrap">
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ], [])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Revenue</h2>
          <p className="text-text-secondary text-sm sm:text-base">Track payments and spin purchases</p>
        </div>
        <button
          onClick={() => { lastFetchRef.current = ''; fetchRevenue(true) }}
          disabled={loading}
          className="btn btn-ghost self-start sm:self-auto text-sm sm:text-base"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading && !data ? (
        <>
          {/* Stats Skeleton */}
          <div className="mb-6 sm:mb-8">
            <SkeletonCardGrid count={4} />
          </div>
          {/* Table Skeleton */}
          <div className="card">
            <div className="p-3 sm:p-4 border-b border-[var(--border)]">
              <h3 className="text-base sm:text-lg font-semibold">Recent Payments</h3>
            </div>
            <SkeletonTable rows={5} columns={5} />
          </div>
        </>
      ) : data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Total Revenue</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-[var(--accent)] truncate">
                    {data.stats?.totalRevenueSUI?.toFixed(2) || 0} SUI
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                    {data.stats?.totalPayments || 0} payments
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Today</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 truncate">
                    {data.stats?.todayRevenueSUI?.toFixed(2) || 0} SUI
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                    {data.stats?.todayPayments || 0} payments
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)] flex-shrink-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">This Week</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 truncate">
                    {data.stats?.weekRevenueSUI?.toFixed(2) || 0} SUI
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                    {data.stats?.weekPayments || 0} payments
                  </p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)] flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
            <div className="card p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Pending</p>
                  <p className={`text-lg sm:text-xl md:text-2xl font-bold mt-1 ${
                    (data.stats?.pendingApproval || 0) > 0 ? 'text-[var(--warning)]' : ''
                  }`}>
                    {data.stats?.pendingApproval || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">awaiting</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${
                  (data.stats?.pendingApproval || 0) > 0
                    ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                    : 'bg-[var(--card)] text-[var(--text-secondary)]'
                }`}>
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {STATUS_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => handleStatusPill(pill.value)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  activeStatusPill === pill.value
                    ? 'bg-[var(--accent)] text-[var(--background)]'
                    : 'bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] border border-[var(--border)]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={FILTER_CONFIGS}
            values={filterValues}
            onChange={handleFilterChange}
            onClear={handleFilterClear}
          />

          {/* Payments Table */}
          <div className="card overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Recent Payments</h3>
              {loading && (
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
              )}
            </div>

            <AdminTable<Payment>
              columns={columns}
              data={data.recentPayments || []}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyState={
                <EmptyState
                  title="No payments found"
                  message={
                    Object.values(filterValues).some(Boolean)
                      ? 'No payments match your current filters. Try adjusting or clearing them.'
                      : 'Payments will appear here once users purchase spins.'
                  }
                  icon={CreditCard}
                />
              }
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-[var(--border)]">
                <PaginationInfo page={page} limit={limit} total={total} />
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
