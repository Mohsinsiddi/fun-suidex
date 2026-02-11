'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'

// ============================================
// FilterBar - Collapsible filters with active count
// ============================================

export type FilterConfig =
  | { key: string; type: 'text'; label: string; placeholder?: string }
  | { key: string; type: 'select'; label: string; options: { value: string; label: string }[] }
  | { key: string; type: 'date-range'; labelFrom: string; labelTo: string }

interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  onClear: () => void
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const [open, setOpen] = useState(false)

  const activeCount = Object.values(values).filter(Boolean).length

  const updateFilter = (key: string, value: string) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-ghost text-xs sm:text-sm px-3 py-1.5"
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[var(--accent)] text-[var(--text-inverse)] rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)] flex items-center gap-1">
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-end gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          {filters.map((filter) => {
            if (filter.type === 'text') {
              return (
                <div key={filter.key} className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">
                    {filter.label}
                  </label>
                  <input
                    type="text"
                    value={values[filter.key] || ''}
                    onChange={(e) => updateFilter(filter.key, e.target.value)}
                    placeholder={filter.placeholder || ''}
                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )
            }

            if (filter.type === 'select') {
              return (
                <div key={filter.key} className="min-w-[140px]">
                  <label className="block text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">
                    {filter.label}
                  </label>
                  <select
                    value={values[filter.key] || ''}
                    onChange={(e) => updateFilter(filter.key, e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            if (filter.type === 'date-range') {
              return (
                <div key={filter.key} className="flex items-end gap-2">
                  <div className="min-w-[130px]">
                    <label className="block text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">
                      {filter.labelFrom}
                    </label>
                    <input
                      type="date"
                      value={values[`${filter.key}From`] || ''}
                      onChange={(e) => updateFilter(`${filter.key}From`, e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div className="min-w-[130px]">
                    <label className="block text-[10px] sm:text-xs text-[var(--text-secondary)] mb-1">
                      {filter.labelTo}
                    </label>
                    <input
                      type="date"
                      value={values[`${filter.key}To`] || ''}
                      onChange={(e) => updateFilter(`${filter.key}To`, e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}

export default FilterBar
