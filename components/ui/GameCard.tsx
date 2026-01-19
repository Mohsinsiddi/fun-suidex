'use client'

// ============================================
// Game Card Component
// ============================================

import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import type { GameCardProps } from '@/types'

export function GameCard({ slug, name, description, status }: GameCardProps) {
  const isLive = status === 'live'
  const isComingSoon = status === 'coming_soon'
  const isMaintenance = status === 'maintenance'

  const cardClassName = `card p-6 group ${isLive ? 'cursor-pointer card-glow' : 'opacity-75'}`

  const content = (
    <>
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <div
          className={`badge ${
            isLive
              ? 'badge-success'
              : isMaintenance
              ? 'badge-error'
              : 'badge-warning'
          }`}
        >
          {isLive ? 'Live' : isMaintenance ? 'Maintenance' : 'Coming Soon'}
        </div>
        
        {isLive && (
          <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
        )}
        
        {isComingSoon && (
          <Clock className="w-5 h-5 text-text-muted" />
        )}
      </div>

      {/* Game Image Placeholder */}
      <div className="aspect-video rounded-lg bg-background mb-4 flex items-center justify-center border border-border overflow-hidden">
        {slug === 'wheel' ? (
          <WheelPreview />
        ) : (
          <span className="text-text-muted text-sm">Preview coming soon</span>
        )}
      </div>

      {/* Content */}
      <h3 className="font-display text-xl font-bold mb-2 group-hover:text-accent transition-colors">
        {name}
      </h3>
      <p className="text-text-secondary text-sm">{description}</p>

      {/* Play Button (for live games) */}
      {isLive && (
        <div className="mt-4 pt-4 border-t border-border">
          <span className="btn btn-primary w-full">
            Play Now
          </span>
        </div>
      )}
    </>
  )

  return isLive ? (
    <Link href={`/${slug}`} className={cardClassName}>
      {content}
    </Link>
  ) : (
    <div className={cardClassName}>
      {content}
    </div>
  )
}

// ----------------------------------------
// Wheel Preview SVG
// ----------------------------------------

function WheelPreview() {
  const slots = 16
  const colors = [
    'var(--prize-liquid)',
    'var(--prize-none)',
    'var(--prize-liquid)',
    'var(--prize-cyan)',
    'var(--prize-purple)',
    'var(--prize-none)',
    'var(--prize-liquid)',
    'var(--prize-gold)',
    'var(--prize-liquid)',
    'var(--prize-none)',
    'var(--prize-cyan)',
    'var(--prize-liquid)',
    'var(--prize-none)',
    'var(--prize-gold)',
    'var(--prize-liquid)',
    'var(--prize-none)',
  ]

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Wheel Segments */}
      <g transform="translate(100, 100)">
        {Array.from({ length: slots }).map((_, i) => {
          const angle = (360 / slots) * i - 90
          const nextAngle = (360 / slots) * (i + 1) - 90
          const startRad = (angle * Math.PI) / 180
          const endRad = (nextAngle * Math.PI) / 180
          const radius = 80

          const x1 = Math.cos(startRad) * radius
          const y1 = Math.sin(startRad) * radius
          const x2 = Math.cos(endRad) * radius
          const y2 = Math.sin(endRad) * radius

          return (
            <path
              key={i}
              d={`M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
              fill={colors[i]}
              stroke="var(--border)"
              strokeWidth="1"
            />
          )
        })}
      </g>

      {/* Center Circle */}
      <circle
        cx="100"
        cy="100"
        r="20"
        fill="var(--card)"
        stroke="var(--accent)"
        strokeWidth="2"
      />

      {/* Pointer */}
      <polygon
        points="100,10 95,30 105,30"
        fill="var(--accent)"
        stroke="var(--background)"
        strokeWidth="1"
      />
    </svg>
  )
}
