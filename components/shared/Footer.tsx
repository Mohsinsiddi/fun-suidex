import Link from 'next/link'
import { Twitter, MessageCircle, FileText } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎮</span>
              <span className="font-display text-xl font-bold">
                <span className="text-accent">Sui</span>
                <span className="text-white">Dex</span>
                <span className="text-text-secondary ml-1 text-sm font-normal">Games</span>
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-md">
              Win Victory tokens, SuiTrump, and more! Powered by SuiDex - the leading DEX on Sui Network.
            </p>
          </div>

          {/* Games */}
          <div>
            <h4 className="text-white font-semibold mb-3">Games</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/wheel" className="text-text-secondary hover:text-accent transition-colors">
                  🎡 Wheel of Victory
                </Link>
              </li>
              <li>
                <span className="text-text-muted">
                  🎟️ Victory Lottery (Soon)
                </span>
              </li>
              <li>
                <span className="text-text-muted">
                  🃏 More Games (Soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://suidex.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent transition-colors"
                >
                  SuiDex DEX
                </a>
              </li>
              <li>
                <a
                  href="https://docs.suidex.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/SuiDex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
                >
                  <Twitter className="w-3 h-3" />
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/SuiDex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            © 2025 SuiDex Games. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/SuiDex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://t.me/SuiDex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
