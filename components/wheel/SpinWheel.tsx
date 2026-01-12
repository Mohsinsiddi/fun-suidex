'use client'

// ============================================
// Spin Wheel SVG Component
// ============================================

import { motion } from 'framer-motion'
import { WHEEL_CONFIG } from '@/constants'

interface SpinWheelProps {
  rotation: number
  isSpinning: boolean
}

export function SpinWheel({ rotation, isSpinning }: SpinWheelProps) {
  const { SLOT_COUNT } = WHEEL_CONFIG
  
  // Prize slot colors
  const slotColors = [
    'var(--prize-liquid)',   // 0: Liquid Victory $5
    'var(--prize-none)',     // 1: No Prize
    'var(--prize-liquid)',   // 2: Liquid Victory $30
    'var(--prize-cyan)',     // 3: SuiTrump $20
    'var(--prize-purple)',   // 4: Locked Victory $100
    'var(--prize-none)',     // 5: No Prize
    'var(--prize-liquid)',   // 6: Liquid Victory $10
    'var(--prize-gold)',     // 7: Jackpot $1000
    'var(--prize-liquid)',   // 8: Liquid Victory $5
    'var(--prize-none)',     // 9: No Prize
    'var(--prize-cyan)',     // 10: SuiTrump $100
    'var(--prize-liquid)',   // 11: Liquid Victory $50
    'var(--prize-none)',     // 12: No Prize
    'var(--prize-gold)',     // 13: Jackpot $3500
    'var(--prize-liquid)',   // 14: Liquid Victory $20
    'var(--prize-none)',     // 15: No Prize
  ]

  const slotLabels = [
    '$5', '', '$30', '$20', '$100',
    '', '$10', '$1K', '$5', '',
    '$100', '$50', '', '$3.5K', '$20', ''
  ]

  return (
    <div className="relative">
      {/* Glow Effect */}
      <div 
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-500 ${
          isSpinning ? 'opacity-50' : 'opacity-20'
        }`}
        style={{ background: 'var(--accent-glow)' }}
      />

      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
        <svg width="40" height="50" viewBox="0 0 40 50">
          <defs>
            <filter id="pointerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polygon
            points="20,50 5,10 20,0 35,10"
            fill="var(--accent)"
            filter="url(#pointerGlow)"
          />
          <polygon
            points="20,45 10,15 20,5 30,15"
            fill="var(--background)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Wheel */}
      <motion.div
        className="relative w-80 h-80 md:w-96 md:h-96"
        animate={{ rotate: rotation }}
        transition={{
          duration: WHEEL_CONFIG.SPIN_DURATION_MS / 1000,
          ease: [0.17, 0.67, 0.12, 0.99], // Custom easing
        }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
          <defs>
            {/* Gradient for each slot */}
            {slotColors.map((color, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`slotGrad-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </linearGradient>
            ))}

            {/* Outer ring gradient */}
            <linearGradient id="outerRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--secondary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Outer decorative ring */}
          <circle
            cx="200"
            cy="200"
            r="195"
            fill="none"
            stroke="url(#outerRing)"
            strokeWidth="6"
          />

          {/* Wheel background */}
          <circle cx="200" cy="200" r="180" fill="var(--card)" />

          {/* Wheel Segments */}
          <g transform="translate(200, 200)">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const angle = (360 / SLOT_COUNT) * i - 90
              const nextAngle = (360 / SLOT_COUNT) * (i + 1) - 90
              const startRad = (angle * Math.PI) / 180
              const endRad = (nextAngle * Math.PI) / 180
              const radius = 170

              const x1 = Math.cos(startRad) * radius
              const y1 = Math.sin(startRad) * radius
              const x2 = Math.cos(endRad) * radius
              const y2 = Math.sin(endRad) * radius

              // Label position
              const midAngle = (angle + nextAngle) / 2
              const midRad = (midAngle * Math.PI) / 180
              const labelRadius = radius * 0.65
              const labelX = Math.cos(midRad) * labelRadius
              const labelY = Math.sin(midRad) * labelRadius

              return (
                <g key={i}>
                  {/* Segment */}
                  <path
                    d={`M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
                    fill={`url(#slotGrad-${i})`}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />

                  {/* Label */}
                  {slotLabels[i] && (
                    <text
                      x={labelX}
                      y={labelY}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="var(--font-display)"
                      transform={`rotate(${midAngle + 90}, ${labelX}, ${labelY})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {slotLabels[i]}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Inner decorative rings */}
          <circle
            cx="200"
            cy="200"
            r="50"
            fill="var(--card)"
            stroke="var(--border-bright)"
            strokeWidth="2"
          />
          <circle
            cx="200"
            cy="200"
            r="35"
            fill="var(--accent)"
            opacity="0.1"
          />
          <circle
            cx="200"
            cy="200"
            r="25"
            fill="var(--card)"
            stroke="var(--accent)"
            strokeWidth="2"
          />

          {/* Center logo/text */}
          <text
            x="200"
            y="200"
            fill="var(--accent)"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="bold"
            fontFamily="var(--font-display)"
          >
            SPIN
          </text>
        </svg>
      </motion.div>

      {/* Decorative dots around the wheel */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (360 / 24) * i
          const radius = 52 // percentage
          const x = 50 + radius * Math.cos((angle - 90) * Math.PI / 180)
          const y = 50 + radius * Math.sin((angle - 90) * Math.PI / 180)

          return (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-full ${
                i % 2 === 0 ? 'bg-accent' : 'bg-secondary'
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: isSpinning ? 0.8 : 0.4,
                transition: 'opacity 0.3s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
