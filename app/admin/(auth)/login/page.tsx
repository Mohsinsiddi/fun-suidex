'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, AlertCircle, Shield, Gamepad2, Eye, EyeOff } from 'lucide-react'
import { useAdminAuthStore } from '@/lib/stores/admin'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Admin auth store
  const { isLoading: loading, error, login, clearError } = useAdminAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    const success = await login(username, password)
    if (success) {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 mb-4 sm:mb-5">
              <div className="relative">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-accent" />
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent absolute -bottom-1 -right-1" />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
              <span className="text-accent">SuiDex</span>
              <span className="text-white"> Admin</span>
            </h1>
            <p className="text-text-secondary text-sm sm:text-base">
              Sign in to access the dashboard
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-8 shadow-xl shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-text-secondary mb-1.5 sm:mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-background border border-border rounded-xl text-white text-sm sm:text-base placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="Enter username"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-text-secondary mb-1.5 sm:mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-12 py-2.5 sm:py-3 bg-background border border-border rounded-xl text-white text-sm sm:text-base placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base bg-accent text-black hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-5 sm:mt-6 text-center">
            <p className="text-text-muted text-xs sm:text-sm">
              First time? Run{' '}
              <code className="text-accent bg-surface px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-mono">
                pnpm admin:create
              </code>{' '}
              to create an account.
            </p>
          </div>

          {/* Security Note */}
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-text-muted text-[10px] sm:text-xs">
            <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Secured with HTTP-only cookies</span>
          </div>
        </div>
      </div>
    </div>
  )
}
