'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { AdminTable, FilterBar, type Column, type FilterConfig } from '@/components/admin'
import { Pagination, PaginationInfo, SkeletonTable, EmptyState } from '@/components/ui'

// ============================================
// Types
// ============================================

interface AuditLogEntry {
  _id: string
  action: string
  adminUsername: string
  targetType: string
  targetId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string
  createdAt: string
}

interface LogsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ============================================
// Action color mapping
// ============================================

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  distribute_prize: {
    bg: 'bg-[var(--success)]/10',
    text: 'text-[var(--success)]',
    border: 'border-[var(--success)]/30',
  },
  bulk_distribute_prize: {
    bg: 'bg-[var(--success)]/10',
    text: 'text-[var(--success)]',
    border: 'border-[var(--success)]/30',
  },
  credit_spins: {
    bg: 'bg-blue-400/10',
    text: 'text-blue-400',
    border: 'border-blue-400/30',
  },
  update_config: {
    bg: 'bg-purple-400/10',
    text: 'text-purple-400',
    border: 'border-purple-400/30',
  },
  approve_payment: {
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    border: 'border-amber-400/30',
  },
  reject_payment: {
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    border: 'border-amber-400/30',
  },
  award_badge: {
    bg: 'bg-cyan-400/10',
    text: 'text-cyan-400',
    border: 'border-cyan-400/30',
  },
  mark_affiliates_paid: {
    bg: 'bg-[var(--success)]/10',
    text: 'text-[var(--success)]',
    border: 'border-[var(--success)]/30',
  },
}

const DEFAULT_ACTION_COLOR = {
  bg: 'bg-gray-400/10',
  text: 'text-gray-400',
  border: 'border-gray-400/30',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] || DEFAULT_ACTION_COLOR
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
    >
      {action.replace(/_/g, ' ')}
    </span>
  )
}

// ============================================
// JSON Diff Viewer
// ============================================

function JsonDiff({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) {
    return <p className="text-[var(--text-secondary)] text-xs italic">No detail data available.</p>
  }

  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Before */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          Before
        </p>
        {before ? (
          <pre className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] sm:text-xs overflow-x-auto max-h-64 overflow-y-auto text-[var(--error)]/80">
            {JSON.stringify(before, null, 2)}
          </pre>
        ) : (
          <p className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] sm:text-xs text-[var(--text-secondary)] italic">
            N/A (new entry)
          </p>
        )}
      </div>

      {/* After */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          After
        </p>
        {after ? (
          <pre className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] sm:text-xs overflow-x-auto max-h-64 overflow-y-auto text-[var(--success)]/80">
            {JSON.stringify(after, null, 2)}
          </pre>
        ) : (
          <p className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[10px] sm:text-xs text-[var(--text-secondary)] italic">
            N/A (deleted)
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Filter Definitions
// ============================================

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'action',
    type: 'select',
    label: 'Action Type',
    options: [
      { value: '', label: 'All Actions' },
      { value: 'distribute_prize', label: 'Distribute Prize' },
      { value: 'bulk_distribute_prize', label: 'Bulk Distribute' },
      { value: 'credit_spins', label: 'Credit Spins' },
      { value: 'update_config', label: 'Update Config' },
      { value: 'approve_payment', label: 'Approve Payment' },
      { value: 'reject_payment', label: 'Reject Payment' },
      { value: 'award_badge', label: 'Award Badge' },
      { value: 'mark_affiliates_paid', label: 'Mark Affiliates Paid' },
    ],
  },
  {
    key: 'adminUsername',
    type: 'text',
    label: 'Admin Username',
    placeholder: 'Search by admin...',
  },
  {
    key: 'targetType',
    type: 'select',
    label: 'Target Type',
    options: [
      { value: '', label: 'All Targets' },
      { value: 'user', label: 'User' },
      { value: 'spin', label: 'Spin' },
      { value: 'payment', label: 'Payment' },
      { value: 'config', label: 'Config' },
      { value: 'badge', label: 'Badge' },
      { value: 'affiliate', label: 'Affiliate' },
    ],
  },
  {
    key: 'date',
    type: 'date-range',
    labelFrom: 'Date From',
    labelTo: 'Date To',
  },
]

const INITIAL_FILTERS: Record<string, string> = {
  action: '',
  adminUsername: '',
  targetType: '',
  dateFrom: '',
  dateTo: '',
}

// ============================================
// Main Page Component
// ============================================

export default function AuditLogsPage() {
  const router = useRouter()

  // Data state
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState<LogsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<Record<string, string>>(INITIAL_FILTERS)

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sort state
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Dedup ref to prevent double-fetch in strict mode
  const fetchRef = useRef(0)

  // ============================================
  // Fetch logs
  // ============================================

  const fetchLogs = useCallback(async (page: number = 1) => {
    const fetchId = ++fetchRef.current

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pagination.limit))

      if (filters.action) params.set('action', filters.action)
      if (filters.adminUsername) params.set('adminUsername', filters.adminUsername)
      if (filters.targetType) params.set('targetType', filters.targetType)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const res = await fetch(`/api/admin/logs?${params.toString()}`)

      // Dedup check
      if (fetchRef.current !== fetchId) return

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      const json = await res.json()

      if (json.success) {
        setLogs(json.data?.items || json.data || [])
        setPagination(json.pagination)
      } else {
        setError(json.error || 'Failed to load audit logs')
      }
    } catch {
      if (fetchRef.current === fetchId) {
        setError('Network error. Please try again.')
      }
    } finally {
      if (fetchRef.current === fetchId) {
        setLoading(false)
      }
    }
  }, [filters, pagination.limit, router])

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  // ============================================
  // Handlers
  // ============================================

  const handlePageChange = (page: number) => {
    fetchLogs(page)
  }

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters)
  }

  const handleFilterClear = () => {
    setFilters(INITIAL_FILTERS)
  }

  const handleRowClick = (item: AuditLogEntry) => {
    setExpandedId((prev) => (prev === item._id ? null : item._id))
  }

  // ============================================
  // Column definitions
  // ============================================

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'expand',
      header: '',
      width: '40px',
      render: (item) => (
        <span className="text-[var(--text-secondary)]">
          {expandedId === item._id ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      sortable: true,
      render: (item) => {
        const date = new Date(item.createdAt)
        return (
          <div className="whitespace-nowrap">
            <div className="text-xs sm:text-sm">{date.toLocaleDateString()}</div>
            <div className="text-[10px] sm:text-xs text-[var(--text-secondary)]">
              {date.toLocaleTimeString()}
            </div>
          </div>
        )
      },
    },
    {
      key: 'adminUsername',
      header: 'Admin',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs sm:text-sm text-[var(--accent)]">
          {item.adminUsername}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (item) => <ActionBadge action={item.action} />,
    },
    {
      key: 'targetType',
      header: 'Target',
      sortable: true,
      render: (item) => (
        <div>
          <div className="text-xs sm:text-sm capitalize">{item.targetType}</div>
          <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-mono truncate max-w-[120px] sm:max-w-[180px]">
            {item.targetId}
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (item) => {
        const hasDiff = item.before || item.after
        return (
          <span className={`text-[10px] sm:text-xs ${hasDiff ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
            {hasDiff ? 'Click to expand' : 'No details'}
          </span>
        )
      },
    },
  ]

  // ============================================
  // Render
  // ============================================

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
            Audit Logs
          </h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">
            Track all admin actions and changes
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={FILTER_CONFIGS}
        values={filters}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
          <span>{error}</span>
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : (
          <>
            <AdminTable<AuditLogEntry>
              columns={columns}
              data={logs}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onRowClick={handleRowClick}
              emptyState={
                <EmptyState
                  title="No audit logs found"
                  message="There are no logs matching your filters, or no admin actions have been recorded yet."
                  icon={FileText}
                />
              }
            />

            {/* Expanded Row Details */}
            {expandedId && (
              (() => {
                const expandedLog = logs.find((l) => l._id === expandedId)
                if (!expandedLog) return null
                return (
                  <div className="border-t border-[var(--border)] bg-[var(--card-hover)] p-4 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <span className="text-[var(--text-secondary)]">
                        IP: <span className="font-mono text-[var(--text-primary)]">{expandedLog.ip || 'N/A'}</span>
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        Target ID: <span className="font-mono text-[var(--text-primary)]">{expandedLog.targetId}</span>
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        Full Timestamp:{' '}
                        <span className="text-[var(--text-primary)]">
                          {new Date(expandedLog.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <JsonDiff before={expandedLog.before} after={expandedLog.after} />
                  </div>
                )
              })()
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <PaginationInfo
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </>
  )
}
