'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Users, DollarSign, Coins } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, SkeletonCardGrid, EmptyState } from '@/components/ui'
import {
  AdminTable,
  Tabs,
  FilterBar,
  StatusBadge,
  ConfirmModal,
  BulkActionBar,
} from '@/components/admin'
import type { Column } from '@/components/admin'
import type { FilterConfig } from '@/components/admin'

// ============================================
// Types
// ============================================

interface AffiliateReward {
  _id: string
  referrerWallet: string
  refereeWallet: string
  fromWallet?: string
  originalPrizeUSD?: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  paidAt?: string
  createdAt: string
}

interface Stats {
  pendingTweet: number
  ready: number
  paid: number
  pendingVICT: number
  pendingUSD: number
}

// ============================================
// Helpers
// ============================================

const formatWallet = (w: string) => (w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-')
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// ============================================
// Page Component
// ============================================

export default function AdminAffiliatesPage() {
  const router = useRouter()

  // Data state
  const [rewards, setRewards] = useState<AffiliateReward[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab / filter state
  const [activeTab, setActiveTab] = useState('all')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Payout modal state
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [paying, setPaying] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState('createdAt')
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
          status: activeTab,
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
        })

        // Append advanced filters
        if (filterValues.tweetStatus) params.set('tweetStatus', filterValues.tweetStatus)
        if (filterValues.dateFrom) params.set('dateFrom', filterValues.dateFrom)
        if (filterValues.dateTo) params.set('dateTo', filterValues.dateTo)

        const res = await fetch(`/api/admin/affiliates?${params}`)
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }

        const data = await res.json()
        if (data.success) {
          setRewards(data.data?.items || [])
          setStats(data.data?.stats || null)
          setTotalPages(data.pagination?.totalPages || 1)
          setTotal(data.pagination?.total || 0)
        }
      } catch (err) {
        console.error('Failed to fetch affiliates:', err)
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
    setSelectedIds([])
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

  // Only allow selecting rewards that are "ready" for payout
  const selectableRewards = useMemo(
    () => rewards.filter((r) => r.payoutStatus === 'ready'),
    [rewards]
  )

  const handleSelectChange = (ids: string[]) => {
    // Only keep IDs that belong to "ready" rewards
    const readyIdSet = new Set(selectableRewards.map((r) => r._id))
    setSelectedIds(ids.filter((id) => readyIdSet.has(id)))
  }

  const handleOpenPayModal = () => {
    if (!selectedIds.length) return
    setTxHash('')
    setPayModalOpen(true)
  }

  const handlePay = async () => {
    if (!selectedIds.length) return

    setPaying(true)
    try {
      const res = await fetch('/api/admin/affiliates/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: selectedIds, txHash: txHash || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedIds([])
        setTxHash('')
        setPayModalOpen(false)
        lastFetchRef.current = ''
        fetchData(true)
      } else {
        console.error(data.error || 'Failed to mark as paid')
      }
    } catch (err) {
      console.error('Network error during payout:', err)
    }
    setPaying(false)
  }

  // ============================================
  // Tabs config
  // ============================================

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: stats ? stats.pendingTweet + stats.ready + stats.paid : undefined },
      { key: 'pending_tweet', label: 'Pending Tweet', count: stats?.pendingTweet },
      { key: 'ready', label: 'Ready', count: stats?.ready },
      { key: 'paid', label: 'Paid', count: stats?.paid },
    ],
    [stats]
  )

  // ============================================
  // Filter config
  // ============================================

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        key: 'date',
        type: 'date-range' as const,
        labelFrom: 'From',
        labelTo: 'To',
      },
      {
        key: 'tweetStatus',
        type: 'select' as const,
        label: 'Tweet Status',
        options: [
          { value: '', label: 'All Tweets' },
          { value: 'pending', label: 'Pending' },
          { value: 'clicked', label: 'Clicked' },
          { value: 'completed', label: 'Completed' },
        ],
      },
    ],
    []
  )

  // ============================================
  // Table columns
  // ============================================

  const columns: Column<AffiliateReward>[] = useMemo(
    () => [
      {
        key: 'referrerWallet',
        header: 'Referrer',
        sortable: true,
        render: (item) => (
          <span className="font-mono text-xs sm:text-sm" title={item.referrerWallet}>
            {formatWallet(item.referrerWallet)}
          </span>
        ),
      },
      {
        key: 'refereeWallet',
        header: 'Referee',
        render: (item) => (
          <span className="font-mono text-xs sm:text-sm text-[var(--text-secondary)]" title={item.refereeWallet}>
            {formatWallet(item.refereeWallet)}
          </span>
        ),
      },
      {
        key: 'rewardAmountVICT',
        header: 'VICT',
        sortable: true,
        render: (item) => (
          <span className="text-xs sm:text-sm whitespace-nowrap">
            {(item.rewardAmountVICT || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'rewardValueUSD',
        header: 'USD Value',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--success)] text-xs sm:text-sm font-medium">
            ${(item.rewardValueUSD || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: 'tweetStatus',
        header: 'Tweet',
        render: (item) => (
          <StatusBadge
            status={
              item.tweetStatus === 'completed'
                ? 'distributed'
                : item.tweetStatus === 'clicked'
                ? 'pending_approval'
                : 'pending'
            }
            label={item.tweetStatus}
          />
        ),
      },
      {
        key: 'payoutStatus',
        header: 'Payout',
        sortable: true,
        render: (item) => <StatusBadge status={item.payoutStatus} />,
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        render: (item) => (
          <span className="text-[var(--text-secondary)] text-xs sm:text-sm whitespace-nowrap">
            {formatDate(item.createdAt)}
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
          <h2 className="text-xl sm:text-2xl font-bold">Affiliate Rewards</h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">
            Manage referral commissions and payouts
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
        <SkeletonCardGrid count={5} />
      ) : (
        stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-yellow-400 opacity-70">
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Pending Tweet</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                {stats.pendingTweet}
              </p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-blue-400 opacity-70">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Ready to Pay</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-400">{stats.ready}</p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[var(--success)] opacity-70">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Paid</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--success)]">{stats.paid}</p>
            </div>
            <div className="card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-white opacity-50">
                  <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Pending VICT</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
                {(stats.pendingVICT || 0).toLocaleString()}
              </p>
            </div>
            <div className="card p-3 sm:p-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[var(--accent)] opacity-70">
                  <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">Pending USD</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--accent)]">
                ${(stats.pendingUSD || 0).toFixed(2)}
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
          <SkeletonTable rows={10} columns={7} />
        ) : rewards.length === 0 ? (
          <EmptyState
            title="No rewards found"
            message={
              activeTab !== 'all'
                ? `No rewards with status "${activeTab.replace(/_/g, ' ')}"`
                : Object.values(filterValues).some(Boolean)
                ? 'No rewards match your current filters. Try adjusting or clearing them.'
                : 'No affiliate rewards have been generated yet.'
            }
            icon={Users}
          />
        ) : (
          <>
            <AdminTable<AffiliateReward>
              columns={columns}
              data={rewards}
              selectable={selectableRewards.length > 0}
              selectedIds={selectedIds}
              onSelectChange={handleSelectChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyState={
                <EmptyState title="No rewards found" message="No affiliate rewards to display." icon={Users} />
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

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedIds.length}
        actions={[
          {
            label: `Mark ${selectedIds.length} as Paid`,
            onClick: handleOpenPayModal,
            variant: 'success',
            disabled: selectedIds.length === 0,
          },
        ]}
        onClear={() => setSelectedIds([])}
      />

      {/* Payout Confirm Modal */}
      <ConfirmModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onConfirm={handlePay}
        title="Confirm Bulk Payout"
        description={`You are about to mark ${selectedIds.length} affiliate reward${
          selectedIds.length !== 1 ? 's' : ''
        } as paid. This action cannot be undone.`}
        confirmLabel={paying ? 'Processing...' : 'Mark as Paid'}
        confirmVariant="success"
        loading={paying}
        inputLabel="Transaction Hash (optional)"
        inputPlaceholder="0x..."
        inputValue={txHash}
        onInputChange={setTxHash}
        inputRequired={false}
      />
    </>
  )
}
