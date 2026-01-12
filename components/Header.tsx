'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, ExternalLink } from 'lucide-react';
import { ConnectWallet } from '@/components/auth/ConnectWallet';

const navLinks = [
  { href: '/', label: 'Games' },
  { href: '/wheel', label: 'Wheel' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]"
            >
              <Gamepad2 className="w-5 h-5 text-[var(--background)]" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="font-[var(--font-display)] font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                SuiDex
              </span>
              <span className="font-[var(--font-display)] font-bold text-lg text-[var(--accent-primary)]">
                {' '}Games
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${pathname === link.href
                    ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card)]'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://suidex.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card)] transition-all flex items-center gap-1.5"
            >
              Main DEX
              <ExternalLink size={14} />
            </a>
          </nav>

          {/* Wallet Connect */}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}

export default Header;
