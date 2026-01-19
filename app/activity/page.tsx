'use client'

import Link from 'next/link'
import { ArrowLeft, Activity, Play } from 'lucide-react'
import { LiveActivityFeed } from '@/components/activity'

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Subtle Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[var(--success)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--card)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)]" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success)] border border-[var(--background)]"></span>
                  </span>
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Live Activity
                  </h1>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">
                    Real-time wins
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/wheel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[var(--accent)] text-black text-xs sm:text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Spin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <LiveActivityFeed
          limit={50}
          compact={true}
          showHeader={false}
          showViewAll={false}
          showStats={true}
        />
      </main>

      {/* Compact Footer CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--card)]/30">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm sm:text-base font-semibold text-white">
                Ready to join?
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Your win could appear here next!
              </p>
            </div>
            <Link
              href="/wheel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-black font-semibold text-sm hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-glow)] transition-all"
            >
              <Play className="w-4 h-4" />
              Start Spinning
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
