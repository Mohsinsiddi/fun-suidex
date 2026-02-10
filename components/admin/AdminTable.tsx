'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ============================================
// AdminTable - Generic typed table with sort & select
// ============================================

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  width?: string
  render?: (item: T, index: number) => React.ReactNode
}

interface AdminTableProps<T extends { _id: string }> {
  columns: Column<T>[]
  data: T[]
  selectable?: boolean
  selectedIds?: string[]
  onSelectChange?: (ids: string[]) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  emptyState?: React.ReactNode
  onRowClick?: (item: T) => void
}

export function AdminTable<T extends { _id: string }>({
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onSelectChange,
  sortBy,
  sortOrder,
  onSort,
  emptyState,
  onRowClick,
}: AdminTableProps<T>) {
  const allSelected = data.length > 0 && data.every((item) => selectedIds.includes(item._id))
  const someSelected = data.some((item) => selectedIds.includes(item._id))

  const handleSelectAll = useCallback(() => {
    if (!onSelectChange) return
    if (allSelected) {
      onSelectChange([])
    } else {
      onSelectChange(data.map((item) => item._id))
    }
  }, [allSelected, data, onSelectChange])

  const handleSelect = useCallback(
    (id: string) => {
      if (!onSelectChange) return
      if (selectedIds.includes(id)) {
        onSelectChange(selectedIds.filter((sid) => sid !== id))
      } else {
        onSelectChange([...selectedIds, id])
      }
    },
    [selectedIds, onSelectChange]
  )

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ChevronsUpDown className="w-3 h-3 opacity-40" />
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-[var(--accent)]" />
    ) : (
      <ChevronDown className="w-3 h-3 text-[var(--accent)]" />
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {selectable && (
              <th className="px-3 sm:px-4 py-2.5 sm:py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={handleSelectAll}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-[var(--accent)]"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs text-[var(--text-secondary)] uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''
                }`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && getSortIcon(col.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={item._id}
              className={`border-b border-[var(--border)]/50 hover:bg-[var(--card-hover)] transition-colors ${
                selectedIds.includes(item._id) ? 'bg-[var(--accent)]/5' : ''
              } ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {selectable && (
                <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item._id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleSelect(item._id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-[var(--accent)]"
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key} className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
                  {col.render
                    ? col.render(item, idx)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AdminTable
