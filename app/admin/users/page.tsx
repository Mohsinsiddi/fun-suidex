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
  RefreshCw,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

interface User {
  _id: string
  wallet: string
  purchasedSpins: number
  bonusSpins: number
  totalSpins: number
  totalWinsUSD: number
  createdAt: string
  lastActiveAt: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Credit modal
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditWallet, setCreditWallet] = useState('')
  const [creditAmount, setCreditAmount] = useState(1)
  const [creditType, setCreditType] = useState<'purchased' | 'bonus'>('purchased')
  const [crediting, setCrediting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setUsers(data.data || [])
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load users')
    }
    setLoading(false)
  }

  const handleCredit = async () => {
    if (!creditWallet || creditAmount <= 0) return
    setCrediting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/spins/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: creditWallet,
          amount: creditAmount,
          type: creditType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Credited ${creditAmount} ${creditType} spins to ${creditWallet.slice(0, 10)}...`)
        setShowCreditModal(false)
        setCreditWallet('')
        setCreditAmount(1)
        fetchUsers()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to credit spins')
    }
    setCrediting(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const filteredUsers = users.filter(u => 
    u.wallet.toLowerCase().includes(search.toLowerCase())
  )

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
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700">
            <DollarSign className="w-5 h-5" />
            Revenue
          </Link>
          <Link href="/admin/distribute" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700">
            <Gift className="w-5 h-5" />
            Distribute
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/admin/config" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700">
            <Settings className="w-5 h-5" />
            Config
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full">
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
              <h2 className="text-2xl font-bold text-white">Users</h2>
              <p className="text-gray-400">Manage users and credit spins</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
              >
                <Plus className="w-4 h-4" />
                Credit Spins
              </button>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
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

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Wallet</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Purchased</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Bonus</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Total Spins</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Wins (USD)</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Last Active</th>
                  <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-mono text-sm text-white">
                      {user.wallet.slice(0, 10)}...{user.wallet.slice(-6)}
                    </td>
                    <td className="px-6 py-4 text-yellow-400 font-medium">{user.purchasedSpins}</td>
                    <td className="px-6 py-4 text-purple-400 font-medium">{user.bonusSpins}</td>
                    <td className="px-6 py-4 text-gray-300">{user.totalSpins}</td>
                    <td className="px-6 py-4 text-green-400">${user.totalWinsUSD?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setCreditWallet(user.wallet)
                          setShowCreditModal(true)
                        }}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Credit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Credit Spins</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={creditWallet}
                  onChange={(e) => setCreditWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as 'purchased' | 'bonus')}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="purchased">Purchased Spins</option>
                  <option value="bonus">Bonus Spins</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCredit}
                disabled={crediting || !creditWallet}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white disabled:opacity-50"
              >
                {crediting ? 'Crediting...' : 'Credit Spins'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
