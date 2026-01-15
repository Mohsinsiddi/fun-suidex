'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import { Pagination, PaginationInfo, SkeletonTable, ErrorState } from '@/components/ui'

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
  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditWallet, setCreditWallet] = useState('')
  const [creditAmount, setCreditAmount] = useState(1)
  const [creditType, setCreditType] = useState<'purchased' | 'bonus'>('purchased')
  const [crediting, setCrediting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      if (data.success) {
        setUsers(data.items || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      } else {
        setError(data.error)
      }
    } catch (err) { setError('Failed to load users') }
    setLoading(false)
  }, [page, search, router])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const handleCredit = async () => {
    if (!creditWallet || creditAmount <= 0) return
    setCrediting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/spins/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: creditWallet, amount: creditAmount, type: creditType }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Credited ${creditAmount} ${creditType} spins to ${creditWallet.slice(0, 10)}...`)
        setShowCreditModal(false)
        setCreditWallet('')
        setCreditAmount(1)
        fetchUsers()
        setTimeout(() => setSuccess(null), 3000)
      } else setError(data.error)
    } catch (err) { setError('Failed to credit spins') }
    setCrediting(false)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-text-secondary">Manage users and credit spins</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCreditModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />Credit Spins
          </button>
          <button onClick={fetchUsers} disabled={loading} className="btn btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && !loading && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg text-[var(--error)]">
          <AlertCircle className="w-5 h-5" />{error}
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg text-[var(--success)]">
          <CheckCircle className="w-5 h-5" />{success}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by wallet address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-lg placeholder-[var(--text-secondary)]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : users.length === 0 ? (
          <ErrorState
            title="No users found"
            message={search ? `No users matching "${search}"` : 'No users have signed up yet.'}
            onRetry={fetchUsers}
          />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Wallet</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Purchased</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Bonus</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Total Spins</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Wins (USD)</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Last Active</th>
                  <th className="px-6 py-4 text-left text-xs text-[var(--text-secondary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)]">
                    <td className="px-6 py-4 font-mono text-sm">{user.wallet.slice(0, 10)}...{user.wallet.slice(-6)}</td>
                    <td className="px-6 py-4 text-[var(--warning)] font-medium">{user.purchasedSpins}</td>
                    <td className="px-6 py-4 text-purple-400 font-medium">{user.bonusSpins}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{user.totalSpins}</td>
                    <td className="px-6 py-4 text-[var(--success)]">${user.totalWinsUSD?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setCreditWallet(user.wallet); setShowCreditModal(true) }}
                        className="text-sm text-[var(--accent)] hover:text-[var(--accent)]/80"
                      >
                        Credit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
              <PaginationInfo page={page} limit={limit} total={total} />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Credit Spins</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={creditWallet}
                  onChange={(e) => setCreditWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-secondary mb-2">Amount</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-secondary mb-2">Type</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as 'purchased' | 'bonus')}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="purchased">Purchased Spins</option>
                  <option value="bonus">Bonus Spins</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreditModal(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button
                onClick={handleCredit}
                disabled={crediting || !creditWallet}
                className="btn btn-primary flex-1 disabled:opacity-50"
              >
                {crediting ? 'Crediting...' : 'Credit Spins'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
