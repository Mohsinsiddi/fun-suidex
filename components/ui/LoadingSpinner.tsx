// ============================================
// Loading Spinner Component
// ============================================
// Uses theme variables from globals.css

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-[var(--accent)] ${sizeClasses[size]} ${className}`}
    />
  )
}

/**
 * Full page loading state
 */
export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-[var(--text-secondary)]">{message}</p>
    </div>
  )
}

/**
 * Inline loading state
 */
export function LoadingInline({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
      <LoadingSpinner size="sm" />
      <span>{message}</span>
    </div>
  )
}

/**
 * Button loading state
 */
export function LoadingButton({
  loading,
  children,
  className = '',
  ...props
}: {
  loading: boolean
  children: React.ReactNode
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default LoadingSpinner
