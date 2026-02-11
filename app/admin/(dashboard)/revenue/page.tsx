'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, DollarSign, ExternalLink, Download, ArrowDownToLine, X, Inbox, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { SkeletonCardGrid, SkeletonTable, EmptyState, Pagination, PaginationInfo } from '@/components/ui'
import { AdminTable, StatusBadge, BulkActionBar } from '@/components/admin'
import type { Column } from '@/components/admin'

// ----------------------------------------
// Types
// ----------------------------------------

interface ChainTx {
  _id: string
  txHash: string
  sender: string
  amountSUI: number
  amountMIST: string
  suggestedSpins: number
  timestamp: string
  success: boolean
  dbStatus: string
  paymentId: string | null
  spinsCredited: number
  claimedBy: string | null
  manualCredit: boolean
  creditedByAdmin: string | null
}

interface ChainStats {
  total: number
  newCount: number
  creditedCount: number
  totalSUI: number
  newSUI: number
}

// Preview TX from sync_preview
interface PreviewTx {
  txHash: string
  sender: string
  recipient: string
  amountMIST: string
  amountSUI: number
  timestamp: string
  blockNumber: number
  success: boolean
  suggestedSpins: number
}

interface PageBreakdown {
  page: number
  rpcBlocks: number
  suiTxs: number
  filtered: number
}

// ----------------------------------------
// Constants
// ----------------------------------------

const STATUS_PILLS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'credited', label: 'Credited' },
] as const

// ----------------------------------------
// Component
// ----------------------------------------

export default function AdminRevenuePage() {
  const router = useRouter()

  // === Chain TXs (from /api/admin/revenue/incoming) ===
  const [transactions, setTransactions] = useState<ChainTx[]>([])
  const [chainStats, setChainStats] = useState<ChainStats>({ total: 0, newCount: 0, creditedCount: 0, totalSUI: 0, newSUI: 0 })
  const [rate, setRate] = useState<number>(1)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Status filter
  const [statusFilter, setStatusFilter] = useState('')

  // Sync preview modal
  const [syncing, setSyncing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTxs, setPreviewTxs] = useState<PreviewTx[]>([])
  const [previewTotalSUI, setPreviewTotalSUI] = useState(0)
  const [previewHasMore, setPreviewHasMore] = useState(false)
  const [previewCursor, setPreviewCursor] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [pageBreakdown, setPageBreakdown] = useState<PageBreakdown[]>([])
  const [duplicatesFiltered, setDuplicatesFiltered] = useState(0)
  const [totalRpcBlocks, setTotalRpcBlocks] = useState(0)

  // Selection + bulk credit
  const [selectedTxHashes, setSelectedTxHashes] = useState<string[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ credited: number; skipped: number; failed: number; type?: 'credit' | 'sync' } | null>(null)

  // Dedup refs
  const txFetchingRef = useRef(false)
  const lastTxFetchRef = useRef('')

  const suiNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet'

  // ---- Fetch chain TXs from DB ----
  const fetchTxs = useCallback(async () => {
    const fetchKey = `${page}-${statusFilter}`
    if (txFetchingRef.current) return
    if (lastTxFetchRef.current === fetchKey) return

    txFetchingRef.current = true
    lastTxFetchRef.current = fetchKey
    setTxLoading(true)

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/revenue/incoming?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) {
        const txs: ChainTx[] = json.data.transactions.map((tx: ChainTx) => ({
          ...tx,
          _id: tx.txHash,
        }))
        setTransactions(txs)
        setRate(json.data.rate || 1)
        setChainStats(json.data.stats)
        setLastSyncAt(json.data.lastSyncAt || null)
        setTotalPages(json.pagination.totalPages)
        setTotal(json.pagination.total)
      }
    } catch (err) { console.error(err) }
    setTxLoading(false)
    txFetchingRef.current = false
  }, [page, statusFilter, router])

  useEffect(() => { fetchTxs() }, [fetchTxs])

  // ---- Sync Preview (step 1) ----
  const handleSyncPreview = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/revenue/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_preview' }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) {
        setPreviewTxs(json.data.preview)
        setPreviewTotalSUI(json.data.totalSUI)
        setPreviewHasMore(json.data.hasMore)
        setPreviewCursor(json.data.newCursor)
        setPageBreakdown(json.data.pages || [])
        setDuplicatesFiltered(json.data.duplicatesFiltered || 0)
        setTotalRpcBlocks(json.data.totalRpcBlocks || 0)
        setPreviewPage(1)
        setPreviewOpen(true)
      } else {
        alert(json.error || 'Sync preview failed')
      }
    } catch { alert('Network error during sync') }
    setSyncing(false)
  }, [router])

  // ---- Sync Confirm (step 2) ----
  const handleSyncConfirm = useCallback(async () => {
    setConfirming(true)
    try {
      const res = await fetch('/api/admin/revenue/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_confirm',
          transactions: previewTxs.map((tx) => ({
            txHash: tx.txHash,
            sender: tx.sender,
            recipient: tx.recipient,
            amountMIST: tx.amountMIST,
            amountSUI: tx.amountSUI,
            timestamp: tx.timestamp,
            blockNumber: tx.blockNumber,
            success: tx.success,
          })),
          newCursor: previewCursor,
        }),
      })
      if (res.status === 401) { router.push('/admin/login'); return }
      const json = await res.json()
      if (json.success) {
        setLastSyncAt(json.data.lastSyncAt)
        setPreviewOpen(false)
        setPreviewTxs([])
        // Refresh table
        lastTxFetchRef.current = ''
        fetchTxs()
        // Show result with verification info
        if (json.data.synced > 0 || json.data.duplicatesSkipped > 0 || json.data.rejected > 0) {
          setBulkResult({
            credited: json.data.synced,
            skipped: json.data.duplicatesSkipped || 0,
            failed: json.data.rejected || 0,
            type: 'sync',
          })
        }
      } else {
        alert(json.error || 'Sync confirm failed')
      }
    } catch { alert('Network error during confirm') }
    setConfirming(false)
  }, [previewTxs, previewCursor, router, fetchTxs])

  // ---- Close preview (discard, no save) ----
  const handlePreviewClose = useCallback(() => {
    setPreviewOpen(false)
    setPreviewTxs([])
    setPageBreakdown([])
    setDuplicatesFiltered(0)
    setTotalRpcBlocks(0)
    setPreviewPage(1)
  }, [])

  // ---- Status filter ----
  const handleStatusPill = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
    lastTxFetchRef.current = ''
  }, [])

  // ---- Page change ----
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    lastTxFetchRef.current = ''
  }, [])

  // ---- Selection (only 'new' status TXs) ----
  const handleSelect = useCallback((ids: string[]) => {
    const selectableIds = ids.filter((id) => {
      const tx = transactions.find((t) => t._id === id)
      return tx && tx.dbStatus === 'new'
    })
    setSelectedTxHashes(selectableIds)
  }, [transactions])

  // ---- Bulk credit ----
  const handleBulkCredit = useCallback(async () => {
    if (selectedTxHashes.length === 0) return
    setBulkProcessing(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/admin/revenue/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'credit', txHashes: selectedTxHashes }),
      })
      const json = await res.json()
      if (json.success) {
        setBulkResult({ credited: json.data.credited, skipped: json.data.skipped, failed: json.data.failed })
        setSelectedTxHashes([])
        lastTxFetchRef.current = ''
        fetchTxs()
      } else {
        alert(json.error || 'Bulk credit failed')
      }
    } catch { alert('Network error') }
    setBulkProcessing(false)
  }, [selectedTxHashes, fetchTxs])

  // ---- Refresh all ----
  const handleRefresh = useCallback(() => {
    lastTxFetchRef.current = ''
    fetchTxs()
  }, [fetchTxs])

  // ---- Table columns ----
  const columns = useMemo<Column<ChainTx>[]>(() => [
    {
      key: 'sender',
      header: 'Sender',
      render: (tx) => (
        <span className="font-mono text-xs sm:text-sm">
          {tx.sender.slice(0, 8)}...{tx.sender.slice(-4)}
        </span>
      ),
    },
    {
      key: 'txHash',
      header: 'TX Hash',
      render: (tx) => (
        <a
          href={`https://suiscan.xyz/${suiNetwork}/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-[var(--accent)] hover:underline"
        >
          {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      ),
    },
    {
      key: 'amountSUI',
      header: 'Amount',
      render: (tx) => (
        <span className="text-[var(--accent)] font-medium">{tx.amountSUI.toFixed(2)} SUI</span>
      ),
    },
    {
      key: 'suggestedSpins',
      header: 'Spins',
      render: (tx) => (
        <span className="text-[var(--warning)]">
          {tx.dbStatus !== 'new' ? tx.spinsCredited : tx.suggestedSpins}
        </span>
      ),
    },
    {
      key: 'dbStatus',
      header: 'Status',
      render: (tx) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={tx.dbStatus} />
          {tx.dbStatus === 'claimed' && (
            <span className="text-[10px] text-[var(--text-secondary)]">
              {tx.manualCredit
                ? `by ${tx.creditedByAdmin || 'admin'}`
                : tx.claimedBy
                  ? 'user claim'
                  : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Date',
      render: (tx) => (
        <span className="text-[var(--text-secondary)] whitespace-nowrap">
          {new Date(tx.timestamp).toLocaleDateString()}
        </span>
      ),
    },
  ], [suiNetwork])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Revenue</h2>
          <p className="text-text-secondary text-sm sm:text-base">Track payments and chain transactions</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={txLoading}
            className="btn btn-secondary text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSyncPreview}
            disabled={syncing}
            className="btn btn-primary text-sm"
          >
            <ArrowDownToLine className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
            {syncing ? 'Fetching...' : 'Sync from Chain'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {txLoading && chainStats.total === 0 ? (
        <div className="mb-6 sm:mb-8">
          <SkeletonCardGrid count={4} />
        </div>
      ) : chainStats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="card p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Total SUI</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-[var(--accent)] truncate">
                  {chainStats.totalSUI.toFixed(2)} SUI
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                  {chainStats.total} transactions
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
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">New</p>
                <p className={`text-lg sm:text-xl md:text-2xl font-bold mt-1 ${chainStats.newCount > 0 ? 'text-blue-400' : ''}`}>
                  {chainStats.newCount}
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                  {chainStats.newSUI.toFixed(2)} SUI
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                <Inbox className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
          <div className="card p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Credited</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 text-green-400">
                  {chainStats.creditedCount}
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                  spins distributed
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 text-green-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
          <div className="card p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm">Rate</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1">
                  {rate} SUI
                </p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">per spin</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-[var(--card)] text-[var(--text-secondary)] flex-shrink-0">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action / sync result */}
      {bulkResult && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm">
          <span className="text-[var(--success)] font-medium">
            {bulkResult.credited} {bulkResult.type === 'sync' ? 'synced' : 'credited'}
          </span>
          {bulkResult.skipped > 0 && (
            <span className="text-[var(--text-secondary)]">
              , {bulkResult.skipped} {bulkResult.type === 'sync' ? 'duplicates skipped' : 'skipped'}
            </span>
          )}
          {bulkResult.failed > 0 && (
            <span className="text-[var(--error)]">
              , {bulkResult.failed} {bulkResult.type === 'sync' ? 'rejected (chain verify failed)' : 'failed'}
            </span>
          )}
          <button
            onClick={() => setBulkResult(null)}
            className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedTxHashes.length}
        actions={[
          {
            label: `Credit Selected (${selectedTxHashes.length})`,
            onClick: handleBulkCredit,
            variant: 'success',
            loading: bulkProcessing,
          },
        ]}
        onClear={() => setSelectedTxHashes([])}
      />

      {/* Stats summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span>Rate: 1 spin per {rate} SUI</span>
          {chainStats.total > 0 && (
            <>
              <span className="text-[var(--border)]">|</span>
              <span>{chainStats.total} total</span>
              <span className="text-blue-400 font-medium">{chainStats.newCount} new</span>
              <span className="text-green-400">{chainStats.creditedCount} credited</span>
              <span>{chainStats.totalSUI.toFixed(2)} SUI</span>
            </>
          )}
          {lastSyncAt && (
            <>
              <span className="text-[var(--border)]">|</span>
              <span>Last sync: {new Date(lastSyncAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => handleStatusPill(pill.value)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              statusFilter === pill.value
                ? 'bg-[var(--accent)] text-[var(--background)]'
                : 'bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] border border-[var(--border)]'
            }`}
          >
            {pill.label}
            {pill.value === 'new' && chainStats.newCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {chainStats.newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chain TXs Table */}
      <div className="card overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">
            Chain Transactions
            {total > 0 && (
              <span className="text-xs text-[var(--text-secondary)] font-normal ml-2">
                ({total}{statusFilter ? ` ${statusFilter}` : ' total'})
              </span>
            )}
          </h3>
          {txLoading && (
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
          )}
        </div>

        {txLoading && transactions.length === 0 ? (
          <SkeletonTable rows={5} columns={6} />
        ) : (
          <AdminTable<ChainTx>
            columns={columns}
            data={transactions}
            selectable
            selectedIds={selectedTxHashes}
            onSelectChange={handleSelect}
            emptyState={
              <EmptyState
                title={statusFilter ? `No ${statusFilter} transactions` : 'No chain transactions'}
                message={
                  statusFilter
                    ? `No transactions with "${statusFilter}" status. Try a different filter or sync from chain.`
                    : 'No SUI transfers found. Click "Sync from Chain" to fetch transactions.'
                }
                icon={Download}
              />
            }
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-[var(--border)]">
            <PaginationInfo page={page} limit={limit} total={total} />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* ====== Sync Preview Modal ====== */}
      {previewOpen && (() => {
        const PREVIEW_PAGE_SIZE = 20
        const previewTotalPages = Math.ceil(previewTxs.length / PREVIEW_PAGE_SIZE)
        const previewStart = (previewPage - 1) * PREVIEW_PAGE_SIZE
        const previewEnd = Math.min(previewStart + PREVIEW_PAGE_SIZE, previewTxs.length)
        const visibleTxs = previewTxs.slice(previewStart, previewEnd)
        const totalNonSuiFiltered = pageBreakdown.reduce((sum, p) => sum + p.filtered, 0)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handlePreviewClose} />

            {/* Modal */}
            <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-lg font-bold">
                    {previewTxs.length > 0
                      ? `${previewTxs.length} new SUI transaction${previewTxs.length !== 1 ? 's' : ''} found`
                      : 'No new transactions'}
                  </h3>
                  {previewTxs.length > 0 && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {previewTotalSUI.toFixed(4)} SUI total
                      {pageBreakdown.length > 0 && (
                        <span>
                          {' '}· {pageBreakdown.length} RPC page{pageBreakdown.length !== 1 ? 's' : ''}
                          {totalNonSuiFiltered > 0 && `, ${totalNonSuiFiltered} non-SUI filtered`}
                          {duplicatesFiltered > 0 && `, ${duplicatesFiltered} duplicate${duplicatesFiltered !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </p>
                  )}
                  {previewTxs.length === 0 && duplicatesFiltered > 0 && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {duplicatesFiltered} already in DB
                    </p>
                  )}
                </div>
                <button onClick={handlePreviewClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Page breakdown chips */}
              {pageBreakdown.length > 1 && (
                <div className="px-4 sm:px-5 pt-3 flex flex-wrap gap-1.5">
                  {pageBreakdown.map((p) => (
                    <span
                      key={p.page}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]"
                    >
                      <span className="font-medium text-[var(--text-primary)]">P{p.page}</span>
                      {p.rpcBlocks}→{p.suiTxs} SUI
                      {p.filtered > 0 && (
                        <span className="text-[var(--warning)]">({p.filtered} filtered)</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Body — paginated list */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {previewTxs.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    <ArrowDownToLine className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Chain is fully synced. No new transactions since last sync.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {visibleTxs.map((tx) => (
                        <div
                          key={tx.txHash}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-[var(--text-secondary)]">
                                {tx.sender.slice(0, 8)}...{tx.sender.slice(-4)}
                              </span>
                              <a
                                href={`https://suiscan.xyz/${suiNetwork}/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent)] hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {new Date(tx.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[var(--accent)] font-medium text-sm">{tx.amountSUI.toFixed(4)} SUI</p>
                            <p className="text-xs text-[var(--warning)]">{tx.suggestedSpins} spin{tx.suggestedSpins !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Preview pagination */}
                    {previewTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                        <span className="text-xs text-[var(--text-secondary)]">
                          Showing {previewStart + 1}-{previewEnd} of {previewTxs.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                            disabled={previewPage <= 1}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-[var(--text-secondary)] px-2">
                            {previewPage} / {previewTotalPages}
                          </span>
                          <button
                            onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                            disabled={previewPage >= previewTotalPages}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {previewHasMore && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-xs text-[var(--warning)]">
                    More transactions available on chain. Save these first, then sync again.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[var(--border)]">
                <button
                  onClick={handlePreviewClose}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                {previewTxs.length > 0 && (
                  <button
                    onClick={handleSyncConfirm}
                    disabled={confirming}
                    className="btn btn-primary text-sm"
                  >
                    {confirming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      `Save ${previewTxs.length} to DB`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
