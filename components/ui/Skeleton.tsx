// ============================================
// Skeleton Loading Component
// ============================================
// Uses .skeleton class from globals.css

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

/**
 * Basic skeleton box
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />
}

/**
 * Skeleton text line
 */
export function SkeletonText({ className = '', width = '100%' }: SkeletonProps & { width?: string }) {
  return <div className={`skeleton h-4 ${className}`} style={{ width }} />
}

/**
 * Skeleton for stat cards
 */
export function SkeletonStatCard() {
  return (
    <div className="card p-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton for full table
 */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton for card grid
 */
export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for list items
 */
export function SkeletonListItem() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/**
 * Skeleton for user/wallet display
 */
export function SkeletonWallet() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export default Skeleton
