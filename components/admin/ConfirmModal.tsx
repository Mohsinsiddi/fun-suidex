'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// ============================================
// ConfirmModal - Replace prompt()/alert() usage
// ============================================

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (inputValue?: string) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning'
  loading?: boolean
  // Optional text input
  inputLabel?: string
  inputPlaceholder?: string
  inputValue?: string
  onInputChange?: (value: string) => void
  inputRequired?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  onInputChange,
  inputRequired = false,
}: ConfirmModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const btnClass = {
    primary: 'btn btn-primary',
    success: 'btn btn-success',
    danger: 'btn btn-danger',
    warning: 'btn btn-warning',
  }[confirmVariant]

  const isDisabled = loading || (inputRequired && !inputValue.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-4 sm:p-6 w-full max-w-md">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold pr-8">{title}</h3>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4">{description}</p>
        )}

        {inputLabel && (
          <div className="mb-4">
            <label className="block text-xs sm:text-sm text-[var(--text-secondary)] mb-1.5">
              {inputLabel}
              {inputRequired && <span className="text-[var(--error)] ml-0.5">*</span>}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs sm:text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isDisabled) onConfirm(inputValue)
              }}
            />
          </div>
        )}

        <div className="flex gap-2 sm:gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1 text-sm" disabled={loading}>
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(inputValue)}
            className={`${btnClass} flex-1 text-sm`}
            disabled={isDisabled}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
