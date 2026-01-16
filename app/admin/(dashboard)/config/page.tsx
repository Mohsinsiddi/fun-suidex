'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface PrizeSlot {
  slotIndex: number
  type: 'liquid_victory' | 'locked_victory' | 'suitrump' | 'no_prize'
  amount: number
  valueUSD: number
  weight: number
  lockDuration?: string
}

interface AdminConfig {
  spinRateSUI: number
  adminWalletAddress: string
  autoApprovalLimitSUI: number
  paymentLookbackHours: number
  referralCommissionPercent: number
  referralEnabled: boolean
  spinPurchaseEnabled: boolean
  freeSpinMinStakeUSD: number
  freeSpinCooldownHours: number
  prizeTable: PrizeSlot[]
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

export default function AdminConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config')
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) setConfig(data.data)
      else setError(data.error)
    } catch (err) { setError('Failed to load config') }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Configuration saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else setError(data.error)
    } catch (err) { setError('Failed to save config') }
    setSaving(false)
  }

  const updatePrizeSlot = (index: number, field: string, value: any) => {
    if (!config) return
    const newPrizeTable = [...config.prizeTable]
    newPrizeTable[index] = { ...newPrizeTable[index], [field]: value }
    setConfig({ ...config, prizeTable: newPrizeTable })
  }

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
        <button onClick={handleSave} disabled={saving} className="btn btn-primary self-start sm:self-auto text-sm sm:text-base">
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
          {/* General Settings */}
          <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">General Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Spin Rate (SUI per spin)</label>
                <input
                  type="number"
                  value={config.spinRateSUI}
                  onChange={(e) => setConfig({ ...config, spinRateSUI: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg text-sm sm:text-base"
                  step="0.1"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Admin Wallet Address</label>
                <input
                  type="text"
                  value={config.adminWalletAddress}
                  onChange={(e) => setConfig({ ...config, adminWalletAddress: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-background border border-border rounded-lg font-mono text-xs sm:text-sm"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">Auto-Approval Limit (SUI)</label>
                <input
                  type="number"
                  value={config.autoApprovalLimitSUI}
                  onChange={(e) => setConfig({ ...config, autoApprovalLimitSUI: parseFloat(e.target.value) || 0 })}
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
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs text-text-secondary">USD</th>
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
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                        <input
                          type="number"
                          value={slot.valueUSD}
                          onChange={(e) => updatePrizeSlot(i, 'valueUSD', parseInt(e.target.value) || 0)}
                          className="w-14 sm:w-20 px-1.5 sm:px-2 py-1 bg-background border border-border rounded text-xs sm:text-sm"
                          disabled={slot.type === 'no_prize'}
                        />
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
    </>
  )
}
