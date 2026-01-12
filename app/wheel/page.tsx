'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount, useSignPersonalMessage, useConnectWallet, useWallets } from '@mysten/dapp-kit'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'
import { Wallet, Gift, Coins, Users, Copy, Check, X } from 'lucide-react'

// Default slots matching reference design
const DEFAULT_WHEEL_SLOTS = [
  { index: 0, label: "$5", sublabel: "Liquid", color: "#FFD700", amount: "1,667 VICT", type: "liquid_victory", valueUSD: 5 },
  { index: 1, label: "$50", sublabel: "Liquid", color: "#FFA500", amount: "16,667 VICT", type: "liquid_victory", valueUSD: 50 },
  { index: 2, label: "$1K", sublabel: "Liquid", color: "#FF8C00", amount: "333,333 VICT", type: "liquid_victory", valueUSD: 1000 },
  { index: 3, label: "$5", sublabel: "1W Lock", color: "#4FC3F7", amount: "1,667 VICT", type: "locked_victory", valueUSD: 5 },
  { index: 4, label: "$20", sublabel: "1W Lock", color: "#29B6F6", amount: "6,667 VICT", type: "locked_victory", valueUSD: 20 },
  { index: 5, label: "$25", sublabel: "3M Lock", color: "#03A9F4", amount: "8,333 VICT", type: "locked_victory", valueUSD: 25 },
  { index: 6, label: "$50", sublabel: "3M Lock", color: "#039BE5", amount: "16,667 VICT", type: "locked_victory", valueUSD: 50 },
  { index: 7, label: "$100", sublabel: "1Y Lock", color: "#0288D1", amount: "33,333 VICT", type: "locked_victory", valueUSD: 100 },
  { index: 8, label: "$250", sublabel: "1Y Lock", color: "#0277BD", amount: "83,333 VICT", type: "locked_victory", valueUSD: 250 },
  { index: 9, label: "$500", sublabel: "3Y Lock", color: "#7B1FA2", amount: "166,667 VICT", type: "locked_victory", valueUSD: 500 },
  { index: 10, label: "$2K", sublabel: "3Y Lock", color: "#8E24AA", amount: "666,666 VICT", type: "locked_victory", valueUSD: 2000 },
  { index: 11, label: "$3.5K", sublabel: "3Y Lock", color: "#9C27B0", amount: "1M VICT", type: "locked_victory", valueUSD: 3500 },
  { index: 12, label: "$10", sublabel: "Trump", color: "#EF5350", amount: "$10", type: "suitrump", valueUSD: 10 },
  { index: 13, label: "$50", sublabel: "Trump", color: "#F44336", amount: "$50", type: "suitrump", valueUSD: 50 },
  { index: 14, label: "$500", sublabel: "Trump", color: "#E53935", amount: "$500", type: "suitrump", valueUSD: 500 },
  { index: 15, label: "NONE", sublabel: "No Prize", color: "#546E7A", amount: "", type: "no_prize", valueUSD: 0 },
]

const TOTAL_SLOTS = 16
const SLOT_ANGLE = 360 / TOTAL_SLOTS

interface WheelSlot {
  index: number
  label: string
  sublabel: string
  color: string
  amount: string
  type: string
  valueUSD: number
}

export default function WheelPage() {
  const account = useCurrentAccount()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const { mutate: signMessage, isPending: isSigning } = useSignPersonalMessage()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [wheelSlots, setWheelSlots] = useState<WheelSlot[]>(DEFAULT_WHEEL_SLOTS)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [spins, setSpins] = useState({ free: 0, purchased: 0, bonus: 0 })
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<WheelSlot | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadConfig() }, [])
  useEffect(() => {
    if (account?.address) checkAuth()
    else setIsAuthenticated(false)
  }, [account?.address])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      if (data.success && data.data?.prizeTable?.length === 16) {
        const slots = data.data.prizeTable.map((p: any, i: number) => ({
          index: i,
          label: formatLabel(p.valueUSD),
          sublabel: formatSublabel(p.type, p.lockDuration),
          color: getSlotColor(p.type, p.valueUSD, i),
          amount: formatAmount(p.amount, p.type),
          type: p.type,
          valueUSD: p.valueUSD,
        }))
        setWheelSlots(slots)
      }
    } catch (err) { console.error('Failed to load config:', err) }
  }

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setIsAuthenticated(true)
        setSpins({ free: data.data.freeSpins || 0, purchased: data.data.purchasedSpins || 0, bonus: data.data.bonusSpins || 0 })
        setReferralCode(data.data.referralCode || null)
      }
    } catch { setIsAuthenticated(false) }
  }

  const handleWalletConnect = (wallet: any) => {
    connect({ wallet })
    setShowWalletModal(false)
  }

  // Sort wallets - Slush and Nightly first
  const sortedWallets = [...wallets].sort((a, b) => {
    const priority = ['Slush', 'Nightly', 'Sui Wallet', 'Suiet']
    const aIndex = priority.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()))
    const bIndex = priority.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()))
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const handleSignIn = async () => {
    if (!account?.address) return
    setAuthLoading(true)
    setError(null)
    try {
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: account.address }) })
      const nonceData = await nonceRes.json()
      if (!nonceData.success) throw new Error(nonceData.error)
      signMessage({ message: new TextEncoder().encode(nonceData.data.nonce) }, {
        onSuccess: async (sig) => {
          try {
            const verifyRes = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: account.address, signature: sig.signature, nonce: nonceData.data.nonce }) })
            const verifyData = await verifyRes.json()
            if (!verifyData.success) throw new Error(verifyData.error)
            setIsAuthenticated(true)
            setSpins({ free: verifyData.data.freeSpins || 0, purchased: verifyData.data.purchasedSpins || 0, bonus: verifyData.data.bonusSpins || 0 })
            setReferralCode(verifyData.data.referralCode || null)
          } catch (err: any) { setError(err.message) }
          setAuthLoading(false)
        },
        onError: () => { setError('Signature rejected'); setAuthLoading(false) },
      })
    } catch (err: any) { setError(err.message); setAuthLoading(false) }
  }

  const calculateRotationForSlot = (slotIndex: number) => {
    const slotCenterAngle = slotIndex * SLOT_ANGLE + (SLOT_ANGLE / 2)
    return 360 - slotCenterAngle
  }

  const spinWheel = async (slotToLandOn: number) => {
    if (isSpinning) return
    setIsSpinning(true)
    setResult(null)
    setShowConfetti(false)
    setError(null)

    const currentNormalized = ((rotation % 360) + 360) % 360
    const targetAngle = calculateRotationForSlot(slotToLandOn)
    let deltaRotation = targetAngle - currentNormalized
    if (deltaRotation <= 0) deltaRotation += 360
    const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360
    setRotation(rotation + fullRotations + deltaRotation)

    setTimeout(() => {
      setIsSpinning(false)
      setResult(wheelSlots[slotToLandOn])
      if (slotToLandOn !== 15) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)
      }
    }, 5000)
  }

  const handleSpin = async () => {
    const totalSpins = spins.free + spins.purchased + spins.bonus
    if (totalSpins <= 0) { setError('No spins available!'); return }
    try {
      const res = await fetch('/api/spin', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Spin failed'); return }
      setSpins(prev => {
        if (prev.bonus > 0) return { ...prev, bonus: prev.bonus - 1 }
        if (prev.free > 0) return { ...prev, free: prev.free - 1 }
        return { ...prev, purchased: prev.purchased - 1 }
      })
      spinWheel(data.data.slotIndex)
    } catch (err: any) { setError(err.message || 'Spin failed') }
  }

  const copyReferralLink = () => {
    if (!referralCode) return
    navigator.clipboard.writeText(`${window.location.origin}/wheel?ref=${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const createSlicePath = (index: number) => {
    const startAngle = (index * SLOT_ANGLE - 90) * (Math.PI / 180)
    const endAngle = ((index + 1) * SLOT_ANGLE - 90) * (Math.PI / 180)
    const radius = 180, cx = 200, cy = 200
    const x1 = cx + radius * Math.cos(startAngle), y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle), y2 = cy + radius * Math.sin(endAngle)
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
  }

  const getTextTransform = (index: number) => {
    const angle = (index * SLOT_ANGLE + SLOT_ANGLE / 2 - 90)
    const rad = angle * (Math.PI / 180), radius = 130
    return { x: 200 + radius * Math.cos(rad), y: 200 + radius * Math.sin(rad), angle: angle + 90 }
  }

  const totalSpins = spins.free + spins.purchased + spins.bonus

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-8">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(100)].map((_, i) => (
              <div key={i} className="absolute animate-confetti" style={{ left: `${Math.random() * 100}%`, top: -20, animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s` }}>
                <div style={{ width: 8 + Math.random() * 8, height: 8 + Math.random() * 8, backgroundColor: ['#00ff88', '#FFD700', '#00ffff', '#a855f7', '#34D399'][Math.floor(Math.random() * 5)], transform: `rotate(${Math.random() * 360}deg)` }} />
              </div>
            ))}
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
          🎡 <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">Wheel of Victory</span>
        </h1>
        <p className="text-text-secondary mb-6">Spin to win amazing prizes!</p>

        {isAuthenticated && (
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-xl border border-border">
              <Gift className="w-4 h-4 text-accent" /><span className="text-sm text-text-secondary">Free:</span><span className="font-bold text-white">{spins.free}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-xl border border-border">
              <Coins className="w-4 h-4 text-yellow-400" /><span className="text-sm text-text-secondary">Purchased:</span><span className="font-bold text-white">{spins.purchased}</span>
            </div>
            {spins.bonus > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-xl border border-border">
                <Gift className="w-4 h-4 text-purple-400" /><span className="text-sm text-text-secondary">Bonus:</span><span className="font-bold text-white">{spins.bonus}</span>
              </div>
            )}
          </div>
        )}

        {error && <div className="mb-4 px-4 py-2 bg-error/10 border border-error/30 rounded-lg text-error text-sm">{error}</div>}

        <div className="relative" style={{ width: 420, height: 420 }}>
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-30">
            <svg width="50" height="60" viewBox="0 0 50 60">
              <defs>
                <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#00ff88" /><stop offset="100%" stopColor="#00aa55" /></linearGradient>
                <filter id="pointerGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <polygon points="25,55 8,12 25,22 42,12" fill="url(#pointerGrad)" filter="url(#pointerGlow)" stroke="#00ff88" strokeWidth="2" />
              <circle cx="25" cy="15" r="6" fill="#0a0f0a" stroke="#00ff88" strokeWidth="2" />
            </svg>
          </div>

          <svg width="400" height="400" viewBox="0 0 400 400" className="absolute left-[10px] top-[10px]" style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
            <circle cx="200" cy="200" r="195" fill="#0a1a0a" stroke="#00ff88" strokeWidth="4" />
            {wheelSlots.map((slot, i) => {
              const textPos = getTextTransform(i)
              return (
                <g key={i}>
                  <path d={createSlicePath(i)} fill={slot.color} stroke="#0a1a0a" strokeWidth="2" />
                  <text x={textPos.x} y={textPos.y - 8} textAnchor="middle" dominantBaseline="middle" fill={slot.type === 'no_prize' ? '#fff' : '#000'} fontSize="14" fontWeight="bold" transform={`rotate(${textPos.angle}, ${textPos.x}, ${textPos.y - 8})`}>{slot.label}</text>
                  <text x={textPos.x} y={textPos.y + 8} textAnchor="middle" dominantBaseline="middle" fill={slot.type === 'no_prize' ? '#ccc' : 'rgba(0,0,0,0.7)'} fontSize="9" fontWeight="600" transform={`rotate(${textPos.angle}, ${textPos.x}, ${textPos.y + 8})`}>{slot.sublabel}</text>
                </g>
              )
            })}
            <circle cx="200" cy="200" r="42" fill="#0a1a0a" stroke="#00ff88" strokeWidth="5" />
            <circle cx="200" cy="200" r="32" fill="#0f2a0f" />
            <text x="200" y="200" textAnchor="middle" dominantBaseline="middle" fontSize="30">🎰</text>
          </svg>

          {[...Array(24)].map((_, i) => {
            const angle = (i * 15 - 90) * (Math.PI / 180)
            return <div key={i} className={`absolute w-2.5 h-2.5 rounded-full z-20 ${isSpinning ? 'animate-blink' : ''}`} style={{ left: 210 + 205 * Math.cos(angle) - 5, top: 210 + 205 * Math.sin(angle) - 5, backgroundColor: '#00ff88', boxShadow: '0 0 8px rgba(0,255,136,0.8)', animationDelay: `${i * 0.05}s` }} />
          })}
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          {!account ? (
            <button onClick={() => setShowWalletModal(true)} className="px-10 py-4 rounded-xl font-bold text-lg bg-accent hover:bg-accent-hover text-black transition-all hover:scale-105"><Wallet className="w-5 h-5 inline mr-2" />Connect to Spin</button>
          ) : !isAuthenticated ? (
            <button onClick={handleSignIn} disabled={authLoading || isSigning} className="px-10 py-4 rounded-xl font-bold text-lg bg-accent hover:bg-accent-hover text-black transition-all disabled:opacity-50">{authLoading || isSigning ? '✍️ Signing...' : '✍️ Sign to Play'}</button>
          ) : (
            <button onClick={handleSpin} disabled={isSpinning || totalSpins <= 0} className={`px-12 py-4 rounded-xl font-bold text-xl transition-all ${isSpinning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : totalSpins > 0 ? 'bg-gradient-to-r from-accent to-secondary text-black hover:scale-105 hover:shadow-lg hover:shadow-accent/40' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>{isSpinning ? '🎰 Spinning...' : totalSpins > 0 ? `🎯 SPIN (${totalSpins})` : '❌ No Spins'}</button>
          )}
        </div>

        {isAuthenticated && referralCode && (
          <div className="mt-8 p-4 bg-surface rounded-xl border border-border max-w-md w-full">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-accent" /><span className="font-medium text-white">Your Referral Link</span></div>
            <div className="flex gap-2">
              <input type="text" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/wheel?ref=${referralCode}`} className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-text-secondary" />
              <button onClick={copyReferralLink} className="px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            <p className="text-xs text-text-muted mt-2">Earn 10% of all prizes won by your referrals!</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFD700' }} /><span className="text-text-secondary">Liquid</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#0288D1' }} /><span className="text-text-secondary">Locked</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#9C27B0' }} /><span className="text-text-secondary">3Y Lock</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#F44336' }} /><span className="text-text-secondary">Trump</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#546E7A' }} /><span className="text-text-secondary">No Prize</span></div>
        </div>

        {/* Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowWalletModal(false)}>
            <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
                <button onClick={() => setShowWalletModal(false)} className="text-text-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {sortedWallets.length > 0 ? (
                <div className="space-y-2">
                  {sortedWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleWalletConnect(wallet)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-accent/10 border border-border hover:border-accent/30 rounded-xl transition-colors"
                    >
                      {wallet.icon && (
                        <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                      )}
                      <span className="font-medium text-white">{wallet.name}</span>
                      {(wallet.name.toLowerCase().includes('slush') || wallet.name.toLowerCase().includes('nightly')) && (
                        <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">Recommended</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">No wallets detected</p>
                  <div className="space-y-2">
                    <a
                      href="https://slush.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-3 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl text-accent font-medium"
                    >
                      Install Slush Wallet
                    </a>
                    <a
                      href="https://nightly.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-medium"
                    >
                      Install Nightly Wallet
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setResult(null)}>
            <div className={`max-w-sm w-full p-6 rounded-2xl text-center animate-modal-pop ${result.type === 'no_prize' ? 'bg-surface border-2 border-border' : 'bg-gradient-to-br from-amber-900/90 to-yellow-900/90 border-2 border-yellow-400'}`} onClick={(e) => e.stopPropagation()}>
              {result.type === 'no_prize' ? (
                <><div className="text-5xl mb-3">😢</div><h2 className="text-xl font-bold text-text-secondary">No Prize</h2><p className="text-text-muted mt-1">Better luck next time!</p></>
              ) : (
                <><div className="text-5xl mb-3">🎉</div><p className="text-yellow-400 font-medium mb-2">CONGRATULATIONS!</p><h2 className="text-4xl font-extrabold" style={{ color: result.color }}>{result.label}</h2><p className="text-lg text-gray-300 mt-1">{result.sublabel}</p>{result.amount && <p className="text-yellow-300 text-sm mt-1">({result.amount})</p>}<div className="mt-4 p-3 bg-black/30 rounded-xl text-sm"><p className="text-gray-400">🏆 Distributed within <span className="text-yellow-400 font-bold">48 hours</span></p></div><button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎉 I just won ${result.label} ${result.sublabel} on @SuiDex Wheel of Victory! 🎡`)}`, '_blank')} className="mt-4 px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium text-sm">🐦 Share on Twitter</button></>
              )}
              <button onClick={() => setResult(null)} className="mt-4 text-text-muted hover:text-white text-sm block mx-auto">Close</button>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
          .animate-confetti { animation: confetti-fall linear forwards; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          .animate-blink { animation: blink 0.15s ease-in-out infinite; }
          @keyframes modal-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        `}</style>
      </main>
      <Footer />
    </div>
  )
}

function formatLabel(valueUSD: number): string { if (valueUSD >= 1000) return `$${(valueUSD / 1000).toFixed(valueUSD % 1000 === 0 ? 0 : 1)}K`; return `$${valueUSD}` }
function formatSublabel(type: string, lockDuration?: string): string { if (type === 'no_prize') return 'No Prize'; if (type === 'suitrump') return 'Trump'; if (type === 'liquid_victory') return 'Liquid'; if (lockDuration === '1_week') return '1W Lock'; if (lockDuration === '3_month') return '3M Lock'; if (lockDuration === '1_year') return '1Y Lock'; if (lockDuration === '3_year') return '3Y Lock'; return 'Locked' }
function formatAmount(amount: number, type: string): string { if (type === 'no_prize') return ''; if (type === 'suitrump') return `$${amount}`; if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M VICT`; if (amount >= 1000) return `${Math.round(amount / 1000)}K VICT`; return `${amount.toLocaleString()} VICT` }
function getSlotColor(type: string, valueUSD: number, index: number): string { if (type === 'no_prize') return '#546E7A'; if (type === 'suitrump') return ['#EF5350', '#F44336', '#E53935'][index % 3]; if (type === 'liquid_victory') return ['#FFD700', '#FFA500', '#FF8C00'][Math.min(Math.floor(valueUSD / 100), 2)]; return ['#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#7B1FA2', '#8E24AA', '#9C27B0'][index % 9] }
