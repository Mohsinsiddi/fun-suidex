'use client'

// ============================================
// StatusBadge - Consistent status indicator
// ============================================

const VARIANTS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  pending: {
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
  },
  distributed: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
  },
  failed: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
  claimed: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
  },
  pending_approval: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  ready: {
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  paid: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
  },
  unclaimed: {
    dot: 'bg-gray-400',
    text: 'text-gray-400',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/30',
  },
  pending_tweet: {
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
  },
  manual: {
    dot: 'bg-purple-400',
    text: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
  },
}

const DEFAULT_VARIANT = {
  dot: 'bg-gray-400',
  text: 'text-gray-400',
  bg: 'bg-gray-400/10',
  border: 'border-gray-400/30',
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const v = VARIANTS[status] || DEFAULT_VARIANT
  const displayLabel = label || status.replace(/_/g, ' ')

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium capitalize border ${v.bg} ${v.text} ${v.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {displayLabel}
    </span>
  )
}

export default StatusBadge
