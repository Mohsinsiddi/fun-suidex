'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { BuySpinsModal } from '@/components/wheel/BuySpinsModal'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfigStore, formatPrizeTableForWheel } from '@/lib/stores/configStore'
import { Gift, Coins, ShoppingCart, Trophy, Clock, Twitter, X, Sparkles, Zap, CircleDot, ListChecks, Lock, Droplets, TrendingUp, RefreshCw } from 'lucide-react'

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

export default function WheelPage() {
  const account = useCurrentAccount()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  // Use stores instead of local state
  const {
    isAuthenticated,
    freeSpins,
    purchasedSpins,
    bonusSpins,
    fetchUser,
    login,
    refreshSpins,
    setSpins
  } = useAuthStore()

  const {
    prizeTable,
    isLoaded: configLoaded,
    fetchConfig
  } = useConfigStore()

  const [activeTab, setActiveTab] = useState<TabType>('wheel')
  const [signingIn, setSigningIn] = useState(false)
  const [wheelSlots, setWheelSlots] = useState<WheelSlot[]>(DEFAULT_WHEEL_SLOTS)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSlot | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [hoveredSlot, setHoveredSlot] = useState<WheelSlot | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Derived from store
  const spins = { free: freeSpins, purchased: purchasedSpins, bonus: bonusSpins }
  const slotCount = wheelSlots.length
  const slotAngle = 360 / slotCount
  const totalSpins = freeSpins + purchasedSpins + bonusSpins

  const cx = 200, cy = 200
  const outerRadius = 175

  // Load config on mount
  useEffect(() => {
    if (!configLoaded) fetchConfig()
  }, [configLoaded, fetchConfig])

  // Update wheel slots when config loads
  useEffect(() => {
    if (prizeTable.length > 0) {
      setWheelSlots(formatPrizeTableForWheel(prizeTable))
    }
  }, [prizeTable])

  // Check auth when wallet connects - pass expected wallet for mismatch detection
  useEffect(() => {
    if (account?.address) {
      fetchUser(false, account.address)
    }
  }, [account?.address])

  const handleSignIn = async () => {
    if (!account?.address) { setError('Please connect your wallet first'); return }
    setSigningIn(true)
    setError(null)
    try {
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: account.address }) })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error || 'Failed to get nonce')

      signMessage({ message: new TextEncoder().encode(nonceData.data.nonce) }, {
        onSuccess: async (sig) => {
          try {
            const success = await login(account.address, sig.signature, nonceData.data.nonce)
            if (!success) throw new Error('Verification failed')
            // Fetch full user data after login
            await fetchUser()
          } catch (err: any) { setError(err.message) }
          setSigningIn(false)
        },
        onError: () => { setError('Signature rejected'); setSigningIn(false) },
      })
    } catch (err: any) { setError(err.message); setSigningIn(false) }
  }

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
    setHoveredSlot(null)
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
      const res = await fetch('/api/spin', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Spin failed'); return }
      // Update spins and stats directly from response (no extra API call)
      if (data.data.spins) {
        setSpins(data.data.spins, data.data.stats)
      }
      spinWheel(data.data.slotIndex)
    } catch (err: any) { setError(err.message || 'Network error') }
  }

  const handleBuySpinsSuccess = () => {
    // Refresh spins from store after purchase
    refreshSpins()
  }

  const handleRefreshSpins = async () => {
    setIsRefreshing(true)
    await refreshSpins()
    setIsRefreshing(false)
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

  // Arc path for lock type (outer)
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

  // Arc path for token symbol (below lock type)
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

  // Get position for radial text
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

  const shareOnTwitter = () => {
    if (!result || result.type === 'no_prize') return
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎉 I just won ${result.label} ${result.sublabel} on @SuiDex Wheel of Victory! 🎡\n\n${window.location.origin}/wheel`)}`, '_blank')
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

  // Dynamic font sizes
  const getFontSizes = () => {
    if (slotCount <= 8) return { value: 18, slot: 9, lockType: 7, token: 8 }
    if (slotCount <= 12) return { value: 14, slot: 8, lockType: 6, token: 7 }
    if (slotCount <= 16) return { value: 12, slot: 7, lockType: 5, token: 6 }
    return { value: 10, slot: 6, lockType: 4, token: 5 }
  }
  const fonts = getFontSizes()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 p-3 sm:p-4 py-4 sm:py-6">
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

        <div className="max-w-md mx-auto">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5 flex items-center justify-center gap-2">
              🎡 <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">Wheel of Victory</span>
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm">Spin to win amazing prizes!</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-surface rounded-xl p-1 mb-4 border border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
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
              {/* Enhanced Wheel */}
              <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px]">
                
                {/* Glow effect */}
                <div className="absolute inset-[-20px] rounded-full bg-gradient-to-r from-accent/10 via-purple-500/10 to-accent/10 blur-2xl" />
                
                {/* Pointer */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-30">
                  <svg width="32" height="44" viewBox="0 0 50 65" className="sm:w-[38px] sm:h-[52px] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
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
                    {/* Arc paths for curved text */}
                    {wheelSlots.map((_, i) => (
                      <g key={`arcs-${i}`}>
                        <path id={`lockArc${i}`} d={createLockTypeArcPath(i)} fill="none" />
                        <path id={`tokenArc${i}`} d={createTokenArcPath(i)} fill="none" />
                      </g>
                    ))}
                  </defs>
                  
                  {/* Outer ring */}
                  <circle cx={cx} cy={cy} r="195" fill="#0a1a0a" stroke="#00e5ff" strokeWidth="3" />
                  <circle cx={cx} cy={cy} r="188" fill="none" stroke="rgba(0,229,255,0.2)" strokeWidth="1" />
                  
                  {/* Wheel Slices */}
                  {wheelSlots.map((slot, i) => {
                    const valuePos = getTextPosition(i, 0.52)  // CENTER - $ value
                    const slotNumPos = getTextPosition(i, 0.30) // INNER - slot number
                    const isDark = slot.type === 'no_prize'
                    const textColor = isDark ? '#ffffff' : '#000000'
                    const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                    
                    return (
                      <g 
                        key={i} 
                        onMouseMove={(e) => handleSliceHover(e, slot)} 
                        onMouseLeave={() => setHoveredSlot(null)} 
                        style={{ cursor: isSpinning ? 'default' : 'pointer' }}
                      >
                        {/* Slice */}
                        <path d={createSlicePath(i)} fill={slot.color} stroke="#0a0f0a" strokeWidth="1.5" />
                        
                        {/* OUTER CURVED: Lock Type */}
                        <text fontSize={fonts.lockType} fontWeight="700" fill={subTextColor}>
                          <textPath href={`#lockArc${i}`} startOffset="50%" textAnchor="middle">
                            {slot.lockType}
                          </textPath>
                        </text>
                        
                        {/* OUTER CURVED (below): Token Symbol */}
                        {slot.tokenSymbol && (
                          <text fontSize={fonts.token} fontWeight="800" fill={textColor}>
                            <textPath href={`#tokenArc${i}`} startOffset="50%" textAnchor="middle">
                              {slot.tokenSymbol}
                            </textPath>
                          </text>
                        )}
                        
                        {/* CENTER: Dollar Value - BOLD */}
                        <text
                          x={valuePos.x}
                          y={valuePos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={textColor}
                          fontSize={fonts.value}
                          fontWeight="900"
                          transform={`rotate(${valuePos.rotation}, ${valuePos.x}, ${valuePos.y})`}
                        >
                          {slot.label}
                        </text>
                        
                        {/* INNER: Slot Number */}
                        <text
                          x={slotNumPos.x}
                          y={slotNumPos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={subTextColor}
                          fontSize={fonts.slot}
                          fontWeight="600"
                          transform={`rotate(${slotNumPos.rotation}, ${slotNumPos.x}, ${slotNumPos.y})`}
                        >
                          #{i + 1}
                        </text>
                      </g>
                    )
                  })}
                  
                  {/* Center hub */}
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
                      className={`absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full z-20 ${isSpinning ? 'animate-blink' : ''}`}
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
              <div className="mt-5 w-full max-w-[300px] sm:max-w-[350px]">
                {!account ? (
                  <div className="text-center p-4 bg-surface/60 rounded-xl border border-border">
                    <p className="text-text-secondary text-sm">👛 Connect wallet to play</p>
                  </div>
                ) : !isAuthenticated ? (
                  <button onClick={handleSignIn} disabled={signingIn || isSigning} className="w-full py-3 rounded-xl font-bold text-sm bg-accent hover:bg-accent-hover text-black transition-all disabled:opacity-50">
                    {signingIn || isSigning ? '⏳ Signing...' : '✍️ Sign to Play'}
                  </button>
                ) : (
                  <button 
                    onClick={handleSpin} 
                    disabled={isSpinning || totalSpins <= 0} 
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                      isSpinning 
                        ? 'bg-gray-700 text-gray-400' 
                        : totalSpins > 0 
                          ? 'bg-gradient-to-r from-accent to-secondary text-black hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]' 
                          : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isSpinning ? '🎰 Spinning...' : totalSpins > 0 ? `🎯 SPIN (${totalSpins})` : '❌ No Spins'}
                  </button>
                )}

                {isAuthenticated && totalSpins === 0 && (
                  <button onClick={() => setActiveTab('spins')} className="mt-2 w-full text-xs text-accent hover:underline">
                    Get more spins →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: Spins */}
          {activeTab === 'spins' && (
            <div className="space-y-3">
              {!isAuthenticated ? (
                <div className="text-center p-6 bg-surface rounded-xl border border-border">
                  <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-white font-medium text-sm mb-1">Sign in to view spins</p>
                  <p className="text-text-secondary text-xs">Connect wallet first</p>
                </div>
              ) : (
                <>
                  <div className="bg-surface rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" /> Your Spins
                      </h3>
                      <button
                        onClick={handleRefreshSpins}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-lg bg-background hover:bg-white/10 text-text-secondary hover:text-accent transition-all disabled:opacity-50"
                        title="Refresh spins"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
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

                  <button onClick={() => setShowBuyModal(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/30 text-yellow-400 hover:border-yellow-500/50 transition-all">
                    <ShoppingCart className="w-4 h-4" /> Buy More Spins <Zap className="w-4 h-4 text-orange-400" />
                  </button>

                  {totalSpins > 0 && (
                    <button onClick={() => setActiveTab('wheel')} className="w-full py-2.5 rounded-xl font-bold text-sm bg-accent text-black hover:bg-accent-hover transition-all">
                      🎯 Go Spin!
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB: Prizes - Compact */}
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

        {/* Tooltip with full details */}
        {hoveredSlot && !isSpinning && activeTab === 'wheel' && (
          <div 
            className="fixed z-50 pointer-events-none" 
            style={{ 
              left: Math.min(tooltipPos.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - 190), 
              top: Math.min(tooltipPos.y + 12, (typeof window !== 'undefined' ? window.innerHeight : 400) - 160) 
            }}
          >
            <div 
              className="rounded-xl p-3 shadow-2xl w-[180px] border backdrop-blur-sm"
              style={{ 
                backgroundColor: `${hoveredSlot.color}18`,
                borderColor: `${hoveredSlot.color}50`,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-2.5 pb-2 border-b border-white/10">
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
                <div className="flex justify-between">
                  <span className="text-text-muted">Token</span>
                  <span className="text-white font-bold">{hoveredSlot.tokenSymbol || '—'}</span>
                </div>
                {hoveredSlot.amount && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Amount</span>
                    <span className="text-white font-mono text-[11px]">{hoveredSlot.amount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">USD Value</span>
                  <span className="text-accent font-bold">${hoveredSlot.valueUSD.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-white/10">
                  {getTypeIcon(hoveredSlot.type, "w-3.5 h-3.5")}
                  <span className="text-text-secondary text-[11px]">{hoveredSlot.sublabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buy Modal */}
        <BuySpinsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} onSuccess={handleBuySpinsSuccess} />

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

        {/* Styles */}
        <style jsx global>{`
          @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
          .animate-confetti { animation: confetti-fall linear forwards; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
          .animate-blink { animation: blink 0.08s ease-in-out infinite; }
          @keyframes modal-pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-modal-pop { animation: modal-pop 0.2s ease-out; }
        `}</style>
      </main>
      
      <Footer />
    </div>
  )
}

// Helper functions
function formatLabel(v: number): string { 
  if (v === 0) return 'NONE'
  if (v >= 1000) { const k = v / 1000; return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K` } 
  return `$${v}` 
}

function formatSublabel(type: string, lock?: string): string { 
  if (type === 'no_prize') return 'No Prize'
  if (type === 'suitrump') return 'Trump'
  if (type === 'liquid_victory') return 'Liquid'
  if (lock === '1_week') return '1W Lock'
  if (lock === '3_month') return '3M Lock'
  if (lock === '1_year') return '1Y Lock'
  if (lock === '3_year') return '3Y Lock'
  return 'Locked' 
}

function formatAmount(amt: number, type: string): string { 
  if (type === 'no_prize') return ''
  if (type === 'suitrump') return `$${amt.toLocaleString()}`
  if (amt >= 1000000) return `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}M VICT`
  if (amt >= 1000) return `${Math.round(amt / 1000).toLocaleString()}K VICT`
  return `${amt.toLocaleString()} VICT` 
}

function getSlotColor(type: string, val: number, idx: number): string { 
  if (type === 'no_prize') return '#546E7A'
  if (type === 'suitrump') return ['#EF5350', '#F44336', '#E53935', '#D32F2F'][idx % 4]
  if (type === 'liquid_victory') return ['#FFD700', '#FFC107', '#FFA500', '#FF8C00'][Math.min(Math.floor(val / 200), 3)]
  return ['#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#01579B', '#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC'][idx % 11] 
}

function getLockType(type: string, lock?: string): string {
  if (type === 'no_prize') return 'NONE'
  if (type === 'suitrump') return 'MEME'
  if (type === 'liquid_victory') return 'LIQUID'
  if (lock === '1_week') return '1W LOCK'
  if (lock === '3_month') return '3M LOCK'
  if (lock === '1_year') return '1Y LOCK'
  if (lock === '3_year') return '3Y LOCK'
  return 'LOCKED'
}

function getTokenSymbol(type: string): string {
  if (type === 'no_prize') return ''
  if (type === 'suitrump') return 'TRUMP'
  return 'VICT'
}