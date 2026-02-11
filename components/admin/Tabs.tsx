'use client'

// ============================================
// Tabs - Pill-style tabs with count badges
// ============================================

export interface Tab {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
            activeTab === tab.key
              ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
              : 'bg-[var(--card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-white/20'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold leading-none ${
                activeTab === tab.key
                  ? 'bg-white/20 text-[var(--text-inverse)]'
                  : 'bg-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default Tabs
