import Link from 'next/link'
import { MessageCircle, ExternalLink, Gamepad2, ChevronRight } from 'lucide-react'

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden">
      {/* Top Gradient Line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      {/* Main Footer */}
      <div className="bg-[#0a0c10]">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
            {/* Brand - Spans 5 cols on md+ */}
            <div className="col-span-2 md:col-span-5">
              <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-accent to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/30 transition-shadow">
                  <Gamepad2 className="w-5 h-5 text-black" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg font-bold leading-tight">
                    <span className="text-accent">Sui</span>
                    <span className="text-white">Dex</span>
                  </span>
                  <span className="text-[9px] text-text-muted uppercase tracking-widest">Games</span>
                </div>
              </Link>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xs mb-6">
                Win Victory tokens, SuiTrump, and more! Part of the SuiDex ecosystem on Sui Network.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-2">
                <a
                  href="https://x.com/suidexHQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
                  aria-label="X (Twitter)"
                >
                  <XIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://t.me/Suidexhq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
                  aria-label="Telegram"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Games - Spans 3 cols */}
            <div className="col-span-1 md:col-span-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Games</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/wheel"
                    className="group flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span className="text-base">🎡</span>
                    <span>Wheel of Victory</span>
                    <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                  </Link>
                </li>
                <li>
                  <span className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="text-base grayscale opacity-60">🎟️</span>
                    <span>Victory Lottery</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">Soon</span>
                  </span>
                </li>
                <li>
                  <span className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="text-base grayscale opacity-60">📈</span>
                    <span>Predictions</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">Soon</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Ecosystem - Spans 2 cols */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Ecosystem</h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://suidex.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>SuiDex DEX</span>
                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://suidex.gitbook.io/suidex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources - Spans 2 cols */}
            <div className="col-span-2 md:col-span-2">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/referral"
                    className="group flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>Referral Program</span>
                    <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    className="group flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>My Profile</span>
                    <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                  </Link>
                </li>
                <li>
                  <a
                    href="https://x.com/suidexHQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>Community</span>
                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/Suidexhq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    <span>Telegram</span>
                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-text-muted text-xs">
                © 2025 SuiDex Games. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
