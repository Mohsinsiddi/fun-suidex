'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Settings,
  DollarSign,
  Users,
  Gift,
  LogOut,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

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

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 admin-sidebar flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="font-display text-xl font-bold"><span className="text-accent">SuiDex</span> Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="admin-nav-item"><LayoutDashboard className="w-5 h-5" />Dashboard</Link>
          <Link href="/admin/revenue" className="admin-nav-item"><DollarSign className="w-5 h-5" />Revenue</Link>
          <Link href="/admin/distribute" className="admin-nav-item"><Gift className="w-5 h-5" />Distribute</Link>
          <Link href="/admin/users" className="admin-nav-item"><Users className="w-5 h-5" />Users</Link>
          <Link href="/admin/config" className="admin-nav-item active"><Settings className="w-5 h-5" />Config</Link>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="admin-nav-item w-full text-error hover:bg-error/10"><LogOut className="w-5 h-5" />Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Configuration</h2>
              <p className="text-text-secondary">Manage prize table and game settings</p>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg text-success">
              <CheckCircle className="w-5 h-5" />
              {success}
            </div>
          )}

          {config && (
            <>
              {/* General Settings */}
              <div className="card p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Spin Rate (SUI per spin)</label>
                    <input
                      type="number"
                      value={config.spinRateSUI}
                      onChange={(e) => setConfig({ ...config, spinRateSUI: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Admin Wallet Address</label>
                    <input
                      type="text"
                      value={config.adminWalletAddress}
                      onChange={(e) => setConfig({ ...config, adminWalletAddress: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Auto-Approval Limit (SUI)</label>
                    <input
                      type="number"
                      value={config.autoApprovalLimitSUI}
                      onChange={(e) => setConfig({ ...config, autoApprovalLimitSUI: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Payment Lookback (hours)</label>
                    <input
                      type="number"
                      value={config.paymentLookbackHours}
                      onChange={(e) => setConfig({ ...config, paymentLookbackHours: parseInt(e.target.value) || 48 })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Referral Commission (%)</label>
                    <input
                      type="number"
                      value={config.referralCommissionPercent}
                      onChange={(e) => setConfig({ ...config, referralCommissionPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Free Spin Min Stake (USD)</label>
                    <input
                      type="number"
                      value={config.freeSpinMinStakeUSD}
                      onChange={(e) => setConfig({ ...config, freeSpinMinStakeUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-6 mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.spinPurchaseEnabled}
                      onChange={(e) => setConfig({ ...config, spinPurchaseEnabled: e.target.checked })}
                      className="w-5 h-5 rounded bg-background border-border accent-accent"
                    />
                    <span className="text-text-secondary">Enable Spin Purchases</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.referralEnabled}
                      onChange={(e) => setConfig({ ...config, referralEnabled: e.target.checked })}
                      className="w-5 h-5 rounded bg-background border-border accent-accent"
                    />
                    <span className="text-text-secondary">Enable Referrals</span>
                  </label>
                </div>
              </div>

              {/* Prize Table */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Prize Table (16 Slots)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">#</th>
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">Type</th>
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">Amount</th>
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">Value (USD)</th>
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">Weight</th>
                        <th className="px-3 py-3 text-left text-xs text-text-secondary">Lock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.prizeTable.map((slot, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-card-hover">
                          <td className="px-3 py-2 text-text-secondary text-sm">{i}</td>
                          <td className="px-3 py-2">
                            <select
                              value={slot.type}
                              onChange={(e) => updatePrizeSlot(i, 'type', e.target.value)}
                              className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                            >
                              {PRIZE_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={slot.amount}
                              onChange={(e) => updatePrizeSlot(i, 'amount', parseInt(e.target.value) || 0)}
                              className="w-24 px-2 py-1 bg-background border border-border rounded text-sm"
                              disabled={slot.type === 'no_prize'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={slot.valueUSD}
                              onChange={(e) => updatePrizeSlot(i, 'valueUSD', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-background border border-border rounded text-sm"
                              disabled={slot.type === 'no_prize'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={slot.weight}
                              onChange={(e) => updatePrizeSlot(i, 'weight', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 bg-background border border-border rounded text-sm"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={slot.lockDuration || ''}
                              onChange={(e) => updatePrizeSlot(i, 'lockDuration', e.target.value || undefined)}
                              className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              disabled={slot.type !== 'locked_victory'}
                            >
                              {LOCK_DURATIONS.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-background rounded-lg">
                  <p className="text-sm text-text-secondary">
                    <strong className="text-accent">Weight:</strong> Higher weight = more likely to land. 
                    Total weight: {config.prizeTable.reduce((sum, s) => sum + s.weight, 0)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}