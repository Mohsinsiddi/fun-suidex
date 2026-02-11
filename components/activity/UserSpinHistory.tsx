'use client'

import { useState, useEffect, useRef } from 'react'
import { ExternalLink, Trophy, Lock, Coins, History, X, Clock, CheckCircle2, Loader2, Zap, Sparkles, Search, CreditCard, AlertCircle, Download } from 'lucide-react'
import { Pagination, PaginationInfo, EmptyState, Modal } from '@/components/ui'

// ----------------------------------------
// Spins types
// ----------------------------------------

interface Spin {
  id: string
  spinType: 'free' | 'purchased' | 'bonus'
  prizeType: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  prizeAmount: number
  prizeValueUSD: number
  lockDuration: string | null
  status: 'pending' | 'distributed' | 'failed'
  distributedTxHash: string | null
  createdAt: string
}

interface Stats {
  totalSpins: number
  totalWins: number
  winRate: string
  totalWinningsUSD: number
}

// ----------------------------------------
// Purchases types
// ----------------------------------------

interface Purchase {
  txHash: string
  amountSUI: number
  amountMIST: string
  creditStatus: 'new' | 'credited' | 'unclaimed' | 'pending_approval' | 'rejected'
  spinsCredited: number
  timestamp: string
  claimedAt: string | null
  rateAtClaim: number | null
  adminNote: string | null
  manualCredit: boolean
}

interface PurchaseStats {
  totalPayments: number
  totalSUI: number
  totalSpinsCredited: number
}

// ----------------------------------------
// Constants
// ----------------------------------------

const prizeIcons = {
  liquid_victory: { Icon: Coins, color: 'text-yellow-500' },
  locked_victory: { Icon: Lock, color: 'text-purple-400' },
  suitrump: { Icon: Trophy, color: 'text-red-400' },
  no_prize: { Icon: X, color: 'text-gray-500' },
}

const lockLabels: Record<string, string> = {
  '1_week': '1W',
  '3_month': '3M',
  '1_year': '1Y',
  '3_year': '3Y',
}

// ----------------------------------------
// Shared helpers
// ----------------------------------------

function formatTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ----------------------------------------
// Main component
// ----------------------------------------

export default function UserSpinHistory() {
  const [activeTab, setActiveTab] = useState<'spins' | 'purchases'>('spins')

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <button
          onClick={() => setActiveTab('spins')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'spins'
              ? 'bg-accent text-black'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-3 h-3" />
          Spins
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'purchases'
              ? 'bg-accent text-black'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          Purchases
        </button>
      </div>

      {activeTab === 'spins' ? <SpinHistoryTab /> : <PurchaseHistoryTab />}
    </div>
  )
}

// ----------------------------------------
// Spin History Tab (existing logic, extracted)
// ----------------------------------------

function SpinHistoryTab() {
  const [spins, setSpins] = useState<Spin[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<string>('')

  const fetchHistory = async (targetPage: number, targetFilter: string) => {
    const fetchKey = `${targetPage}-${targetFilter}`
    if (fetchingRef.current || lastFetchRef.current === fetchKey) return

    fetchingRef.current = true
    lastFetchRef.current = fetchKey
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
        filter: targetFilter,
      })
      const res = await fetch(`/api/spin/history?${params}`)
      const data = await res.json()

      if (data.success) {
        setSpins(data.data?.spins || [])
        if (data.data?.stats) setStats(data.data.stats)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchHistory(1, 'all')
  }, [])

  const handleFilterChange = (newFilter: string) => {
    if (newFilter === filter) return
    setFilter(newFilter)
    setPage(1)
    lastFetchRef.current = ''
    fetchHistory(1, newFilter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return
    setPage(newPage)
    lastFetchRef.current = ''
    fetchHistory(newPage, filter)
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'wins', label: 'Wins' },
    { value: 'no_prize', label: 'No Win' },
  ]

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      {stats && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-muted">
            <span className="text-white font-semibold">{stats.totalSpins}</span> spins
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-green-400 font-semibold">{stats.totalWins}</span> wins
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-yellow-400 font-semibold">${stats.totalWinningsUSD.toFixed(0)}</span> won
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-accent font-semibold">{stats.winRate}%</span> rate
          </span>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === f.value
                ? 'bg-accent text-black'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Spin List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : spins.length === 0 ? (
        <EmptyState
          title="No spins"
          message={filter !== 'all' ? 'Try another filter' : 'Spin the wheel to start!'}
          icon={History}
        />
      ) : (
        <>
          <div className="space-y-1">
            {spins.map((spin) => {
              const { Icon, color } = prizeIcons[spin.prizeType]
              const isWin = spin.prizeType !== 'no_prize'
              const isPending = spin.status === 'pending' && isWin

              return (
                <div
                  key={spin.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>

                  {/* Prize Info */}
                  <div className="flex-1 min-w-0">
                    {isWin ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold text-white">
                          ${spin.prizeValueUSD.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {spin.prizeAmount >= 1000
                            ? `${(spin.prizeAmount / 1000).toFixed(0)}K`
                            : spin.prizeAmount}{' '}
                          {spin.prizeType === 'suitrump' ? 'TRUMP' : 'VICT'}
                        </span>
                        {spin.lockDuration && (
                          <span className="text-[10px] text-purple-400">
                            {lockLabels[spin.lockDuration]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">No prize</span>
                    )}
                  </div>

                  {/* Status & Time */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isWin && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        isPending ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {isPending ? (
                          <><Clock className="w-2.5 h-2.5" /> Pending</>
                        ) : (
                          <><CheckCircle2 className="w-2.5 h-2.5" /> Sent</>
                        )}
                      </span>
                    )}

                    <span className="text-[10px] text-text-muted w-8 text-right">
                      {formatTime(spin.createdAt)}
                    </span>

                    {spin.distributedTxHash && (
                      <a
                        href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'}/tx/${spin.distributedTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-accent/60 hover:text-accent hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ----------------------------------------
// Purchase History Tab
// ----------------------------------------

interface ScanResult {
  txHash: string
  amountSUI: number
  suggestedSpins: number
  timestamp: string
  requiresApproval: boolean
}

function PurchaseHistoryTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [showScanModal, setShowScanModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  // Abort stale requests instead of dropping them
  const abortRef = useRef<AbortController | null>(null)
  const lastFetchRef = useRef<string>('')

  const fetchPurchases = async (targetPage: number, targetFilter: string) => {
    const fetchKey = `${targetPage}-${targetFilter}`
    if (lastFetchRef.current === fetchKey) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    lastFetchRef.current = fetchKey
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
        filter: targetFilter,
      })
      const res = await fetch(`/api/payment/history?${params}`, { signal: controller.signal })
      const data = await res.json()

      if (data.success) {
        setPurchases(data.data?.items || [])
        setTotalPages(data.data?.pagination?.totalPages || 1)
        setTotal(data.data?.pagination?.total || 0)
        if (data.data?.stats) setPurchaseStats(data.data.stats)
      } else {
        setError(data.error || 'Failed to load purchase history')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return // Superseded by newer request
      console.error('Failed to fetch purchases:', err)
      setError('Failed to load purchase history')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases(1, 'all')
  }, [])

  const handleFilterChange = (newFilter: string) => {
    if (newFilter === filter) return
    setFilter(newFilter)
    setPage(1)
    lastFetchRef.current = ''
    fetchPurchases(1, newFilter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return
    setPage(newPage)
    lastFetchRef.current = ''
    fetchPurchases(newPage, filter)
  }

  const handleScanForPayments = async () => {
    if (scanning) return
    setScanning(true)

    try {
      const res = await fetch('/api/payment/claim')
      const data = await res.json()
      const unclaimed: ScanResult[] = data.data?.unclaimed || []
      setScanResults(unclaimed)
      setShowScanModal(true)
    } catch (err) {
      console.error('Failed to scan payments:', err)
    } finally {
      setScanning(false)
    }
  }

  // Save scan results to DB (validate + index as unclaimed)
  const [saving, setSaving] = useState(false)
  const handleSaveToDB = async () => {
    if (saving || scanResults.length === 0) return
    setSaving(true)

    try {
      const res = await fetch('/api/payment/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHashes: scanResults.map((tx) => tx.txHash) }),
      })
      const data = await res.json()

      if (data.success) {
        const { summary } = data.data
        // Remove saved/exists from scan results, keep invalid ones visible
        const invalidHashes = new Set(
          (data.data.results as { txHash: string; status: string }[])
            .filter((r) => r.status === 'invalid')
            .map((r) => r.txHash)
        )
        setScanResults((prev) => prev.filter((tx) => invalidHashes.has(tx.txHash)))

        // If all saved successfully, close modal and refresh
        if (summary.invalid === 0) {
          setShowScanModal(false)
          setScanResults([])
        }

        // Refresh purchase list to show newly indexed items
        lastFetchRef.current = ''
        fetchPurchases(1, 'uncredited')
        setFilter('uncredited')
        setPage(1)
      }
    } catch (err) {
      console.error('Failed to save to DB:', err)
    } finally {
      setSaving(false)
    }
  }

  // Claim spins from an unclaimed TX in the purchase list
  const handleClaimTx = async (txHash: string) => {
    if (claiming) return
    setClaiming(txHash)

    try {
      const res = await fetch('/api/payment/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      })
      const data = await res.json()

      if (data.success) {
        // Refresh list
        lastFetchRef.current = ''
        fetchPurchases(page, filter)
      }
    } catch (err) {
      console.error('Failed to claim:', err)
    } finally {
      setClaiming(null)
    }
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'credited', label: 'Credited' },
    { value: 'uncredited', label: 'Uncredited' },
    { value: 'pending', label: 'Pending' },
  ]

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      {purchaseStats && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-muted">
            <span className="text-white font-semibold">{purchaseStats.totalPayments}</span> payments
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-blue-400 font-semibold">{purchaseStats.totalSUI.toFixed(1)}</span> SUI
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">
            <span className="text-accent font-semibold">{purchaseStats.totalSpinsCredited}</span> spins
          </span>
        </div>
      )}

      {/* Filter Pills + Scan Button */}
      <div className="flex items-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filter === f.value
                ? 'bg-accent text-black'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={handleScanForPayments}
          disabled={scanning}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Scan Results Modal */}
      <Modal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        title={scanResults.length > 0 ? `Found ${scanResults.length} New Payment${scanResults.length !== 1 ? 's' : ''}` : 'Scan Complete'}
        size="md"
      >
        {scanResults.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No new unindexed payments found on chain.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              These transactions were found on chain but not yet in our database. Save them to claim spins.
            </p>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {scanResults.map((tx) => (
                <div
                  key={tx.txHash}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-accent/20"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-white">{tx.amountSUI.toFixed(3)} SUI</span>
                      <span className="text-[10px] text-text-muted">{tx.suggestedSpins} spin{tx.suggestedSpins !== 1 ? 's' : ''}</span>
                      {tx.requiresApproval && (
                        <span className="text-[9px] text-amber-400">Needs approval</span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">{tx.txHash}</div>
                  </div>
                  <a
                    href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'}/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-accent/60 hover:text-accent hover:bg-white/5 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveToDB}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating & Saving...</>
              ) : (
                <><Download className="w-3.5 h-3.5" /> Save All to Database ({scanResults.length})</>
              )}
            </button>
          </div>
        )}
      </Modal>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Purchase List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState
          title={filter !== 'all' ? 'No matches' : 'No purchases'}
          message={filter !== 'all' ? 'Try another filter' : 'Your SUI payment history will appear here'}
          icon={CreditCard}
        />
      ) : (
        <>
          <div className="space-y-1">
            {purchases.map((purchase) => {
              const isClaimable = purchase.creditStatus === 'new' || purchase.creditStatus === 'unclaimed'

              return (
                <div
                  key={purchase.txHash}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5 text-blue-400" />
                  </div>

                  {/* Payment Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-white">
                        {purchase.amountSUI.toFixed(3)} SUI
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {purchase.creditStatus === 'credited'
                          ? `${purchase.spinsCredited} spin${purchase.spinsCredited !== 1 ? 's' : ''}`
                          : purchase.creditStatus === 'pending_approval'
                          ? 'Awaiting approval'
                          : purchase.creditStatus === 'rejected'
                          ? 'Rejected'
                          : 'Uncredited'}
                      </span>
                      {purchase.manualCredit && (
                        <span className="text-[9px] text-purple-400">Admin</span>
                      )}
                    </div>
                  </div>

                  {/* Status + Claim/Time/Link */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isClaimable ? (
                      <button
                        onClick={() => handleClaimTx(purchase.txHash)}
                        disabled={claiming === purchase.txHash}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-accent text-black hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {claiming === purchase.txHash ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5" />
                        )}
                        Claim
                      </button>
                    ) : (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        purchase.creditStatus === 'credited' ? 'text-green-400'
                          : purchase.creditStatus === 'rejected' ? 'text-red-400'
                          : 'text-amber-400'
                      }`}>
                        {purchase.creditStatus === 'credited' ? (
                          <><CheckCircle2 className="w-2.5 h-2.5" /> Sent</>
                        ) : purchase.creditStatus === 'rejected' ? (
                          <><X className="w-2.5 h-2.5" /> Rejected</>
                        ) : (
                          <><Clock className="w-2.5 h-2.5" /> Pending</>
                        )}
                      </span>
                    )}

                    <span className="text-[10px] text-text-muted w-8 text-right">
                      {formatTime(purchase.claimedAt || purchase.timestamp)}
                    </span>

                    <a
                      href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'}/tx/${purchase.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-accent/60 hover:text-accent hover:bg-white/5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
