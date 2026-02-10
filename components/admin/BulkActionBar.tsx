'use client'

import { X } from 'lucide-react'

// ============================================
// BulkActionBar - Sticky bar when items selected
// ============================================

interface BulkAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info'
  disabled?: boolean
  loading?: boolean
}

interface BulkActionBarProps {
  count: number
  actions: BulkAction[]
  onClear: () => void
}

export function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-0 z-30 mt-3">
      <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-lg p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-xs font-bold">
            {count}
          </span>
          <span className="text-[var(--text-secondary)]">selected</span>
          <button
            onClick={onClear}
            className="ml-1 p-1 hover:bg-white/10 rounded transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-2">
          {actions.map((action, idx) => {
            const btnClass = {
              primary: 'btn btn-primary',
              success: 'btn btn-success',
              danger: 'btn btn-danger',
              warning: 'btn btn-warning',
              info: 'btn btn-info',
            }[action.variant || 'primary']

            return (
              <button
                key={idx}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`${btnClass} text-xs sm:text-sm px-3 py-1.5`}
              >
                {action.loading ? 'Processing...' : action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BulkActionBar
