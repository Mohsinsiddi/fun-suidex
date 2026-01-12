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
  Plus,
  Trash2,
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

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setConfig(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load config')
    }
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
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to save config')
    }
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">
            <span className="text-yellow-400">SuiDex</span> Admin
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors">
            <DollarSign className="w-5 h-5" />
            Revenue
          </Link>
          <Link href="/admin/distribute" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors">
            <Gift className="w-5 h-5" />
            Distribute
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/admin/config" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white">
            <Settings className="w-5 h-5" />
            Config
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Configuration</h2>
              <p className="text-gray-400">Manage prize table and game settings</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle className="w-5 h-5" />
              {success}
            </div>
          )}

          {config && (
            <>
              {/* General Settings */}
              <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Spin Rate (SUI per spin)</label>
                    <input
                      type="number"
                      value={config.spinRateSUI}
                      onChange={(e) => setConfig({ ...config, spinRateSUI: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Admin Wallet Address</label>
                    <input
                      type="text"
                      value={config.adminWalletAddress}
                      onChange={(e) => setConfig({ ...config, adminWalletAddress: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Auto-Approval Limit (SUI)</label>
                    <input
                      type="number"
                      value={config.autoApprovalLimitSUI}
                      onChange={(e) => setConfig({ ...config, autoApprovalLimitSUI: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Payment Lookback (hours)</label>
                    <input
                      type="number"
                      value={config.paymentLookbackHours}
                      onChange={(e) => setConfig({ ...config, paymentLookbackHours: parseInt(e.target.value) || 48 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Referral Commission (%)</label>
                    <input
                      type="number"
                      value={config.referralCommissionPercent}
                      onChange={(e) => setConfig({ ...config, referralCommissionPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Free Spin Min Stake (USD)</label>
                    <input
                      type="number"
                      value={config.freeSpinMinStakeUSD}
                      onChange={(e) => setConfig({ ...config, freeSpinMinStakeUSD: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-6 mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.spinPurchaseEnabled}
                      onChange={(e) => setConfig({ ...config, spinPurchaseEnabled: e.target.checked })}
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Enable Spin Purchases</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.referralEnabled}
                      onChange={(e) => setConfig({ ...config, referralEnabled: e.target.checked })}
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Enable Referrals</span>
                  </label>
                </div>
              </div>

              {/* Prize Table */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Prize Table (16 Slots)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-3 py-3 text-left text-xs text-gray-400">#</th>
                        <th className="px-3 py-3 text-left text-xs text-gray-400">Type</th>
                        <th className="px-3 py-3 text-left text-xs text-gray-400">Amount</th>
                        <th className="px-3 py-3 text-left text-xs text-gray-400">Value (USD)</th>
                        <th className="px-3 py-3 text-left text-xs text-gray-400">Weight</th>
                        <th className="px-3 py-3 text-left text-xs text-gray-400">Lock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.prizeTable.map((slot, i) => (
                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-3 py-2 text-gray-400 text-sm">{i}</td>
                          <td className="px-3 py-2">
                            <select
                              value={slot.type}
                              onChange={(e) => updatePrizeSlot(i, 'type', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
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
                              className="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                              disabled={slot.type === 'no_prize'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={slot.valueUSD}
                              onChange={(e) => updatePrizeSlot(i, 'valueUSD', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                              disabled={slot.type === 'no_prize'}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={slot.weight}
                              onChange={(e) => updatePrizeSlot(i, 'weight', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={slot.lockDuration || ''}
                              onChange={(e) => updatePrizeSlot(i, 'lockDuration', e.target.value || undefined)}
                              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
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

                <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    <strong className="text-yellow-400">Weight:</strong> Higher weight = more likely to land. 
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
