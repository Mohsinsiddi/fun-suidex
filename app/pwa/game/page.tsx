'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePWAAuthStore, pwaFetch } from '@/lib/stores/pwaAuthStore'
import { useConfigStore, formatPrizeTableForWheel } from '@/lib/stores/configStore'
import { Gift, Coins, ShoppingCart, Trophy, Clock, Twitter, X, Sparkles, Zap, CircleDot, ListChecks, Lock, Droplets, TrendingUp, Settings, History, Search, Home } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_WHEEL_SLOTS = [
  { index: 0, label: "$5", sublabel: "Liquid", color: "#FFD700", amount: "1,667 VICT", type: "liquid_victory", valueUSD: 5, lockType: "LIQUID", tokenSymbol: "VICT" },
  { index: 1, label: "$50", sublabel: "Liquid", color: "#FFA500", amount: "16,667 VICT", type: "liquid_victory", valueUSD: 50, lockType: "LIQUID", tokenSymbol: "VICT" },
  { index: 2, label: "$1K", sublabel: "Liquid", color: "#FF8C00", amount: "333,333 VICT", type: "liquid_victory", valueUSD: 1000, lockType: "LIQUID", tokenSymbol: "VICT" },
  { index: 3, label: "$5", sublabel: "1W Lock", color: "#4FC3F7", amount: "1,667 VICT", type: "locked_victory", valueUSD: 5, lockType: "1W LOCK", tokenSymbol: "VICT" },
  { index: 4, label: "$20", sublabel: "1W Lock", color: "#29B6F6", amount: "6,667 VICT", type: "locked_victory", valueUSD: 20, lockType: "1W LOCK", tokenSymbol: "VICT" },
  { index: 5, label: "$25", sublabel: "3M Lock", color: "#03A9F4", amount: "8,333 VICT", type: "locked_victory", valueUSD: 25, lockType: "3M LOCK", tokenSymbol: "VICT" },
  { index: 6, label: "$50", sublabel: "3M Lock", color: "#039BE5", amount: "16,667 VICT", type: "locked_victory", valueUSD: 50, lockType: "3M LOCK", tokenSymbol: "VICT" },
  { index: 7, label: "$100", sublabel: "1Y Lock", color: "#0288D1", amount: "33,333 VICT", type: "locked_victory", valueUSD: 100, lockType: "1Y LOCK", tokenSymbol: "VICT" },
  { index: 8, label: "$250", sublabel: "1Y Lock", color: "#0277BD", amount: "83,333 VICT", type: "locked_victory", valueUSD: 250, lockType: "1Y LOCK", tokenSymbol: "VICT" },
  { index: 9, label: "$500", sublabel: "3Y Lock", color: "#7B1FA2", amount: "166,667 VICT", type: "locked_victory", valueUSD: 500, lockType: "3Y LOCK", tokenSymbol: "VICT" },
  { index: 10, label: "$2K", sublabel: "3Y Lock", color: "#8E24AA", amount: "666,666 VICT", type: "locked_victory", valueUSD: 2000, lockType: "3Y LOCK", tokenSymbol: "VICT" },
  { index: 11, label: "$3.5K", sublabel: "3Y Lock", color: "#9C27B0", amount: "1M VICT", type: "locked_victory", valueUSD: 3500, lockType: "3Y LOCK", tokenSymbol: "VICT" },
  { index: 12, label: "$10", sublabel: "Trump", color: "#EF5350", amount: "$10", type: "suitrump", valueUSD: 10, lockType: "MEME", tokenSymbol: "TRUMP" },
  { index: 13, label: "$50", sublabel: "Trump", color: "#F44336", amount: "$50", type: "suitrump", valueUSD: 50, lockType: "MEME", tokenSymbol: "TRUMP" },
  { index: 14, label: "$500", sublabel: "Trump", color: "#E53935", amount: "$500", type: "suitrump", valueUSD: 500, lockType: "MEME", tokenSymbol: "TRUMP" },
  { index: 15, label: "NONE", sublabel: "No Prize", color: "#546E7A", amount: "", type: "no_prize", valueUSD: 0, lockType: "NONE", tokenSymbol: "" },
]

interface WheelSlot {
  index: number
  label: string
  sublabel: string
  color: string
  amount: string
  type: string
  valueUSD: number
  lockType: string
  tokenSymbol: string
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
    setSpins,
  } = usePWAAuthStore()

  const {
    prizeTable,
    isLoaded: configLoaded,
    fetchConfig
  } = useConfigStore()

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('wheel')
  const [wheelSlots, setWheelSlots] = useState<WheelSlot[]>(DEFAULT_WHEEL_SLOTS)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSlot | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setWheelSlots(formatPrizeTableForWheel(prizeTable))
    }
  }, [prizeTable])

  const calculateRotationForSlot = (slotIndex: number): number => {
    const slotCenterAngle = slotIndex * slotAngle + (slotAngle / 2)
    return 360 - slotCenterAngle
  }

  const spinWheel = async (slotToLandOn: number) => {
    if (isSpinning || slotToLandOn < 0 || slotToLandOn >= slotCount) return
    setIsSpinning(true)
    setResult(null)
    setShowConfetti(false)
    setError(null)
    setActiveTab('wheel')

    const currentNormalized = ((rotation % 360) + 360) % 360
    const targetAngle = calculateRotationForSlot(slotToLandOn)
    let deltaRotation = targetAngle - currentNormalized
    if (deltaRotation <= 0) deltaRotation += 360
    const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360
    setRotation(rotation + fullRotations + deltaRotation)

    setTimeout(() => {
      setIsSpinning(false)
      const winningSlot = wheelSlots[slotToLandOn]
      setResult(winningSlot)
      if (winningSlot.type !== 'no_prize') {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    }, 5000)
  }

  const handleSpin = async () => {
    if (totalSpins <= 0) { setError('No spins available!'); return }
    try {
      const res = await pwaFetch('/api/spin', { method: 'POST' })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Spin failed'); return }
      // Update spins from response
      if (data.data.spins) {
        setSpins(data.data.spins, data.data.stats)
      }
      spinWheel(data.data.slotIndex)
    } catch (err: any) { setError(err.message || 'Network error') }
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

  const shareOnTwitter = () => {
    if (!result || result.type === 'no_prize') return
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just won ${result.label} ${result.sublabel} on @SuiDex Wheel of Victory! #SuiDex #PWA`)}`, '_blank')
  }

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
          {[...Array(80)].map((_, i) => (
            <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, top: -20, animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s` }}>
              <div style={{ width: 6 + Math.random() * 6, height: 6 + Math.random() * 6, backgroundColor: ['#00ff88', '#FFD700', '#00ffff', '#a855f7', '#34D399'][Math.floor(Math.random() * 5)], transform: `rotate(${Math.random() * 360}deg)`, borderRadius: Math.random() > 0.5 ? '50%' : '0' }} />
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
                style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
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
                    <g key={i}>
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

                <circle cx={cx} cy={cy} r="38" fill="#0a1a0a" stroke="#00e5ff" strokeWidth="3" />
                <circle cx={cx} cy={cy} r="30" fill="#0f1a2a" />
                <circle cx={cx} cy={cy} r="22" fill="#0a1a0a" stroke="rgba(0,229,255,0.3)" strokeWidth="1" />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="18">🎰</text>
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
            <div className="mt-5 w-full max-w-[280px]">
              <button
                onClick={handleSpin}
                disabled={isSpinning || totalSpins <= 0}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                  isSpinning
                    ? 'bg-gray-700 text-gray-400'
                    : totalSpins > 0
                      ? 'bg-gradient-to-r from-accent to-secondary text-black hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98]'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isSpinning ? '🎰 Spinning...' : totalSpins > 0 ? `🎯 SPIN (${totalSpins})` : '❌ No Spins'}
              </button>
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
                <div className="flex items-center justify-between p-2.5 bg-background rounded-lg">
                  <div className="flex items-center gap-2"><Gift className="w-4 h-4 text-accent" /><span className="text-text-secondary text-sm">Free</span></div>
                  <span className="font-bold text-white">{spins.free}</span>
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
              {wheelSlots.map((slot) => (
                <div
                  key={slot.index}
                  className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border"
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
                    <div className="text-[10px] text-text-muted truncate">{slot.lockType} {slot.tokenSymbol}</div>
                  </div>
                </div>
              ))}
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setResult(null)}>
          <div
            className={`w-full max-w-[280px] rounded-2xl overflow-hidden animate-modal-pop ${result.type === 'no_prize' ? 'bg-gray-800' : 'bg-gradient-to-b from-yellow-900/95 to-amber-950'}`}
            style={{ boxShadow: result.type !== 'no_prize' ? `0 0 40px ${result.color}25` : undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {result.type === 'no_prize' ? (
              <div className="p-5 text-center">
                <div className="text-4xl mb-2">😢</div>
                <h2 className="text-base font-bold text-gray-200 mb-0.5">No Prize</h2>
                <p className="text-gray-500 text-xs mb-4">Better luck next time!</p>
                <div className="flex gap-2">
                  <button onClick={() => setResult(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium text-sm">Close</button>
                  {totalSpins > 0 && <button onClick={() => { setResult(null); handleSpin(); }} className="flex-1 py-2 bg-accent rounded-lg text-black font-bold text-sm">Spin Again</button>}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="text-3xl mb-1">🎉</div>
                <p className="text-yellow-300 font-medium text-[10px] mb-1 tracking-wide">CONGRATULATIONS!</p>
                <div className="text-4xl font-black mb-0.5" style={{ color: result.color, textShadow: `0 0 20px ${result.color}40` }}>{result.label}</div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${result.color}20`, color: result.color }}>
                  <span>{result.lockType}</span>
                  <span>•</span>
                  <span>{result.tokenSymbol}</span>
                </div>
                {result.amount && <div className="text-yellow-200 font-mono text-sm mt-2">{result.amount}</div>}

                <div className="bg-black/30 rounded-lg p-2.5 mt-3 text-[11px]">
                  <div className="flex justify-between mb-1"><span className="text-gray-400">Slot</span><span className="text-white">#{result.index + 1}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Value</span><span className="text-yellow-400 font-bold">${result.valueUSD.toLocaleString()}</span></div>
                  <div className="flex items-center justify-center gap-1 text-yellow-300 mt-2 pt-2 border-t border-white/10 text-[10px]">
                    <Clock className="w-3 h-3" /><span>Within <strong>48h</strong></span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={shareOnTwitter} className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#1DA1F2] rounded-lg text-white font-medium text-xs"><Twitter className="w-3.5 h-3.5" />Share</button>
                  <button onClick={() => setResult(null)} className="flex-1 py-2 bg-white/10 rounded-lg text-white font-medium text-xs">Close</button>
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
