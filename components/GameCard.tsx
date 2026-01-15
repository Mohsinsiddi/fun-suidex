'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui';

interface GameCardProps {
  slug: string;
  name: string;
  description: string;
  status: 'live' | 'coming_soon';
  icon: string;
  gradient: string;
  expectedDate?: string;
}

export function GameCard({
  slug,
  name,
  description,
  status,
  icon,
  gradient,
  expectedDate,
}: GameCardProps) {
  const isLive = status === 'live';

  const cardClassName = `
    block h-full p-6 rounded-2xl
    bg-[var(--card)] border border-[var(--border)]
    transition-all duration-300
    ${isLive
      ? 'hover:border-[var(--border-hover)] hover:shadow-[0_0_40px_var(--accent-glow)] cursor-pointer'
      : 'opacity-70 cursor-default'
    }
  `;

  const cardContent = (
    <>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            whileHover={isLive ? { rotate: 10, scale: 1.1 } : {}}
            className={`
              w-16 h-16 rounded-2xl
              bg-gradient-to-br ${gradient}
              flex items-center justify-center
              text-3xl
              ${isLive ? 'shadow-lg' : ''}
            `}
          >
            {icon}
          </motion.div>
          
          <Badge
            variant={isLive ? 'success' : 'warning'}
            dot
          >
            {isLive ? 'Live' : 'Soon'}
          </Badge>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold font-[var(--font-display)] text-[var(--text-primary)] mb-2">
          {name}
        </h3>
        
        <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Footer */}
        {isLive ? (
          <div className="flex items-center text-[var(--accent-primary)] text-sm font-medium">
            <span>Play Now</span>
            <ArrowRight size={16} className="ml-1" />
          </div>
        ) : (
          <div className="flex items-center text-[var(--text-muted)] text-sm">
            <Clock size={14} className="mr-1.5" />
            <span>Expected {expectedDate}</span>
          </div>
        )}
    </>
  );

  return (
    <motion.div
      whileHover={isLive ? { y: -4 } : {}}
      className="h-full"
    >
      {isLive ? (
        <Link href={`/${slug}`} className={cardClassName}>
          {cardContent}
        </Link>
      ) : (
        <div className={cardClassName}>
          {cardContent}
        </div>
      )}
    </motion.div>
  );
}

export default GameCard;
