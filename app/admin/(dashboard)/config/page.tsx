'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, AlertCircle, CheckCircle, Wallet, Check, X, AlertTriangle, Clock, Users, ArrowRight } from 'lucide-react'
import { useAdminConfigStore } from '@/lib/stores/admin'
import type { WalletConflict } from '@/lib/stores/admin/adminConfigStore'

interface PrizeSlot {
  slotIndex: number
  type: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  amount: number
  weight: number
  lockDuration?: string
}

interface AdminConfig {
  spinRateSUI: number
  adminWalletAddress: string
  distributorWalletAddress: string | null
  autoApprovalLimitSUI: number
  paymentLookbackHours: number
  referralCommissionPercent: number
  referralEnabled: boolean
  spinPurchaseEnabled: boolean
  freeSpinMinStakeUSD: number
  freeSpinCooldownHours: number
  prizeTable: PrizeSlot[]
  tokenPrices?: { vict: number; trump: number }
}

const PRIZE_TYPES = [
  { value: 'liquid_victory', label: 'Liquid Victory' },
  { value: 'locked_victory', label: 'Locked Victory' },
  { value: 'suitrump', label: 'SuiTrump' },
  { value: 'no_prize', label: 'No Prize' },
]

const LOCK_DURATIONS = [
  { value: '', label: 'None' },
  { value: '1_week', label: '1 Week' },
  { value: '3_month', label: '3 Months' },
  { value: '1_year', label: '1 Year' },
  { value: '3_year', label: '3 Years' },
]

// ============================================
// SUI address validation helper
// ============================================

function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

function getAddressValidation(address: string): 'empty' | 'valid' | 'invalid' {
  if (!address || address.trim() === '') return 'empty'
  return isValidSuiAddress(address) ? 'valid' : 'invalid'
}

// ============================================
// Wallet Change Confirmation Modal
// ============================================

function WalletChangeModal({
  data,
  saving,
  onClose,
  onForce,
}: {
  data: WalletConflict
  saving: boolean
  onClose: () => void
  onForce: () => void
}) {
  const truncate = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--error)]/20 bg-[var(--error)]/5">
          <div className="p-2 rounded-lg bg-[var(--error)]/10">
            <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[var(--error)]">Wallet Change Blocked</h3>
            <p className="text-[10px] sm:text-xs text-[var(--text-secondary)]">Pending payments detected for current wallet</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wallet transition */}
        <div className="px-4 sm:px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[var(--text-secondary)] mb-0.5">Current</p>
              <p className="font-mono text-xs sm:text-sm truncate" title={data.oldWallet}>{truncate(data.oldWallet)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10px] text-[var(--text-secondary)] mb-0.5">New</p>
              <p className="font-mono text-xs sm:text-sm truncate" title={data.newWallet}>{truncate(data.newWallet)}</p>
            </div>
          </div>
        </div>

        {/* Sync-style log panel */}
        <div className="px-4 sm:px-5 pb-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
            {/* Log header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--card)]">
              <span className="w-2 h-2 rounded-full bg-[var(--error)] animate-pulse" />
              <span className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Payment Sync Status</span>
            </div>

            {/* Log rows */}
            <div className="divide-y divide-[var(--border)]/50 font-mono text-[11px] sm:text-xs">
              {/* Total */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[var(--text-secondary)]">Total Pending</span>
                <span className="font-semibold text-[var(--error)]">{data.total}</span>
              </div>

              {/* Unclaimed */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="text-[var(--text-secondary)]">Unclaimed</span>
                </div>
                <span className={data.unclaimed > 0 ? 'text-amber-400 font-semibold' : 'text-[var(--text-secondary)]'}>{data.unclaimed}</span>
              </div>

              {/* Pending Approval */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[var(--text-secondary)]">Pending Approval</span>
                </div>
                <span className={data.pendingApproval > 0 ? 'text-amber-400 font-semibold' : 'text-[var(--text-secondary)]'}>{data.pendingApproval}</span>
              </div>

              {/* Total SUI */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[var(--text-secondary)]">Total SUI at Risk</span>
                <span className="font-semibold text-[var(--accent)]">{data.totalSUI} SUI</span>
              </div>

              {/* Unique Senders */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">Unique Senders</span>
                </div>
                <span>{data.uniqueSenders}</span>
              </div>

              {/* Date Range */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">Oldest TX</span>
                </div>
                <span className="text-[10px] sm:text-xs">{formatDate(data.oldestTx)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">Newest TX</span>
                </div>
                <span className="text-[10px] sm:text-xs">{formatDate(data.newestTx)}</span>
              </div>
            </div>
          </div>

          {/* Warning message */}
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-[var(--error)]/5 border border-[var(--error)]/20">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--error)] shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-[var(--error)]/80 leading-relaxed">
              Forcing this change may prevent {data.uniqueSenders} user(s) from claiming {data.totalSUI} SUI in payments. Existing records will still use the stored wallet for verification.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--card)]">
          <button onClick={onClose} className="btn btn-ghost flex-1 text-sm" disabled={saving}>
            Cancel
          </button>
          <button onClick={onForce} className="btn btn-danger flex-1 text-sm" disabled={saving}>
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Force Change
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Page Component
// ============================================

export default function AdminConfigPage() {
  const router = useRouter()

  // Admin config store
  const {
    config: storeConfig,
    isLoading,
    isSaving,
    error: storeError,
    walletConflict,
    fetchConfig,
    updateConfig: saveConfig,
    clearWalletConflict,
  } = useAdminConfigStore()

  // Local editing state
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // "Same as recipient" toggle
  const [sameAsRecipient, setSameAsRecipient] = useState(false)

  // Fetch config on mount
  useEffect(() => {
    fetchConfig().then((success) => {
      if (!success && storeError === 'Unauthorized') {
        router.push('/admin/login')
      }
    })
  }, [fetchConfig, router, storeError])

  // Sync store config to local state when loaded
  useEffect(() => {
    if (storeConfig) {
      const loadedConfig = storeConfig as unknown as AdminConfig
      // Handle null distributorWalletAddress from API
      const normalizedConfig: AdminConfig = {
        ...loadedConfig,
        distributorWalletAddress: loadedConfig.distributorWalletAddress || '',
      }
      setConfig(normalizedConfig)

      // Detect if distributor matches recipient on load
      if (
        normalizedConfig.distributorWalletAddress &&
        normalizedConfig.distributorWalletAddress === normalizedConfig.adminWalletAddress
      ) {
        setSameAsRecipient(true)
      }
    }
  }, [storeConfig])

  const loading = isLoading
  const saving = isSaving

  // Wallet validation states
  const recipientValidation = useMemo(
    () => getAddressValidation(config?.adminWalletAddress || ''),
    [config?.adminWalletAddress]
  )
  const distributorValidation = useMemo(
    () => getAddressValidation(config?.distributorWalletAddress || ''),
    [config?.distributorWalletAddress]
  )

  // ============================================
  // Handlers
  // ============================================

  const handleSave = async (force = false) => {
    if (!config) return
    setError(null)
    setSuccess(null)

    // Validate numeric fields before saving
    if (!config.spinRateSUI || config.spinRateSUI <= 0) {
      setError('Spin rate must be a positive number')
      return
    }
    if (!config.autoApprovalLimitSUI || config.autoApprovalLimitSUI < 1) {
      setError('Auto-approval limit must be at least 1 SUI')
      return
    }

    const payload = force ? { ...(config as any), force: true } : (config as any)
    const result = await saveConfig(payload)
    if (result) {
      setSuccess('Configuration saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } else {
      const state = useAdminConfigStore.getState()
      // If wallet conflict returned, the modal will open via walletConflict state
      if (!state.walletConflict) {
        setError(state.error || 'Failed to save config')
      }
    }
  }

  const updatePrizeSlot = (index: number, field: string, value: any) => {
    if (!config) return
    const newPrizeTable = [...config.prizeTable]
    newPrizeTable[index] = { ...newPrizeTable[index], [field]: value }
    setConfig({ ...config, prizeTable: newPrizeTable })
  }

  const handleRecipientChange = (value: string) => {
    if (!config) return
    const updates: Partial<AdminConfig> = { adminWalletAddress: value }
    if (sameAsRecipient) {
      updates.distributorWalletAddress = value
    }
    setConfig({ ...config, ...updates })
  }

  const handleDistributorChange = (value: string) => {
    if (!config) return
    setConfig({ ...config, distributorWalletAddress: value })
  }

  const handleSameAsRecipientToggle = (checked: boolean) => {
    setSameAsRecipient(checked)
    if (!config) return
    if (checked) {
      setConfig({ ...config, distributorWalletAddress: config.adminWalletAddress })
    }
  }

  // ============================================
  // Validation indicator component
  // ============================================

  const ValidationIndicator = ({ status }: { status: 'empty' | 'valid' | 'invalid' }) => {
    if (status === 'empty') return null
    if (status === 'valid') {
      return (
        <span className="inline-flex items-center gap-1 text-[var(--success)] text-[10px] sm:text-xs">
          <Check className="w-3 h-3" />
          Valid
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[var(--error)] text-[10px] sm:text-xs">
        <AlertCircle className="w-3 h-3" />
        Invalid (0x + 64 hex chars)
      </span>
    )
  }

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Configuration</h2>
          <p className="text-text-secondary text-sm sm:text-base">Manage prize table and game settings</p>
        </div>
        <button onClick={() => handleSave()} disabled={saving} className="btn btn-primary self-start sm:self-auto text-sm sm:text-base">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Save Changes</span><span className="sm:hidden">Save</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 sm:mb-6 flex items-start gap-2 p-3 sm:p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 sm:mb-6 flex items-start gap-2 p-3 sm:p-4 bg-success/10 border border-success/20 rounded-lg text-success text-sm sm:text-base">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" /><span>{success}</span>
        </div>
      )}

      {config && (
        <>
          {/* Wallet Configuration */}
          <div className="card p-4 sm:p-6 mb-4 sm:mb-6 border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--card)] to-[var(--accent)]/[0.03]">
            <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
              <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Wallet Configuration</h3>
                <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs">
                  Configure wallets for receiving payments and distributing prizes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recipient Wallet */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label className="block text-xs sm:text-sm text-[var(--text-secondary)]">
                    Recipient Wallet
                  </label>
                  <ValidationIndicator status={recipientValidation} />
                </div>
                <input
                  type="text"
                  value={config.adminWalletAddress}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--background)] border rounded-lg font-mono text-xs sm:text-sm transition-colors focus:outline-none focus:border-[var(--accent)] ${
                    recipientValidation === 'valid'
                      ? 'border-[var(--success)]/40'
                      : recipientValidation === 'invalid'
                      ? 'border-[var(--error)]/40'
                      : 'border-[var(--border)]'
                  }`}
                  placeholder="0x..."
                />
                <p className="mt-1 text-[10px] sm:text-xs text-[var(--text-secondary)] opacity-60">
                  Receives SUI payments for spin purchases
                </p>
              </div>

              {/* Distributor Wallet */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label className="block text-xs sm:text-sm text-[var(--text-secondary)]">
                    Distributor Wallet
                  </label>
                  {!sameAsRecipient && <ValidationIndicator status={distributorValidation} />}
                </div>
                <input
                  type="text"
                  value={config.distributorWalletAddress || ''}
                  onChange={(e) => handleDistributorChange(e.target.value)}
                  disabled={sameAsRecipient}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--background)] border rounded-lg font-mono text-xs sm:text-sm transition-colors focus:outline-none focus:border-[var(--accent)] ${
                    sameAsRecipient
                      ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
                      : distributorValidation === 'valid'
                      ? 'border-[var(--success)]/40'
                      : distributorValidation === 'invalid'
                      ? 'border-[var(--error)]/40'
                      : 'border-[var(--border)]'
                  }`}
                  placeholder="0x..."
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] opacity-60">
                    Sends prize distributions to winners
                  </p>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sameAsRecipient}
                      onChange={(e) => handleSameAsRecipientToggle(e.target.checked)}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-[var(--background)] border-[var(--border)] accent-[var(--accent)]"
                    />
                    <span className="text-[10px] sm:text-xs text-[var(--text-secondary)]">
                      Same as recipient
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">General Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Spin Rate (SUI per spin)</label>
                <input
                  type="number"
                  value={config.spinRateSUI}
                  onChange={(e) => setConfig({ ...config, spinRateSUI: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  onBlur={(e) => { if (!parseFloat(e.target.value)) setConfig({ ...config, spinRateSUI: config.spinRateSUI || 1 }) }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Auto-Approval Limit (SUI)</label>
                <input
                  type="number"
                  value={config.autoApprovalLimitSUI}
                  onChange={(e) => setConfig({ ...config, autoApprovalLimitSUI: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  onBlur={(e) => { if (!parseFloat(e.target.value)) setConfig({ ...config, autoApprovalLimitSUI: config.autoApprovalLimitSUI || 10 }) }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Payment Lookback (hours)</label>
                <input
                  type="number"
                  value={config.paymentLookbackHours}
                  onChange={(e) => setConfig({ ...config, paymentLookbackHours: parseInt(e.target.value) || 48 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Referral Commission (%)</label>
                <input
                  type="number"
                  value={config.referralCommissionPercent}
                  onChange={(e) => setConfig({ ...config, referralCommissionPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Free Spin Min Stake (USD)</label>
                <input
                  type="number"
                  value={config.freeSpinMinStakeUSD}
                  onChange={(e) => setConfig({ ...config, freeSpinMinStakeUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-4 sm:mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.spinPurchaseEnabled}
                  onChange={(e) => setConfig({ ...config, spinPurchaseEnabled: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-background border-border accent-accent"
                />
                <span className="text-text-secondary text-sm sm:text-base">Enable Spin Purchases</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.referralEnabled}
                  onChange={(e) => setConfig({ ...config, referralEnabled: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-background border-border accent-accent"
                />
                <span className="text-text-secondary text-sm sm:text-base">Enable Referrals</span>
              </label>
            </div>
          </div>

          {/* Prize Table */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Prize Table (16 Slots)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">#</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">Type</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">Amount</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">Est. USD</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">Weight</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">Lock</th>
                  </tr>
                </thead>
                <tbody>
                  {config.prizeTable.map((slot, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-card-hover">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-text-secondary text-xs sm:text-sm">{i}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <select
                          value={slot.type}
                          onChange={(e) => updatePrizeSlot(i, 'type', e.target.value)}
                          className="w-full px-1.5 sm:px-2 py-1 bg-background border border-border rounded text-xs sm:text-sm"
                        >
                          {PRIZE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <input
                          type="number"
                          value={slot.amount}
                          onChange={(e) => updatePrizeSlot(i, 'amount', parseInt(e.target.value) || 0)}
                          className="w-16 sm:w-24 px-1.5 sm:px-2 py-1 bg-background border border-border rounded text-xs sm:text-sm"
                          disabled={slot.type === 'no_prize'}
                        />
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-text-muted">
                        {slot.type === 'no_prize' ? '—' : (() => {
                          const price = slot.type === 'suitrump' ? (config?.tokenPrices?.trump || 0) : (config?.tokenPrices?.vict || 0)
                          const est = slot.amount * price
                          return est > 0 ? `~$${est < 1 ? est.toFixed(4) : est.toFixed(2)}` : '—'
                        })()}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <input
                          type="number"
                          value={slot.weight}
                          onChange={(e) => updatePrizeSlot(i, 'weight', parseInt(e.target.value) || 1)}
                          className="w-14 sm:w-20 px-1.5 sm:px-2 py-1 bg-background border border-border rounded text-xs sm:text-sm"
                          min="1"
                        />
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <select
                          value={slot.lockDuration || ''}
                          onChange={(e) => updatePrizeSlot(i, 'lockDuration', e.target.value || undefined)}
                          className="w-full px-1.5 sm:px-2 py-1 bg-background border border-border rounded text-xs sm:text-sm"
                          disabled={slot.type !== 'locked_victory'}
                        >
                          {LOCK_DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-background rounded-lg">
              <p className="text-xs sm:text-sm text-text-secondary">
                <strong className="text-accent">Weight:</strong> Higher weight = more likely to land.
                Total: {config.prizeTable.reduce((sum, s) => sum + s.weight, 0)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Wallet change confirmation modal */}
      {walletConflict && (
        <WalletChangeModal
          data={walletConflict}
          saving={saving}
          onClose={clearWalletConflict}
          onForce={() => {
            clearWalletConflict()
            handleSave(true)
          }}
        />
      )}
    </>
  )
}
