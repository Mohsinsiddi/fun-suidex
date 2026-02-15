'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import { useConfigStore, formatPrizeTableForWheel } from '@/lib/stores/configStore'
import { SPIN_UI } from '@/constants'
import { TOKENS, LP_POOLS } from '@/constants/pools'
import { PoolsModal } from '@/components/wheel/PoolsModal'
import { Gift, Coins, Trophy, Clock, X, Sparkles, CircleDot, ListChecks, Lock, Droplets, TrendingUp, Settings, History, Search, Home, RotateCw, Volume2, VolumeX, ChevronRight } from 'lucide-react'
import { soundManager } from '@/lib/utils/sounds'
import Link from 'next/link'

const DEFAULT_WHEEL_SLOTS: WheelSlot[] = [
  { index: 0, label: "4K", sublabel: "Liquid", color: "#FFD700", amount: "4K VICT", rawAmount: 4000, type: "liquid_victory", valueUSD: 0, lockType: "LIQUID", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 1, label: "40K", sublabel: "Liquid", color: "#FFA500", amount: "40K VICT", rawAmount: 40000, type: "liquid_victory", valueUSD: 0, lockType: "LIQUID", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 2, label: "800K", sublabel: "Liquid", color: "#FF8C00", amount: "800K VICT", rawAmount: 800000, type: "liquid_victory", valueUSD: 0, lockType: "LIQUID", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 3, label: "4K", sublabel: "1W Lock", color: "#4FC3F7", amount: "4K VICT", rawAmount: 4000, type: "locked_victory", valueUSD: 0, lockType: "1W LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 4, label: "16K", sublabel: "1W Lock", color: "#29B6F6", amount: "16K VICT", rawAmount: 16000, type: "locked_victory", valueUSD: 0, lockType: "1W LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 5, label: "20K", sublabel: "3M Lock", color: "#03A9F4", amount: "20K VICT", rawAmount: 20000, type: "locked_victory", valueUSD: 0, lockType: "3M LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 6, label: "40K", sublabel: "3M Lock", color: "#039BE5", amount: "40K VICT", rawAmount: 40000, type: "locked_victory", valueUSD: 0, lockType: "3M LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 7, label: "80K", sublabel: "1Y Lock", color: "#0288D1", amount: "80K VICT", rawAmount: 80000, type: "locked_victory", valueUSD: 0, lockType: "1Y LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 8, label: "200K", sublabel: "1Y Lock", color: "#0277BD", amount: "200K VICT", rawAmount: 200000, type: "locked_victory", valueUSD: 0, lockType: "1Y LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 9, label: "400K", sublabel: "3Y Lock", color: "#7B1FA2", amount: "400K VICT", rawAmount: 400000, type: "locked_victory", valueUSD: 0, lockType: "3Y LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 10, label: "1.6M", sublabel: "3Y Lock", color: "#8E24AA", amount: "1.6M VICT", rawAmount: 1600000, type: "locked_victory", valueUSD: 0, lockType: "3Y LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 11, label: "2.4M", sublabel: "3Y Lock", color: "#9C27B0", amount: "2.4M VICT", rawAmount: 2400000, type: "locked_victory", valueUSD: 0, lockType: "3Y LOCK", tokenSymbol: "VICT", tokenPrice: 0, tokenChange24h: 0 },
  { index: 12, label: "10", sublabel: "Trump", color: "#EF5350", amount: "10 TRUMP", rawAmount: 10, type: "suitrump", valueUSD: 0, lockType: "MEME", tokenSymbol: "TRUMP", tokenPrice: 0, tokenChange24h: 0 },
  { index: 13, label: "50", sublabel: "Trump", color: "#F44336", amount: "50 TRUMP", rawAmount: 50, type: "suitrump", valueUSD: 0, lockType: "MEME", tokenSymbol: "TRUMP", tokenPrice: 0, tokenChange24h: 0 },
  { index: 14, label: "500", sublabel: "Trump", color: "#E53935", amount: "500 TRUMP", rawAmount: 500, type: "suitrump", valueUSD: 0, lockType: "MEME", tokenSymbol: "TRUMP", tokenPrice: 0, tokenChange24h: 0 },
  { index: 15, label: "NONE", sublabel: "No Prize", color: "#546E7A", amount: "", rawAmount: 0, type: "no_prize", valueUSD: 0, lockType: "NONE", tokenSymbol: "", tokenPrice: 0, tokenChange24h: 0 },
]

interface WheelSlot {
  index: number
  label: string
  sublabel: string
  color: string
  amount: string
  rawAmount: number
  type: string
  valueUSD: number
  lockType: string
  tokenSymbol: string
  tokenPrice: number
  tokenChange24h: number
}

type TabType = 'wheel' | 'spins' | 'prizes'

export default function PWAGamePage() {
  const router = useRouter()
  const {
    isAuthenticated,
    freeSpins,
    purchasedSpins,
    bonusSpins,
    totalWinsUSD,
    referralCode,
    setSpins,
  } = usePWAAuthStore()

  const {
    prizeTable,
    tokenPrices,
    isLoaded: configLoaded,
    fetchConfig
  } = useConfigStore()

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('wheel')
  const [wheelSlots, setWheelSlots] = useState<WheelSlot[]>(DEFAULT_WHEEL_SLOTS)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSlot | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<WheelSlot | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [autoSpin, setAutoSpin] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [modalPaused, setModalPaused] = useState(false)
  const pendingAutoSpinRef = useRef(false)
  const pendingResultRef = useRef<WheelSlot | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showPoolsModal, setShowPoolsModal] = useState(false)

  // Init sounds on mount
  useEffect(() => {
    soundManager.init()
    setIsMuted(soundManager.muted)
  }, [])

  const spins = { free: freeSpins, purchased: purchasedSpins, bonus: bonusSpins }
  const slotCount = wheelSlots.length
  const slotAngle = 360 / slotCount
  const totalSpins = freeSpins + purchasedSpins + bonusSpins

  const cx = 200, cy = 200
  const outerRadius = 175

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/pwa')
    }
  }, [mounted, isAuthenticated, router])

  // Load config
  useEffect(() => {
    if (!configLoaded) fetchConfig()
  }, [configLoaded, fetchConfig])

  // Update wheel slots when config loads
  useEffect(() => {
    if (prizeTable.length > 0) {
      setWheelSlots(formatPrizeTableForWheel(prizeTable, tokenPrices))
    }
  }, [prizeTable, tokenPrices])

  // Load auto-spin preference from localStorage
  useEffect(() => {
    if (mounted) {
      const saved = localStorage.getItem('pwa-auto-spin')
      if (saved === 'true') setAutoSpin(true)
    }
  }, [mounted])

  // Save auto-spin preference to localStorage
  const toggleAutoSpin = useCallback(() => {
    setAutoSpin(prev => {
      const newVal = !prev
      localStorage.setItem('pwa-auto-spin', String(newVal))
      return newVal
    })
  }, [])

  // Auto-close modal with countdown
  // Wins stay open until user clicks away (unless auto-spin is ON)
  // No-prize always auto-closes
  useEffect(() => {
    if (!result || modalPaused) return

    const isWin = result.type !== 'no_prize'

    // Wins stay open unless auto-spin is enabled
    if (isWin && !autoSpin) return

    const autoCloseMs = isWin
      ? SPIN_UI.WIN_AUTO_CLOSE_MS
      : SPIN_UI.NO_PRIZE_AUTO_CLOSE_MS

    const countdownSeconds = Math.ceil(autoCloseMs / 1000)
    setCountdown(countdownSeconds)

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)

    const timeout = setTimeout(() => {
      // Set flag for pending auto-spin before closing modal
      if (autoSpin && totalSpins > 0) {
        pendingAutoSpinRef.current = true
      }
      setResult(null)
      setIsSubmitting(false)
      setCountdown(null)
      setModalPaused(false)
    }, autoCloseMs)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [result, modalPaused, autoSpin, totalSpins])

  // Handle pending auto-spin after modal closes
  useEffect(() => {
    if (pendingAutoSpinRef.current && !result && !isSpinning && !isSubmitting && totalSpins > 0) {
      pendingAutoSpinRef.current = false
      const timer = setTimeout(() => {
        handleSpin()
      }, SPIN_UI.AUTO_SPIN_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [result, isSpinning, isSubmitting, totalSpins])

  const calculateRotationForSlot = (slotIndex: number): number => {
    const slotCenterAngle = slotIndex * slotAngle + (slotAngle / 2)
    return 360 - slotCenterAngle
  }

  const spinWheel = async (slotToLandOn: number, capturedSlot: WheelSlot) => {
    if (isSpinning || slotToLandOn < 0 || slotToLandOn >= slotCount) return
    setIsSpinning(true)
    setResult(null)
    setShowConfetti(false)
    setError(null)
    setHoveredSlot(null)
    setActiveTab('wheel')

    // Store the captured slot to avoid flicker from state changes during animation
    pendingResultRef.current = capturedSlot

    const currentNormalized = ((rotation % 360) + 360) % 360
    const targetAngle = calculateRotationForSlot(slotToLandOn)
    let deltaRotation = targetAngle - currentNormalized
    if (deltaRotation <= 0) deltaRotation += 360
    const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360
    const totalSpinDegrees = fullRotations + deltaRotation
    setRotation(rotation + totalSpinDegrees)

    // Play tick sound — one tick per slot boundary crossing
    soundManager.playTick(totalSpinDegrees, slotCount)

    setTimeout(() => {
      setIsSpinning(false)
      soundManager.stopTick()
      // Use the captured slot to prevent flicker
      const winningSlot = pendingResultRef.current || wheelSlots[slotToLandOn]
      setResult(winningSlot)
      setModalPaused(false) // Reset pause state for new result
      pendingResultRef.current = null
      if (winningSlot.type !== 'no_prize') {
        soundManager.playWin()
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), SPIN_UI.CONFETTI_DURATION_MS)
      } else {
        soundManager.playNoPrize()
      }
    }, 6000) // Match wheel animation duration
  }

  const handleSpin = async () => {
    if (totalSpins <= 0) { setError('No spins available!'); return }
    if (isSubmitting || isSpinning) return // Prevent multiple clicks

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await pwaFetch('/api/spin', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Spin failed')
        setIsSubmitting(false)
        return
      }
      // Update spins from response
      if (data.data.spins) {
        setSpins(data.data.spins, data.data.stats)
      }
      // Capture the slot at API response time to avoid flicker
      // Use server-calculated prizeValueUSD (live price at spin time)
      const capturedSlot = { ...wheelSlots[data.data.slotIndex] }
      if (data.data.prizeValueUSD != null) {
        capturedSlot.valueUSD = data.data.prizeValueUSD
      }
      spinWheel(data.data.slotIndex, capturedSlot)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setIsSubmitting(false)
    }
  }

  // Create slice path
  const createSlicePath = (index: number): string => {
    const startAngle = (index * slotAngle - 90) * (Math.PI / 180)
    const endAngle = ((index + 1) * slotAngle - 90) * (Math.PI / 180)
    const x1 = cx + outerRadius * Math.cos(startAngle)
    const y1 = cy + outerRadius * Math.sin(startAngle)
    const x2 = cx + outerRadius * Math.cos(endAngle)
    const y2 = cy + outerRadius * Math.sin(endAngle)
    const largeArc = slotAngle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  // Arc paths for text
  const createLockTypeArcPath = (index: number): string => {
    const padding = slotCount > 12 ? 2 : 3
    const startAngle = (index * slotAngle - 90 + padding) * (Math.PI / 180)
    const endAngle = ((index + 1) * slotAngle - 90 - padding) * (Math.PI / 180)
    const textRadius = outerRadius - 10
    const x1 = cx + textRadius * Math.cos(startAngle)
    const y1 = cy + textRadius * Math.sin(startAngle)
    const x2 = cx + textRadius * Math.cos(endAngle)
    const y2 = cy + textRadius * Math.sin(endAngle)
    return `M ${x1} ${y1} A ${textRadius} ${textRadius} 0 0 1 ${x2} ${y2}`
  }

  const createTokenArcPath = (index: number): string => {
    const padding = slotCount > 12 ? 2 : 3
    const startAngle = (index * slotAngle - 90 + padding) * (Math.PI / 180)
    const endAngle = ((index + 1) * slotAngle - 90 - padding) * (Math.PI / 180)
    const textRadius = outerRadius - 22
    const x1 = cx + textRadius * Math.cos(startAngle)
    const y1 = cy + textRadius * Math.sin(startAngle)
    const x2 = cx + textRadius * Math.cos(endAngle)
    const y2 = cy + textRadius * Math.sin(endAngle)
    return `M ${x1} ${y1} A ${textRadius} ${textRadius} 0 0 1 ${x2} ${y2}`
  }

  const getTextPosition = (index: number, radiusPercent: number) => {
    const angle = (index * slotAngle + slotAngle / 2 - 90) * (Math.PI / 180)
    const radius = outerRadius * radiusPercent
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      rotation: index * slotAngle + slotAngle / 2
    }
  }

  const handleSliceHover = (e: React.MouseEvent, slot: WheelSlot) => {
    if (isSpinning) return
    setHoveredSlot(slot)
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  const closeResultModal = useCallback(() => {
    setResult(null)
    setIsSubmitting(false)
    setCountdown(null)
    setModalPaused(false)
  }, [])

  const pauseModal = useCallback(() => {
    setModalPaused(true)
    setCountdown(null)
  }, [])

  const shareOnTwitter = useCallback(() => {
    if (!result || result.type === 'no_prize') return
    pauseModal() // Pause auto-close when sharing

    const lockInfo = result.lockType !== 'LIQUID' && result.lockType !== 'MEME' ? ` (${result.lockType})` : ''
    const hashtags = SPIN_UI.TWEET_HASHTAGS.map(h => `#${h}`).join(' ')
    const estUSD = result.valueUSD > 0 ? ` (~$${result.valueUSD.toFixed(2)})` : ''

    // Include referral link if user has a referral code
    const shareUrl = referralCode
      ? `${SPIN_UI.TWEET_BASE_URL}/r/${referralCode}`
      : `${SPIN_UI.TWEET_BASE_URL}/wheel`

    const tweetText = `🎉 I just won ${result.amount}${lockInfo}${estUSD} on @suidexHQ Wheel of Victory! 🎡

Spin to win up to 1M VICT! 🔥

🔗 ${shareUrl}
${hashtags}`

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'width=550,height=450')
  }, [result, pauseModal, referralCode])

  const getTypeIcon = (type: string, size: string = "w-3.5 h-3.5") => {
    if (type === 'liquid_victory') return <Droplets className={`${size} text-yellow-400`} />
    if (type === 'locked_victory') return <Lock className={`${size} text-blue-400`} />
    if (type === 'suitrump') return <TrendingUp className={`${size} text-red-400`} />
    return <X className={`${size} text-gray-400`} />
  }

  const tabs = [
    { id: 'wheel' as TabType, label: 'Wheel', icon: <CircleDot className="w-4 h-4" /> },
    { id: 'spins' as TabType, label: 'Spins', icon: <Sparkles className="w-4 h-4" />, badge: totalSpins > 0 ? totalSpins : undefined },
    { id: 'prizes' as TabType, label: 'Prizes', icon: <ListChecks className="w-4 h-4" /> },
  ]

  const getFontSizes = () => {
    if (slotCount <= 8) return { value: 18, slot: 9, lockType: 7, token: 8 }
    if (slotCount <= 12) return { value: 14, slot: 8, lockType: 6, token: 7 }
    if (slotCount <= 16) return { value: 12, slot: 7, lockType: 5, token: 6 }
    return { value: 10, slot: 6, lockType: 4, token: 5 }
  }
  const fonts = getFontSizes()

  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col p-3 pb-20">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(SPIN_UI.CONFETTI_PARTICLE_COUNT)].map((_, i) => (
            <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, top: -20, animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s` }}>
              <div style={{ width: 6 + Math.random() * 6, height: 6 + Math.random() * 6, backgroundColor: ['#00e5ff', '#FFD700', '#00ff88', '#a855f7', '#34D399'][Math.floor(Math.random() * 5)], transform: `rotate(${Math.random() * 360}deg)`, borderRadius: Math.random() > 0.5 ? '50%' : '0' }} />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md mx-auto w-full">
        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{totalSpins}</div>
              <div className="text-[10px] text-text-muted">Spins</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-lg font-bold text-accent">${totalWinsUSD.toLocaleString()}</div>
              <div className="text-[10px] text-text-muted">Won</div>
            </div>
          </div>
          <button
            onClick={() => { soundManager.init(); setIsMuted(soundManager.toggleMute()) }}
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface rounded-xl p-1 mb-4 border border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium text-xs transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-black'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-accent/20 text-accent'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <X className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* TAB: Wheel */}
        {activeTab === 'wheel' && (
          <div className="flex flex-col items-center">
            {/* Wheel */}
            <div className="relative w-[280px] h-[280px]">
              {/* Glow */}
              <div className="absolute inset-[-20px] rounded-full bg-gradient-to-r from-accent/10 via-purple-500/10 to-accent/10 blur-2xl" />

              {/* Pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-30">
                <svg width="28" height="40" viewBox="0 0 50 65" className="drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
                  <defs>
                    <linearGradient id="pGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00e5ff" />
                      <stop offset="100%" stopColor="#00b8d4" />
                    </linearGradient>
                  </defs>
                  <polygon points="25,58 8,12 25,24 42,12" fill="url(#pGrad)" stroke="#00e5ff" strokeWidth="2" />
                  <circle cx="25" cy="16" r="4" fill="#0a0f0a" stroke="#00e5ff" strokeWidth="2" />
                </svg>
              </div>

              {/* Wheel SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 400 400"
                className="relative z-10"
                style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 6s cubic-bezier(0.15, 0.60, 0.08, 1.0)' : 'none' }}
              >
                <defs>
                  {wheelSlots.map((_, i) => (
                    <g key={`arcs-${i}`}>
                      <path id={`lockArc${i}`} d={createLockTypeArcPath(i)} fill="none" />
                      <path id={`tokenArc${i}`} d={createTokenArcPath(i)} fill="none" />
                    </g>
                  ))}
                </defs>

                <circle cx={cx} cy={cy} r="195" fill="#0a1a0a" stroke="#00e5ff" strokeWidth="3" />
                <circle cx={cx} cy={cy} r="188" fill="none" stroke="rgba(0,229,255,0.2)" strokeWidth="1" />

                {wheelSlots.map((slot, i) => {
                  const valuePos = getTextPosition(i, 0.52)
                  const slotNumPos = getTextPosition(i, 0.30)
                  const isDark = slot.type === 'no_prize'
                  const textColor = isDark ? '#ffffff' : '#000000'
                  const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

                  return (
                    <g key={i} onMouseMove={(e) => handleSliceHover(e, slot)} onMouseLeave={() => setHoveredSlot(null)} style={{ cursor: isSpinning ? 'default' : 'pointer' }}>
                      <path d={createSlicePath(i)} fill={slot.color} stroke="#0a0f0a" strokeWidth="1.5" />
                      <text fontSize={fonts.lockType} fontWeight="700" fill={subTextColor}>
                        <textPath href={`#lockArc${i}`} startOffset="50%" textAnchor="middle">{slot.lockType}</textPath>
                      </text>
                      {slot.tokenSymbol && (
                        <text fontSize={fonts.token} fontWeight="800" fill={textColor}>
                          <textPath href={`#tokenArc${i}`} startOffset="50%" textAnchor="middle">{slot.tokenSymbol}</textPath>
                        </text>
                      )}
                      <text x={valuePos.x} y={valuePos.y} textAnchor="middle" dominantBaseline="middle" fill={textColor} fontSize={fonts.value} fontWeight="900" transform={`rotate(${valuePos.rotation}, ${valuePos.x}, ${valuePos.y})`}>
                        {slot.label}
                      </text>
                      <text x={slotNumPos.x} y={slotNumPos.y} textAnchor="middle" dominantBaseline="middle" fill={subTextColor} fontSize={fonts.slot} fontWeight="600" transform={`rotate(${slotNumPos.rotation}, ${slotNumPos.x}, ${slotNumPos.y})`}>
                        #{i + 1}
                      </text>
                    </g>
                  )
                })}

                <g style={isSpinning ? { animation: 'counter-rotate 3s linear infinite', transformOrigin: `${cx}px ${cy}px` } : { transformOrigin: `${cx}px ${cy}px` }}>
                  <circle cx={cx} cy={cy} r="38" fill="#0a1a0a" stroke="#00e5ff" strokeWidth="3">
                    {!isSpinning && <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />}
                  </circle>
                  <circle cx={cx} cy={cy} r="30" fill="#0f1a2a" />
                  <circle cx={cx} cy={cy} r="22" fill="#0a1a0a" stroke="rgba(0,229,255,0.3)" strokeWidth="1" />
                  <image href="/icons/icon-96.png" x={cx - 22} y={cy - 22} width="44" height="44" style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' }} />
                </g>
                {isSpinning && (
                  <circle cx={cx} cy={cy} r="50" fill="none" stroke="#00e5ff" strokeWidth="2" opacity="0.15">
                    <animate attributeName="r" values="40;60;40" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
              </svg>

              {/* LED Lights */}
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 - 90) * (Math.PI / 180)
                return (
                  <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 rounded-full z-20 ${isSpinning ? 'animate-blink' : ''}`}
                    style={{
                      left: `calc(50% + ${48 * Math.cos(angle)}% - 3px)`,
                      top: `calc(50% + ${48 * Math.sin(angle)}% - 3px)`,
                      backgroundColor: '#00e5ff',
                      boxShadow: '0 0 6px rgba(0,229,255,0.9)',
                      animationDelay: `${i * 0.04}s`
                    }}
                  />
                )
              })}
            </div>

            {/* Spin Button */}
            <div className="mt-5 w-full max-w-[280px] space-y-2">
              <button
                onClick={() => { soundManager.init(); handleSpin() }}
                disabled={isSubmitting || isSpinning || totalSpins <= 0}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                  isSubmitting || isSpinning
                    ? 'bg-gray-700 text-gray-400'
                    : totalSpins > 0
                      ? 'bg-gradient-to-r from-accent to-secondary text-black hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98]'
                      : 'bg-gray-700 text-gray-400'
                }`}
                style={totalSpins > 0 && !isSubmitting && !isSpinning ? { animation: 'pulse-glow 2s ease-in-out infinite' } : undefined}
              >
                {isSubmitting && !isSpinning ? (
                  <span className="flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin" /> Loading...
                  </span>
                ) : isSpinning ? (
                  <span className="flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin" /> Spinning...
                  </span>
                ) : totalSpins > 0 ? (
                  `🎯 SPIN (${totalSpins})`
                ) : (
                  '❌ No Spins'
                )}
              </button>

              {/* Auto-spin toggle */}
              <button
                onClick={toggleAutoSpin}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  autoSpin
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface text-text-secondary border border-border hover:border-accent/30'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${autoSpin ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                Auto-spin {autoSpin ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Tooltip with full details */}
        {hoveredSlot && !isSpinning && activeTab === 'wheel' && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - 210),
              top: Math.min(tooltipPos.y + 12, (typeof window !== 'undefined' ? window.innerHeight : 400) - 160)
            }}
          >
            <div
              className="rounded-xl p-3 shadow-2xl w-[200px] border backdrop-blur-md"
              style={{
                backgroundColor: `${hoveredSlot.color}30`,
                borderColor: `${hoveredSlot.color}60`,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-2.5 pb-2 border-b border-white/15">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: hoveredSlot.color, color: hoveredSlot.type === 'no_prize' ? '#fff' : '#000' }}
                >
                  #{hoveredSlot.index + 1}
                </div>
                <div>
                  <div className="font-black text-white text-xl leading-tight">{hoveredSlot.label}</div>
                  <div className="text-[10px] text-text-muted">{hoveredSlot.lockType}</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                {hoveredSlot.amount && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Token Amount</span>
                    <span className="text-white font-bold font-mono text-[11px]">{hoveredSlot.rawAmount.toLocaleString()} {hoveredSlot.tokenSymbol}</span>
                  </div>
                )}
                {hoveredSlot.valueUSD > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Est. Value</span>
                    <span className="text-accent font-bold">~${hoveredSlot.valueUSD < 1 ? hoveredSlot.valueUSD.toFixed(4) : hoveredSlot.valueUSD.toFixed(2)}</span>
                  </div>
                )}
                {hoveredSlot.tokenPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">{hoveredSlot.tokenSymbol} Price</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-mono text-[11px]">${hoveredSlot.tokenPrice < 0.01 ? hoveredSlot.tokenPrice.toFixed(6) : hoveredSlot.tokenPrice.toFixed(4)}</span>
                      {hoveredSlot.tokenChange24h !== 0 && (
                        <span className={`text-[10px] font-bold ${hoveredSlot.tokenChange24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {hoveredSlot.tokenChange24h > 0 ? '+' : ''}{hoveredSlot.tokenChange24h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-white/15">
                  {getTypeIcon(hoveredSlot.type, "w-3.5 h-3.5")}
                  <span className="text-text-secondary text-[11px]">{hoveredSlot.sublabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Spins */}
        {activeTab === 'spins' && (
          <div className="space-y-3">
            <div className="bg-surface rounded-xl border border-border p-3">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" /> Your Spins
              </h3>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-2.5 rounded-lg ${spins.free > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-background'}`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`w-4 h-4 ${spins.free > 0 ? 'text-green-400' : 'text-text-muted'}`} />
                    <div>
                      <span className={`text-sm ${spins.free > 0 ? 'text-green-300' : 'text-text-secondary'}`}>Free Spins</span>
                      <div className="text-[10px] text-text-muted">Earn via LP staking / swaps</div>
                    </div>
                  </div>
                  <span className={`font-bold ${spins.free > 0 ? 'text-green-300' : 'text-text-muted'}`}>{spins.free}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-background rounded-lg">
                  <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" /><span className="text-text-secondary text-sm">Purchased</span></div>
                  <span className="font-bold text-white">{spins.purchased}</span>
                </div>
                {spins.bonus > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-purple-300 text-sm">Bonus</span></div>
                    <span className="font-bold text-purple-300">{spins.bonus}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-text-muted text-sm">Total</span>
                  <span className="font-black text-accent text-2xl">{totalSpins}</span>
                </div>
              </div>
            </div>

            {/* Earn Free Spins CTA */}
            <button
              onClick={() => setShowPoolsModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-1.5">
                  <img src={TOKENS.SUI.logo} alt="SUI" className="w-7 h-7 rounded-full border border-background bg-background" />
                  <img src={TOKENS.VICTORY.logo} alt="VICTORY" className="w-7 h-7 rounded-full border border-background bg-background" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-green-300">Earn Free Spins</div>
                  <div className="text-[10px] text-text-muted">Stake LP or swap on SuiDex</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-green-400/50 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <p className="text-center text-text-muted text-xs">
              Buy more spins from the web app
            </p>

            {totalSpins > 0 && (
              <button onClick={() => setActiveTab('wheel')} className="w-full py-2.5 rounded-xl font-bold text-sm bg-accent text-black">
                🎯 Go Spin!
              </button>
            )}
          </div>
        )}

        {/* TAB: Prizes */}
        {activeTab === 'prizes' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400" /> Prizes
              </h3>
              <span className="text-[10px] text-text-muted">{slotCount} slots</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {wheelSlots.map((slot) => {
                const estUSD = slot.rawAmount > 0 && slot.tokenPrice > 0 ? slot.rawAmount * slot.tokenPrice : 0
                return (
                  <div
                    key={slot.index}
                    className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border hover:border-white/20 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: slot.color, color: slot.type === 'no_prize' ? '#fff' : '#000' }}
                    >
                      {slot.index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white text-sm">{slot.label}</span>
                        {getTypeIcon(slot.type, "w-3 h-3")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted truncate">{slot.lockType} {slot.tokenSymbol}</span>
                        {estUSD > 0 && (
                          <span className="text-[10px] text-accent font-semibold">~${estUSD < 1 ? estUSD.toFixed(4) : estUSD.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-3 mt-3 border-t border-border">
              <div className="flex items-center gap-1 text-[10px]"><Droplets className="w-3 h-3 text-yellow-400" /><span className="text-text-muted">Liquid</span></div>
              <div className="flex items-center gap-1 text-[10px]"><Lock className="w-3 h-3 text-blue-400" /><span className="text-text-muted">Locked</span></div>
              <div className="flex items-center gap-1 text-[10px]"><TrendingUp className="w-3 h-3 text-red-400" /><span className="text-text-muted">Trump</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeResultModal}>
          <div
            className={`w-full max-w-[300px] rounded-2xl overflow-hidden animate-modal-pop border ${result.type === 'no_prize' ? 'bg-surface border-border' : 'bg-gradient-to-b from-accent/10 to-surface border-accent/30'}`}
            style={{ boxShadow: result.type !== 'no_prize' ? `0 0 40px ${result.color}20` : undefined }}
            onClick={(e) => { e.stopPropagation(); pauseModal(); }}
          >
            {/* Countdown indicator */}
            {countdown !== null && !modalPaused && (
              <div className="h-1 bg-black/20">
                <div
                  className="h-full bg-accent transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / (result.type === 'no_prize' ? 3 : 5)) * 100}%` }}
                />
              </div>
            )}

            {result.type === 'no_prize' ? (
              <div className="p-5 text-center">
                <div className="text-4xl mb-2">😢</div>
                <h2 className="text-base font-bold text-white mb-0.5">No Prize</h2>
                <p className="text-text-muted text-xs mb-1">Better luck next time!</p>

                {/* Auto-close indicator */}
                {countdown !== null && !modalPaused && (
                  <p className="text-text-muted text-[10px] mb-3">
                    {autoSpin && totalSpins > 0 ? `Auto-spinning in ${countdown}s...` : `Closing in ${countdown}s...`}
                  </p>
                )}
                {modalPaused && <p className="text-accent text-[10px] mb-3">Paused</p>}

                <div className="flex gap-2">
                  <button onClick={closeResultModal} className="flex-1 py-2.5 bg-surface hover:bg-white/10 border border-border rounded-lg text-white font-medium text-sm transition-colors">
                    Close
                  </button>
                  {totalSpins > 0 && (
                    <button onClick={() => { closeResultModal(); handleSpin(); }} className="flex-1 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-black font-bold text-sm transition-colors">
                      Spin Again
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="text-3xl mb-1">🎉</div>
                <p className="text-accent font-medium text-[10px] mb-1 tracking-wider uppercase">Congratulations!</p>
                <div className="text-3xl font-black mb-1" style={{ color: result.color, textShadow: `0 0 20px ${result.color}40` }}>{result.amount}</div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
                  <span>{result.lockType}</span>
                  <span className="opacity-50">•</span>
                  <span>{result.tokenSymbol}</span>
                </div>
                {result.valueUSD > 0 ? (
                  <div className="text-white/70 text-sm font-semibold mt-2">Est. ~${result.valueUSD < 1 ? result.valueUSD.toFixed(4) : result.valueUSD.toFixed(2)}</div>
                ) : result.type !== 'no_prize' && result.rawAmount > 0 ? (
                  <div className="text-white/40 text-xs mt-2">Price loading...</div>
                ) : null}

                <div className="bg-black/30 rounded-lg p-2.5 mt-3 text-[10px]">
                  <div className="flex items-center justify-center gap-1 text-text-secondary">
                    <Clock className="w-3 h-3" /><span>Price may vary — distributed within <strong className="text-white">48h</strong></span>
                  </div>
                </div>

                {/* Auto-close indicator */}
                {countdown !== null && !modalPaused && (
                  <p className="text-text-muted text-[10px] mt-2">
                    {autoSpin && totalSpins > 0 ? `Auto-spinning in ${countdown}s...` : `Closing in ${countdown}s...`}
                  </p>
                )}
                {modalPaused && <p className="text-accent text-[10px] mt-2">Paused - tap to resume</p>}
                {countdown === null && !modalPaused && !autoSpin && (
                  <p className="text-text-muted text-[10px] mt-2">Tap anywhere to close</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button onClick={shareOnTwitter} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-lg text-white font-medium text-xs transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Share Win
                  </button>
                  <button onClick={closeResultModal} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium text-xs transition-colors">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border/50 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link href="/pwa/home" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/pwa/history" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link href="/pwa/search" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>
          <Link href="/pwa/settings" className="flex flex-col items-center gap-1 py-1 px-3 text-text-secondary hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </div>

      {/* Pools Modal */}
      <PoolsModal open={showPoolsModal} onClose={() => setShowPoolsModal(false)} />

      {/* Styles */}
      <style jsx global>{`
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .animate-confetti { animation: confetti-fall linear forwards; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        .animate-blink { animation: blink 0.08s ease-in-out infinite; }
        @keyframes modal-pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-modal-pop { animation: modal-pop 0.2s ease-out; }
      `}</style>
    </div>
  )
}
