import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// Admin Auth Store - Admin Authentication State
// ============================================
// Handles admin login, session management
// Pattern: Session-based, check auth on page load

interface AdminUser {
  username: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
}

interface AdminAuthState {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  admin: AdminUser | null
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  clearError: () => void
}

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  admin: null,
  error: null,
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Login with username/password
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })

          const data = await res.json()

          if (!data.success) {
            set({
              isLoading: false,
              error: data.error || 'Login failed',
            })
            return false
          }

          set({
            isAuthenticated: true,
            isLoading: false,
            admin: data.data.admin || {
              username,
              role: 'admin',
              permissions: [],
            },
            error: null,
          })

          return true
        } catch (error) {
          set({
            isLoading: false,
            error: 'Login failed. Please try again.',
          })
          return false
        }
      },

      // Logout and clear session
      logout: async () => {
        try {
          await fetch('/api/admin/auth/logout', { method: 'POST' })
        } catch {
          // Ignore errors - still clear local state
        }

        set(initialState)
      },

      // Check if session is still valid
      checkAuth: async () => {
        const state = get()
        if (state.isLoading) return state.isAuthenticated

        set({ isLoading: true })

        try {
          const res = await fetch('/api/admin/auth/me')
          const data = await res.json()

          if (data.success) {
            set({
              isAuthenticated: true,
              isLoading: false,
              admin: data.data.admin || state.admin,
              error: null,
            })
            return true
          }

          set({
            ...initialState,
            isLoading: false,
          })
          return false
        } catch {
          set({
            ...initialState,
            isLoading: false,
          })
          return false
        }
      },

      // Clear error message
      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'suidex-admin-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        admin: state.admin,
      }),
    }
  )
)

// Helper: Check if admin has a specific permission
export const useHasPermission = (permission: string) => {
  const { admin } = useAdminAuthStore()
  if (!admin) return false
  if (admin.role === 'super_admin') return true
  return admin.permissions.includes(permission)
}
