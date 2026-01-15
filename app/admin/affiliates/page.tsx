'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, DollarSign, Users, Gift, LogOut, RefreshCw, CheckCircle, Clock, XCircle, Twitter, ExternalLink } from 'lucide-react'

interface AffiliateReward {
  _id: string
  referrerWallet: string
  refereeWallet: string
  originalPrizeUSD: number
  rewardAmountVICT: number
  rewardValueUSD: number
  tweetStatus: 'pending' | 'clicked' | 'completed'
  payoutStatus: 'pending_tweet' | 'ready' | 'paid'
  paidTxHash?: string
  createdAt: string
}

interface Stats {
  pendingTweet: number
  ready: number
  paid: number
  pendingVICT: number
  pendingUSD: number
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/config', icon: Settings, label: 'Config' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
  { href: '/admin/distribute', icon: Gift, label: 'Distribute' },
  { href: '/admin/affiliates', icon: Users, label: 'Affiliates', active: true },
]

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [rewards, setRewards] = useState<AffiliateReward[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [txHash, setTxHash] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { fetchData() }, [filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/affiliates?status=${filter}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        setRewards(data.rewards)
        setStats(data.stats)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSelectAll = () => {
    const readyIds = rewards.filter(r => r.payoutStatus === 'ready').map(r => r._id)
    setSelectedIds(selectedIds.length === readyIds.length ? [] : readyIds)
  }

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handlePay = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Mark ${selectedIds.length} rewards as paid?`)) return
    
    setPaying(true)
    try {
      const res = await fetch('/api/admin/affiliates/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardIds: selectedIds, txHash: txHash || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Successfully marked ${data.count} rewards as paid!`)
        setSelectedIds([])
        setTxHash('')
        fetchData()
      } else {
        alert(data.error || 'Failed')
      }
    } catch (err) { alert('Network error') }
    setPaying(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const formatWallet = (w: string) => w ? `${w.slice(0, 6)}...${w.slice(-4)}` : '-'
  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  const getTweetIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={16} className="text-green-400" />
    if (status === 'clicked') return <Clock size={16} className="text-yellow-400" />
    return <XCircle size={16} className="text-red-400" />
  }

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400">Paid</span>
    if (status === 'ready') return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">Ready</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400">Pending</span>
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border p-4 hidden lg:block">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-accent">SuiDex Admin</h1>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active ? 'bg-accent text-black' : 'text-text-secondary hover:bg-white/5'}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 mt-8 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Affiliate Rewards</h1>
              <p className="text-text-secondary">Manage referral commissions</p>
            </div>
            <button onClick={fetchData} className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-white">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending Tweet</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingTweet}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Ready to Pay</p>
                <p className="text-2xl font-bold text-blue-400">{stats.ready}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending VICT</p>
                <p className="text-2xl font-bold text-white">{stats.pendingVICT.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-text-secondary text-xs mb-1">Pending USD</p>
                <p className="text-2xl font-bold text-accent">${stats.pendingUSD.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {['all', 'pending_tweet', 'ready', 'paid'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-black' : 'bg-surface text-text-secondary border border-border'}`}>
                {f === 'all' ? 'All' : f === 'pending_tweet' ? 'Pending Tweet' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Bulk Actions */}
          {rewards.some(r => r.payoutStatus === 'ready') && (
            <div className="p-4 rounded-xl mb-4 bg-surface border border-border flex flex-wrap items-center gap-3">
              <button onClick={handleSelectAll} className="px-4 py-2 rounded-lg text-sm bg-background text-white border border-border">
                {selectedIds.length ? 'Deselect All' : 'Select Ready'}
              </button>
              <span className="text-text-secondary text-sm">{selectedIds.length} selected</span>
              <input type="text" placeholder="TX Hash (optional)" value={txHash} onChange={e => setTxHash(e.target.value)} className="px-4 py-2 rounded-lg text-sm bg-background text-white border border-border flex-1 min-w-[200px]" />
              <button onClick={handlePay} disabled={!selectedIds.length || paying} className="px-6 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white disabled:opacity-50">
                {paying ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse bg-surface" />)}
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-12 rounded-xl text-center bg-surface border border-border">
              <Users size={48} className="mx-auto mb-4 text-text-muted" />
              <p className="text-text-secondary">No rewards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">SELECT</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">REFERRER</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">REFEREE</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">PRIZE</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">COMMISSION</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">TWEET</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">STATUS</th>
                    <th className="text-left py-3 px-4 text-text-secondary text-xs font-medium">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r._id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {r.payoutStatus === 'ready' && (
                          <input type="checkbox" checked={selectedIds.includes(r._id)} onChange={() => handleToggle(r._id)} className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-white">{formatWallet(r.referrerWallet)}</td>
                      <td className="py-3 px-4 font-mono text-sm text-text-secondary">{formatWallet(r.refereeWallet)}</td>
                      <td className="py-3 px-4 text-white">${(r.originalPrizeUSD || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400 font-medium">${(r.rewardValueUSD || 0).toFixed(2)}</span>
                        <span className="text-text-muted text-xs ml-1">({(r.rewardAmountVICT || 0).toLocaleString()})</span>
                      </td>
                      <td className="py-3 px-4">{getTweetIcon(r.tweetStatus)}</td>
                      <td className="py-3 px-4">{getStatusBadge(r.payoutStatus)}</td>
                      <td className="py-3 px-4 text-text-secondary text-sm">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
