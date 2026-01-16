// ============================================
// Pagination Component
// ============================================
// Uses theme variables from globals.css

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNext?: boolean
  hasPrev?: boolean
  showFirstLast?: boolean
  className?: string
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  hasNext = page < totalPages,
  hasPrev = page > 1,
  showFirstLast = true,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Calculate visible page numbers for desktop
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // Max visible page buttons

    if (totalPages <= showPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    pages.push(1)

    // Calculate middle range
    let start = Math.max(2, page - 1)
    let end = Math.min(totalPages - 1, page + 1)

    // Adjust if at edges
    if (page <= 3) {
      end = Math.min(4, totalPages - 1)
    }
    if (page >= totalPages - 2) {
      start = Math.max(totalPages - 3, 2)
    }

    // Add ellipsis before middle if needed
    if (start > 2) {
      pages.push('ellipsis')
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Add ellipsis after middle if needed
    if (end < totalPages - 1) {
      pages.push('ellipsis')
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  // Generate all page options for mobile dropdown
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* First page button */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrev}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      )}

      {/* Previous button */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Mobile: Dropdown select */}
      <select
        value={page}
        onChange={(e) => onPageChange(Number(e.target.value))}
        className="sm:hidden px-2 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] min-w-[70px] text-center"
      >
        {allPages.map((p) => (
          <option key={p} value={p}>
            {p} / {totalPages}
          </option>
        ))}
      </select>

      {/* Desktop: Page number buttons */}
      <div className="hidden sm:flex items-center gap-1">
        {visiblePages.map((p, index) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-[var(--text-muted)]"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[2.25rem] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last page button */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Compact pagination info text
 */
export function PaginationInfo({
  page,
  limit,
  total,
  className = '',
}: {
  page: number
  limit: number
  total: number
  className?: string
}) {
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  if (total === 0) {
    return <span className={`text-sm text-[var(--text-muted)] ${className}`}>No results</span>
  }

  return (
    <span className={`text-sm text-[var(--text-muted)] ${className}`}>
      Showing {start}-{end} of {total}
    </span>
  )
}

export default Pagination
